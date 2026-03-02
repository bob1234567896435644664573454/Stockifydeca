-- Trading RPC, fill engine, snapshots, and leaderboards

create or replace function public.jsonb_num(p_json jsonb, p_key text, p_default numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  v_val text;
begin
  v_val := p_json ->> p_key;
  if v_val is null then
    return p_default;
  end if;
  return v_val::numeric;
exception
  when others then
    return p_default;
end;
$$;

create or replace function public.get_available_cash(p_account_id uuid)
returns numeric(18,6)
language sql
stable
as $$
  select
    a.cash_balance
    - coalesce((
      select sum(r.amount)
      from public.reservations r
      where r.account_id = a.id
        and r.resource_type = 'cash'
        and r.released_at is null
    ), 0)
  from public.trading_accounts a
  where a.id = p_account_id;
$$;

create or replace function public.get_available_shares(p_account_id uuid, p_symbol text)
returns numeric(18,6)
language sql
stable
as $$
  select
    coalesce(h.qty, 0)
    - coalesce((
      select sum(r.amount)
      from public.reservations r
      where r.account_id = p_account_id
        and r.symbol = upper(p_symbol)
        and r.resource_type = 'shares'
        and r.released_at is null
    ), 0)
  from public.holdings_snapshot h
  where h.account_id = p_account_id
    and h.symbol = upper(p_symbol)
  union all
  select
    0 - coalesce((
      select sum(r.amount)
      from public.reservations r
      where r.account_id = p_account_id
        and r.symbol = upper(p_symbol)
        and r.resource_type = 'shares'
        and r.released_at is null
    ), 0)
  where not exists (
    select 1 from public.holdings_snapshot h2 where h2.account_id = p_account_id and h2.symbol = upper(p_symbol)
  )
  limit 1;
$$;

create or replace function public.get_account_active_competition(p_account_id uuid)
returns table(competition_id uuid, rules_json jsonb)
language sql
stable
as $$
  select c.id, c.rules_json
  from public.competition_accounts ca
  join public.competitions c on c.id = ca.competition_id
  where ca.account_id = p_account_id
    and c.status = 'active'
  order by c.created_at desc
  limit 1;
$$;

create or replace function public.is_account_trading_enabled(p_account_id uuid)
returns boolean
language sql
stable
as $$
  with acc as (
    select a.id, a.class_id, a.is_frozen
    from public.trading_accounts a
    where a.id = p_account_id
  ),
  class_control as (
    select tc.is_trading_enabled
    from public.trading_controls tc
    join acc on tc.scope_type = 'class' and tc.scope_id = acc.class_id
  ),
  account_control as (
    select tc.is_trading_enabled
    from public.trading_controls tc
    join acc on tc.scope_type = 'account' and tc.scope_id = acc.id
  )
  select
    case
      when (select is_frozen from acc) then false
      when exists (select 1 from account_control) then (select is_trading_enabled from account_control)
      when exists (select 1 from class_control) then (select is_trading_enabled from class_control)
      else true
    end;
$$;

create or replace function public.record_rule_violation(
  p_competition_id uuid,
  p_account_id uuid,
  p_rule_key text,
  p_severity text,
  p_details jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.rule_violations (competition_id, account_id, rule_key, severity, details_json)
  values (p_competition_id, p_account_id, p_rule_key, p_severity, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.record_activity_flag(
  p_class_id uuid,
  p_account_id uuid,
  p_flag_type text,
  p_severity text,
  p_details jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_flags (class_id, account_id, flag_type, severity, details_json)
  values (p_class_id, p_account_id, p_flag_type, p_severity, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.place_order(
  p_account_id uuid,
  p_payload_json jsonb,
  p_client_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_account public.trading_accounts%rowtype;
  v_order public.orders%rowtype;
  v_existing public.orders%rowtype;
  v_symbol text := upper(trim(coalesce(p_payload_json ->> 'symbol', '')));
  v_side public.order_side := (p_payload_json ->> 'side')::public.order_side;
  v_qty numeric(18,6) := (p_payload_json ->> 'qty')::numeric;
  v_order_type public.order_type_enum := coalesce((p_payload_json ->> 'order_type')::public.order_type_enum, 'market'::public.order_type_enum);
  v_tif public.tif_enum := coalesce((p_payload_json ->> 'tif')::public.tif_enum, 'day'::public.tif_enum);
  v_limit_price numeric(18,6) := nullif((p_payload_json ->> 'limit_price')::numeric, 0);
  v_stop_price numeric(18,6) := nullif((p_payload_json ->> 'stop_price')::numeric, 0);
  v_competition_id uuid := nullif(p_payload_json ->> 'competition_id', '')::uuid;
  v_rules jsonb := '{}'::jsonb;
  v_market_price numeric(18,6);
  v_slippage_bps numeric(18,6) := 0;
  v_fee_bps numeric(18,6) := 0;
  v_reserve_amount numeric(18,6);
  v_max_order_size numeric(18,6);
  v_max_position_size_pct numeric(18,6);
  v_min_price numeric(18,6);
  v_max_spread_pct numeric(18,6);
  v_allowed_symbols text[];
  v_banned_symbols text[];
  v_allowed_asset_types text[];
  v_asset_type text;
  v_orders_last_min integer;
  v_trades_today integer;
  v_cooldown_seconds integer;
  v_last_order_at timestamptz;
  v_available_cash numeric(18,6);
  v_available_shares numeric(18,6);
  v_short_enabled boolean := false;
  v_leverage_enabled boolean := false;
  v_market_hours_mode text := 'strict';
  v_no_daytrade boolean := false;
  v_daytrade_limit integer := 0;
  v_daytrade_count integer := 0;
  v_position_qty numeric(18,6) := 0;
  v_total_equity numeric(18,6) := 0;
  v_ny_now timestamp;
begin
  if not public.is_service_role() then
    raise exception 'place_order is service-only';
  end if;

  if p_client_request_id is null or length(trim(p_client_request_id)) = 0 then
    raise exception 'client_request_id is required';
  end if;

  select * into v_existing
  from public.orders o
  where o.account_id = p_account_id
    and o.client_request_id = p_client_request_id;

  if found then
    return jsonb_build_object(
      'order_id', v_existing.id,
      'status', v_existing.status,
      'idempotent', true
    );
  end if;

  if v_symbol = '' then
    raise exception 'symbol is required';
  end if;

  if v_qty is null or v_qty <= 0 then
    raise exception 'qty must be > 0';
  end if;

  if v_order_type in ('limit', 'stop_limit') and (v_limit_price is null or v_limit_price <= 0) then
    raise exception 'limit_price required for limit/stop_limit';
  end if;

  if v_order_type in ('stop', 'stop_limit') and (v_stop_price is null or v_stop_price <= 0) then
    raise exception 'stop_price required for stop/stop_limit';
  end if;

  select * into v_account
  from public.trading_accounts a
  where a.id = p_account_id
  for update;

  if not found then
    raise exception 'account not found';
  end if;

  if v_account.status <> 'active' then
    raise exception 'account is not active';
  end if;

  if not public.is_account_trading_enabled(p_account_id) then
    raise exception 'trading disabled for account';
  end if;

  select sm.asset_type into v_asset_type
  from public.symbol_master sm
  where sm.symbol = v_symbol and sm.is_active = true;

  if v_asset_type is null then
    raise exception 'symbol % is not active', v_symbol;
  end if;

  if v_competition_id is not null then
    select c.rules_json into v_rules
    from public.competitions c
    join public.competition_accounts ca on ca.competition_id = c.id
    where c.id = v_competition_id
      and ca.account_id = p_account_id;
    if v_rules is null then
      raise exception 'competition_id is not linked to account';
    end if;
  else
    select ac.rules_json into v_rules
    from public.get_account_active_competition(p_account_id) ac;
    select ac.competition_id into v_competition_id
    from public.get_account_active_competition(p_account_id) ac;
  end if;

  if v_rules is null then
    v_rules := '{}'::jsonb;
  end if;

  v_market_hours_mode := coalesce(v_rules ->> 'market_hours_mode', 'strict');
  if v_market_hours_mode = 'strict' then
    v_ny_now := timezone('America/New_York', v_now);
    if extract(isodow from v_ny_now) in (6, 7)
       or v_ny_now::time < time '09:30'
       or v_ny_now::time > time '16:00' then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'market_hours_mode',
          'low',
          jsonb_build_object('mode', v_market_hours_mode, 'now_est', v_ny_now)
        );
      end if;
      raise exception 'order blocked outside strict market hours';
    end if;
  end if;

  v_no_daytrade := coalesce((v_rules ->> 'no_daytrade')::boolean, false);
  v_daytrade_limit := coalesce((v_rules ->> 'daytrade_limit')::int, 0);
  v_leverage_enabled := coalesce((v_rules ->> 'leverage_enabled')::boolean, false);

  if v_rules ? 'allowed_asset_types' then
    select array(select jsonb_array_elements_text(v_rules -> 'allowed_asset_types'))
      into v_allowed_asset_types;
    if v_allowed_asset_types is not null and not (v_asset_type = any(v_allowed_asset_types)) then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'allowed_asset_types',
          'high',
          jsonb_build_object('symbol', v_symbol, 'asset_type', v_asset_type)
        );
      end if;
      raise exception 'asset type % is not allowed', v_asset_type;
    end if;
  end if;

  if v_rules ? 'allowed_symbols' then
    select array(select jsonb_array_elements_text(v_rules -> 'allowed_symbols'))
      into v_allowed_symbols;
    if v_allowed_symbols is not null and not (v_symbol = any(v_allowed_symbols)) then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'allowed_symbols',
          'medium',
          jsonb_build_object('symbol', v_symbol)
        );
      end if;
      raise exception 'symbol % is not allowed', v_symbol;
    end if;
  end if;

  if v_rules ? 'banned_symbols' then
    select array(select jsonb_array_elements_text(v_rules -> 'banned_symbols')) into v_banned_symbols;
    if v_banned_symbols is not null and v_symbol = any(v_banned_symbols) then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'banned_symbols',
          'high',
          jsonb_build_object('symbol', v_symbol)
        );
      end if;
      raise exception 'symbol % is banned', v_symbol;
    end if;
  end if;

  v_max_order_size := public.jsonb_num(v_rules, 'max_order_size', 0);
  if v_max_order_size > 0 and v_qty > v_max_order_size then
    if v_competition_id is not null then
      perform public.record_rule_violation(
        v_competition_id,
        p_account_id,
        'max_order_size',
        'medium',
        jsonb_build_object('qty', v_qty, 'max_order_size', v_max_order_size)
      );
    end if;
    raise exception 'order quantity exceeds max_order_size';
  end if;

  select mp.price into v_market_price
  from public.market_prices_latest mp
  where mp.symbol = v_symbol;

  if v_market_price is null then
    raise exception 'no market price available for %', v_symbol;
  end if;

  v_min_price := public.jsonb_num(v_rules, 'min_price', 0);
  if v_min_price > 0 and v_market_price < v_min_price then
    raise exception 'price under min_price rule';
  end if;

  v_max_spread_pct := public.jsonb_num(v_rules, 'max_spread_pct', 0);
  if v_max_spread_pct > 0 then
    -- With no bid/ask depth feed, approximate spread risk using bar volatility.
    if exists (
      select 1
      from public.market_bars_cache b
      where b.symbol = v_symbol
        and b.timeframe = '1m'
        and ((b.h - b.l) / nullif(b.l, 0)) * 100 > v_max_spread_pct
      order by b.ts desc
      limit 1
    ) then
      raise exception 'symbol exceeds max_spread_pct guardrail';
    end if;
  end if;

  v_max_position_size_pct := public.jsonb_num(v_rules, 'max_position_size_pct', 0);
  if v_max_position_size_pct > 0 and v_side = 'buy' then
    select coalesce(h.qty, 0)
      into v_position_qty
    from public.holdings_snapshot h
    where h.account_id = p_account_id
      and h.symbol = v_symbol;

    if v_position_qty is null then
      v_position_qty := 0;
    end if;

    select
      v_account.cash_balance + coalesce(sum(h.qty * mp.price), 0)
      into v_total_equity
    from public.holdings_snapshot h
    left join public.market_prices_latest mp on mp.symbol = h.symbol
    where h.account_id = p_account_id;

    if v_total_equity > 0
       and (((v_position_qty + v_qty) * v_market_price) / v_total_equity) * 100 > v_max_position_size_pct then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'max_position_size_pct',
          'medium',
          jsonb_build_object(
            'projected_position_value', (v_position_qty + v_qty) * v_market_price,
            'equity', v_total_equity,
            'max_position_size_pct', v_max_position_size_pct
          )
        );
      end if;
      raise exception 'max_position_size_pct exceeded';
    end if;
  end if;

  select count(*) into v_orders_last_min
  from public.orders o
  where o.account_id = p_account_id
    and o.placed_at >= v_now - interval '1 minute';

  if v_rules ? 'max_orders_per_minute' and v_orders_last_min >= (v_rules ->> 'max_orders_per_minute')::int then
    if v_competition_id is not null then
      perform public.record_rule_violation(
        v_competition_id,
        p_account_id,
        'max_orders_per_minute',
        'medium',
        jsonb_build_object('count', v_orders_last_min)
      );
    end if;
    perform public.record_activity_flag(v_account.class_id, p_account_id, 'excessive_order_spam', 'medium', jsonb_build_object('count', v_orders_last_min));
    raise exception 'max_orders_per_minute exceeded';
  end if;

  select count(*) into v_trades_today
  from public.fills f
  where f.account_id = p_account_id
    and f.filled_at::date = v_now::date;

  if v_rules ? 'max_trades_per_day' and v_trades_today >= (v_rules ->> 'max_trades_per_day')::int then
    if v_competition_id is not null then
      perform public.record_rule_violation(
        v_competition_id,
        p_account_id,
        'max_trades_per_day',
        'medium',
        jsonb_build_object('count', v_trades_today)
      );
    end if;
    raise exception 'max_trades_per_day exceeded';
  end if;

  if v_side = 'sell' then
    if v_no_daytrade and exists (
      select 1
      from public.fills fb
      join public.orders ob on ob.id = fb.order_id
      where fb.account_id = p_account_id
        and fb.symbol = v_symbol
        and ob.side = 'buy'
        and fb.filled_at::date = v_now::date
    ) then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'no_daytrade',
          'medium',
          jsonb_build_object('symbol', v_symbol)
        );
      end if;
      raise exception 'no_daytrade rule violated';
    end if;

    if v_daytrade_limit > 0 then
      select count(*) into v_daytrade_count
      from public.orders s
      where s.account_id = p_account_id
        and s.side = 'sell'
        and s.placed_at::date = v_now::date
        and exists (
          select 1
          from public.fills fb
          join public.orders ob on ob.id = fb.order_id
          where fb.account_id = s.account_id
            and fb.symbol = s.symbol
            and ob.side = 'buy'
            and fb.filled_at::date = s.placed_at::date
        );

      if v_daytrade_count >= v_daytrade_limit then
        if v_competition_id is not null then
          perform public.record_rule_violation(
            v_competition_id,
            p_account_id,
            'daytrade_limit',
            'medium',
            jsonb_build_object('daytrade_count', v_daytrade_count, 'daytrade_limit', v_daytrade_limit)
          );
        end if;
        raise exception 'daytrade_limit exceeded';
      end if;
    end if;
  end if;

  v_cooldown_seconds := coalesce((v_rules ->> 'trade_cooldown_seconds')::int, 0);
  if v_cooldown_seconds > 0 then
    select max(o.placed_at) into v_last_order_at
    from public.orders o
    where o.account_id = p_account_id;

    if v_last_order_at is not null and v_last_order_at > v_now - make_interval(secs => v_cooldown_seconds) then
      if v_competition_id is not null then
        perform public.record_rule_violation(
          v_competition_id,
          p_account_id,
          'trade_cooldown_seconds',
          'low',
          jsonb_build_object('cooldown_seconds', v_cooldown_seconds)
        );
      end if;
      raise exception 'trade cooldown active';
    end if;
  end if;

  v_slippage_bps := coalesce((v_rules -> 'slippage_model' ->> 'bps')::numeric, 0);
  v_fee_bps := coalesce((v_rules -> 'fee_model' ->> 'bps')::numeric, 0);

  if v_side = 'buy' then
    v_reserve_amount := v_qty * coalesce(case when v_order_type in ('limit', 'stop_limit') then v_limit_price else v_market_price end, v_market_price);
    v_reserve_amount := v_reserve_amount * (1 + ((v_slippage_bps + v_fee_bps) / 10000));

    v_available_cash := public.get_available_cash(p_account_id);
    if (not v_leverage_enabled) and v_available_cash < v_reserve_amount then
      raise exception 'insufficient available cash: need %, have %', v_reserve_amount, v_available_cash;
    end if;
  else
    v_short_enabled := coalesce((v_rules ->> 'short_selling_enabled')::boolean, false);
    v_available_shares := public.get_available_shares(p_account_id, v_symbol);
    if (not v_short_enabled) and v_available_shares < v_qty then
      raise exception 'insufficient shares available';
    end if;
  end if;

  insert into public.orders (
    account_id,
    symbol,
    side,
    qty,
    order_type,
    limit_price,
    stop_price,
    tif,
    status,
    client_request_id,
    placed_at,
    expires_at
  )
  values (
    p_account_id,
    v_symbol,
    v_side,
    v_qty,
    v_order_type,
    v_limit_price,
    v_stop_price,
    v_tif,
    'open',
    p_client_request_id,
    v_now,
    case when v_tif = 'day' then date_trunc('day', v_now) + interval '1 day' else null end
  )
  returning * into v_order;

  if v_side = 'buy' then
    insert into public.reservations (account_id, resource_type, amount, ref_order_id)
    values (p_account_id, 'cash', v_reserve_amount, v_order.id);
  else
    insert into public.reservations (account_id, resource_type, symbol, amount, ref_order_id)
    values (p_account_id, 'shares', v_symbol, v_qty, v_order.id);
  end if;

  perform public.emit_event(
    v_account.org_id,
    v_account.class_id,
    'order.created',
    'orders',
    v_order.id,
    jsonb_build_object(
      'order_id', v_order.id,
      'account_id', p_account_id,
      'symbol', v_symbol,
      'side', v_side,
      'qty', v_qty,
      'status', v_order.status
    )
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'status', v_order.status,
    'idempotent', false
  );
exception
  when unique_violation then
    select * into v_existing
    from public.orders o
    where o.account_id = p_account_id
      and o.client_request_id = p_client_request_id;

    return jsonb_build_object(
      'order_id', v_existing.id,
      'status', v_existing.status,
      'idempotent', true
    );
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_account public.trading_accounts%rowtype;
  v_cancel_count integer := 0;
begin
  if not public.is_service_role() then
    raise exception 'cancel_order is service-only';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select * into v_account
  from public.trading_accounts a
  where a.id = v_order.account_id;

  if v_order.status in ('filled', 'canceled', 'rejected', 'expired') then
    return jsonb_build_object('order_id', p_order_id, 'status', v_order.status, 'changed', false);
  end if;

  update public.orders
  set status = 'canceled',
      updated_at = timezone('utc', now())
  where id = p_order_id;

  update public.reservations
  set released_at = timezone('utc', now())
  where ref_order_id = p_order_id
    and released_at is null;

  select count(*) into v_cancel_count
  from public.orders o
  where o.account_id = v_order.account_id
    and o.status = 'canceled'
    and o.updated_at >= timezone('utc', now()) - interval '10 minutes';

  if v_cancel_count >= 20 then
    perform public.record_activity_flag(
      v_account.class_id,
      v_order.account_id,
      'repeated_cancel_probe',
      'medium',
      jsonb_build_object('cancel_count_10m', v_cancel_count)
    );
  end if;

  perform public.emit_event(
    v_account.org_id,
    v_account.class_id,
    'order.canceled',
    'orders',
    p_order_id,
    jsonb_build_object('order_id', p_order_id)
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'canceled', 'changed', true);
end;
$$;

create or replace function public.append_cash_ledger(
  p_account_id uuid,
  p_amount numeric,
  p_entry_type text,
  p_ref_table text,
  p_ref_id uuid,
  p_memo text default null
)
returns numeric(18,6)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric(18,6);
begin
  update public.trading_accounts a
  set cash_balance = a.cash_balance + p_amount
  where a.id = p_account_id
  returning a.cash_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'account not found';
  end if;

  insert into public.cash_ledger (
    account_id,
    ts,
    entry_type,
    amount,
    currency,
    ref_table,
    ref_id,
    memo,
    balance_after
  )
  values (
    p_account_id,
    timezone('utc', now()),
    p_entry_type,
    p_amount,
    'USD',
    p_ref_table,
    p_ref_id,
    p_memo,
    v_new_balance
  );

  return v_new_balance;
end;
$$;

create or replace function public.broker_apply_fill(
  p_order_id uuid,
  p_fill_qty numeric,
  p_fill_price numeric,
  p_fee_bps numeric,
  p_slippage_bps numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_order public.orders%rowtype;
  v_account public.trading_accounts%rowtype;
  v_remaining numeric(18,6);
  v_effective_qty numeric(18,6);
  v_principal numeric(18,6);
  v_fee numeric(18,6);
  v_total_cost numeric(18,6);
  v_fill_id uuid;
  v_snapshot public.holdings_snapshot%rowtype;
  v_new_qty numeric(18,6);
  v_realized numeric(18,6) := 0;
  v_to_sell numeric(18,6);
  v_lot public.holding_lots%rowtype;
  v_consume numeric(18,6);
  v_reservation public.reservations%rowtype;
begin
  if not public.is_service_role() then
    raise exception 'broker_apply_fill is service-only';
  end if;

  if p_fill_qty <= 0 or p_fill_price <= 0 then
    raise exception 'fill qty and price must be positive';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('open', 'pending', 'partially_filled') then
    return jsonb_build_object('order_id', p_order_id, 'status', v_order.status, 'applied', false);
  end if;

  select * into v_account
  from public.trading_accounts
  where id = v_order.account_id
  for update;

  v_remaining := v_order.qty - v_order.filled_qty;
  if v_remaining <= 0 then
    update public.orders
    set status = 'filled', updated_at = v_now
    where id = v_order.id;
    return jsonb_build_object('order_id', p_order_id, 'status', 'filled', 'applied', false);
  end if;

  v_effective_qty := least(v_remaining, p_fill_qty);
  v_principal := v_effective_qty * p_fill_price;
  v_fee := round(v_principal * coalesce(p_fee_bps, 0) / 10000, 6);

  insert into public.fills (order_id, account_id, symbol, qty, price, fees, slippage, filled_at)
  values (v_order.id, v_order.account_id, v_order.symbol, v_effective_qty, p_fill_price, v_fee, coalesce(p_slippage_bps, 0), v_now)
  returning id into v_fill_id;

  if v_order.side = 'buy' then
    v_total_cost := v_principal + v_fee;

    if v_account.cash_balance < v_total_cost then
      update public.orders
      set status = 'rejected', rejection_reason = 'insufficient cash at fill', updated_at = v_now
      where id = v_order.id;

      update public.reservations
      set released_at = v_now
      where ref_order_id = v_order.id and released_at is null;

      return jsonb_build_object('order_id', p_order_id, 'status', 'rejected', 'applied', false);
    end if;

    perform public.append_cash_ledger(v_order.account_id, -v_principal, 'fill_buy_principal', 'fills', v_fill_id, 'buy principal');
    if v_fee > 0 then
      perform public.append_cash_ledger(v_order.account_id, -v_fee, 'fill_fee', 'fills', v_fill_id, 'buy fee');
    end if;

    select * into v_snapshot
    from public.holdings_snapshot
    where account_id = v_order.account_id
      and symbol = v_order.symbol
    for update;

    if not found then
      insert into public.holdings_snapshot (account_id, symbol, qty, avg_cost, realized_pnl, updated_at)
      values (
        v_order.account_id,
        v_order.symbol,
        v_effective_qty,
        round((v_principal + v_fee) / v_effective_qty, 6),
        0,
        v_now
      );
    else
      v_new_qty := v_snapshot.qty + v_effective_qty;
      update public.holdings_snapshot
      set qty = v_new_qty,
          avg_cost = case
            when v_new_qty = 0 then 0
            else round(((v_snapshot.qty * v_snapshot.avg_cost) + (v_principal + v_fee)) / v_new_qty, 6)
          end,
          updated_at = v_now
      where account_id = v_order.account_id
        and symbol = v_order.symbol;
    end if;

    insert into public.holding_lots (account_id, symbol, qty, cost_basis, acquired_at, fill_id)
    values (
      v_order.account_id,
      v_order.symbol,
      v_effective_qty,
      round((v_principal + v_fee) / v_effective_qty, 6),
      v_now,
      v_fill_id
    );

    select * into v_reservation
    from public.reservations
    where ref_order_id = v_order.id
      and resource_type = 'cash'
      and released_at is null
    for update;

    if found then
      if v_reservation.amount <= v_total_cost then
        update public.reservations
        set amount = 0,
            released_at = v_now
        where id = v_reservation.id;
      else
        update public.reservations
        set amount = amount - v_total_cost
        where id = v_reservation.id;
      end if;
    end if;
  else
    select * into v_snapshot
    from public.holdings_snapshot
    where account_id = v_order.account_id
      and symbol = v_order.symbol
    for update;

    if not found or v_snapshot.qty < v_effective_qty then
      update public.orders
      set status = 'rejected', rejection_reason = 'insufficient shares at fill', updated_at = v_now
      where id = v_order.id;

      update public.reservations
      set released_at = v_now
      where ref_order_id = v_order.id and released_at is null;

      return jsonb_build_object('order_id', p_order_id, 'status', 'rejected', 'applied', false);
    end if;

    v_to_sell := v_effective_qty;

    for v_lot in
      select *
      from public.holding_lots
      where account_id = v_order.account_id
        and symbol = v_order.symbol
        and qty > 0
      order by acquired_at, id
      for update
    loop
      exit when v_to_sell <= 0;
      v_consume := least(v_lot.qty, v_to_sell);
      v_realized := v_realized + ((p_fill_price - v_lot.cost_basis) * v_consume);

      update public.holding_lots
      set qty = qty - v_consume
      where id = v_lot.id;

      v_to_sell := v_to_sell - v_consume;
    end loop;

    if v_to_sell > 0 then
      raise exception 'fifo lot exhaustion for sell';
    end if;

    update public.holdings_snapshot
    set qty = qty - v_effective_qty,
        avg_cost = case when qty - v_effective_qty <= 0 then 0 else avg_cost end,
        realized_pnl = realized_pnl + v_realized - v_fee,
        updated_at = v_now
    where account_id = v_order.account_id
      and symbol = v_order.symbol;

    perform public.append_cash_ledger(v_order.account_id, v_principal, 'fill_sell_principal', 'fills', v_fill_id, 'sell principal');
    if v_fee > 0 then
      perform public.append_cash_ledger(v_order.account_id, -v_fee, 'fill_fee', 'fills', v_fill_id, 'sell fee');
    end if;

    select * into v_reservation
    from public.reservations
    where ref_order_id = v_order.id
      and resource_type = 'shares'
      and released_at is null
    for update;

    if found then
      if v_reservation.amount <= v_effective_qty then
        update public.reservations
        set amount = 0,
            released_at = v_now
        where id = v_reservation.id;
      else
        update public.reservations
        set amount = amount - v_effective_qty
        where id = v_reservation.id;
      end if;
    end if;
  end if;

  update public.orders
  set filled_qty = filled_qty + v_effective_qty,
      status = case
        when filled_qty + v_effective_qty >= qty then 'filled'::public.order_status_enum
        else 'partially_filled'::public.order_status_enum
      end,
      updated_at = v_now
  where id = v_order.id;

  if exists (
    select 1 from public.orders o where o.id = v_order.id and o.status = 'filled'
  ) then
    update public.reservations
    set released_at = v_now,
        amount = 0
    where ref_order_id = v_order.id
      and released_at is null;
  end if;

  perform public.emit_event(
    v_account.org_id,
    v_account.class_id,
    'fill.created',
    'fills',
    v_fill_id,
    jsonb_build_object(
      'fill_id', v_fill_id,
      'order_id', v_order.id,
      'account_id', v_order.account_id,
      'symbol', v_order.symbol,
      'qty', v_effective_qty,
      'price', p_fill_price,
      'fee', v_fee
    )
  );

  perform public.emit_event(
    v_account.org_id,
    v_account.class_id,
    'order.updated',
    'orders',
    v_order.id,
    jsonb_build_object(
      'order_id', v_order.id,
      'status', (select o.status from public.orders o where o.id = v_order.id),
      'filled_qty', (select o.filled_qty from public.orders o where o.id = v_order.id)
    )
  );

  return jsonb_build_object('order_id', v_order.id, 'fill_id', v_fill_id, 'applied', true);
end;
$$;

create or replace function public.broker_engine_tick(p_max_orders integer default 200)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_order public.orders%rowtype;
  v_account public.trading_accounts%rowtype;
  v_market_price numeric(18,6);
  v_bar_volume numeric(18,6);
  v_remaining numeric(18,6);
  v_fill_qty numeric(18,6);
  v_executable boolean;
  v_triggered boolean;
  v_fill_price numeric(18,6);
  v_slip_bps numeric(18,6);
  v_fee_bps numeric(18,6);
  v_rules jsonb;
  v_processed integer := 0;
  v_applied jsonb;
begin
  if not public.is_service_role() then
    raise exception 'broker_engine_tick is service-only';
  end if;

  for v_order in
    select o.*
    from public.orders o
    where o.status in ('pending', 'open', 'partially_filled')
    order by o.placed_at
    limit p_max_orders
    for update skip locked
  loop
    select * into v_account
    from public.trading_accounts a
    where a.id = v_order.account_id;

    if v_order.tif = 'day' and v_order.placed_at::date < v_now::date then
      update public.orders set status = 'expired', updated_at = v_now where id = v_order.id;
      update public.reservations set released_at = v_now, amount = 0 where ref_order_id = v_order.id and released_at is null;
      perform public.emit_event(v_account.org_id, v_account.class_id, 'order.expired', 'orders', v_order.id, jsonb_build_object('order_id', v_order.id));
      continue;
    end if;

    if not public.is_account_trading_enabled(v_order.account_id) then
      update public.orders set status = 'rejected', rejection_reason = 'trading disabled', updated_at = v_now where id = v_order.id;
      update public.reservations set released_at = v_now, amount = 0 where ref_order_id = v_order.id and released_at is null;
      continue;
    end if;

    select mp.price into v_market_price
    from public.market_prices_latest mp
    where mp.symbol = v_order.symbol;

    if v_market_price is null then
      continue;
    end if;

    select b.v into v_bar_volume
    from public.market_bars_cache b
    where b.symbol = v_order.symbol
      and b.timeframe = '1m'
    order by b.ts desc
    limit 1;

    select ac.rules_json into v_rules
    from public.get_account_active_competition(v_order.account_id) ac;

    if v_rules is null then
      v_rules := '{}'::jsonb;
    end if;

    v_slip_bps := coalesce((v_rules -> 'slippage_model' ->> 'bps')::numeric, 0);
    v_fee_bps := coalesce((v_rules -> 'fee_model' ->> 'bps')::numeric, 0);

    v_remaining := v_order.qty - v_order.filled_qty;
    if v_remaining <= 0 then
      update public.orders set status = 'filled', updated_at = v_now where id = v_order.id;
      continue;
    end if;

    v_fill_qty := least(v_remaining, greatest(1::numeric, coalesce(v_bar_volume / 10000, v_remaining)));
    v_executable := false;
    v_triggered := false;
    v_fill_price := v_market_price;

    if v_order.order_type = 'market' then
      v_executable := true;
    elsif v_order.order_type = 'limit' then
      if (v_order.side = 'buy' and v_market_price <= v_order.limit_price)
         or (v_order.side = 'sell' and v_market_price >= v_order.limit_price) then
        v_executable := true;
      end if;
    elsif v_order.order_type = 'stop' then
      if (v_order.side = 'buy' and v_market_price >= v_order.stop_price)
         or (v_order.side = 'sell' and v_market_price <= v_order.stop_price) then
        v_triggered := true;
        v_executable := true;
      end if;
    elsif v_order.order_type = 'stop_limit' then
      if (v_order.side = 'buy' and v_market_price >= v_order.stop_price)
         or (v_order.side = 'sell' and v_market_price <= v_order.stop_price) then
        v_triggered := true;
        if (v_order.side = 'buy' and v_market_price <= v_order.limit_price)
           or (v_order.side = 'sell' and v_market_price >= v_order.limit_price) then
          v_executable := true;
        end if;
      end if;
    end if;

    if not v_executable then
      if v_order.tif in ('ioc', 'fok') then
        update public.orders set status = 'canceled', updated_at = v_now where id = v_order.id;
        update public.reservations set released_at = v_now, amount = 0 where ref_order_id = v_order.id and released_at is null;
      end if;
      continue;
    end if;

    if v_order.side = 'buy' then
      v_fill_price := v_market_price * (1 + v_slip_bps / 10000);
      if v_order.order_type in ('limit', 'stop_limit') then
        v_fill_price := least(v_fill_price, v_order.limit_price);
      end if;
    else
      v_fill_price := v_market_price * (1 - v_slip_bps / 10000);
      if v_order.order_type in ('limit', 'stop_limit') then
        v_fill_price := greatest(v_fill_price, v_order.limit_price);
      end if;
    end if;

    if v_order.tif = 'fok' and v_fill_qty < v_remaining then
      update public.orders set status = 'canceled', updated_at = v_now where id = v_order.id;
      update public.reservations set released_at = v_now, amount = 0 where ref_order_id = v_order.id and released_at is null;
      continue;
    end if;

    v_applied := public.broker_apply_fill(v_order.id, v_fill_qty, round(v_fill_price, 6), v_fee_bps, v_slip_bps);

    if coalesce((v_applied ->> 'applied')::boolean, false) then
      v_processed := v_processed + 1;
    end if;

    if v_order.tif = 'ioc' then
      perform public.cancel_order(v_order.id);
    end if;

    if v_triggered and v_order.order_type in ('stop', 'stop_limit') then
      update public.orders
      set order_type = case when v_order.order_type = 'stop' then 'market'::public.order_type_enum else 'limit'::public.order_type_enum end,
          stop_price = null,
          updated_at = v_now
      where id = v_order.id
        and status in ('open', 'partially_filled');
    end if;
  end loop;

  return v_processed;
end;
$$;

create or replace function public.compute_account_equity(
  p_account_id uuid,
  p_as_of_ts timestamptz default timezone('utc', now())
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with cash as (
    select a.starting_cash + coalesce(sum(cl.amount), 0) as cash_value
    from public.trading_accounts a
    left join public.cash_ledger cl
      on cl.account_id = a.id
     and cl.ts <= p_as_of_ts
    where a.id = p_account_id
    group by a.starting_cash
  ),
  position_qty as (
    select
      f.symbol,
      sum(case when o.side = 'buy' then f.qty else -f.qty end) as qty
    from public.fills f
    join public.orders o on o.id = f.order_id
    where f.account_id = p_account_id
      and f.filled_at <= p_as_of_ts
    group by f.symbol
  ),
  mark as (
    select
      pq.symbol,
      pq.qty,
      pq.qty * coalesce(mp.price, 0) as position_value
    from position_qty pq
    left join public.market_prices_latest mp on mp.symbol = pq.symbol
  )
  select jsonb_build_object(
    'account_id', p_account_id,
    'as_of_ts', p_as_of_ts,
    'cash', coalesce((select cash_value from cash), 0),
    'positions_value', coalesce((select sum(position_value) from mark), 0),
    'equity', coalesce((select cash_value from cash), 0) + coalesce((select sum(position_value) from mark), 0)
  );
$$;

create or replace function public.recompute_holdings_from_fills(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fill record;
  v_snapshot public.holdings_snapshot%rowtype;
  v_to_sell numeric(18,6);
  v_lot public.holding_lots%rowtype;
  v_consume numeric(18,6);
  v_realized numeric(18,6);
begin
  if not public.is_service_role() then
    raise exception 'recompute_holdings_from_fills is service-only';
  end if;

  delete from public.holding_lots where account_id = p_account_id;
  delete from public.holdings_snapshot where account_id = p_account_id;

  for v_fill in
    select f.*, o.side
    from public.fills f
    join public.orders o on o.id = f.order_id
    where f.account_id = p_account_id
    order by f.filled_at, f.id
  loop
    if v_fill.side = 'buy' then
      select * into v_snapshot
      from public.holdings_snapshot
      where account_id = p_account_id and symbol = v_fill.symbol;

      if not found then
        insert into public.holdings_snapshot (account_id, symbol, qty, avg_cost, realized_pnl, updated_at)
        values (
          p_account_id,
          v_fill.symbol,
          v_fill.qty,
          round((v_fill.price * v_fill.qty + v_fill.fees) / v_fill.qty, 6),
          0,
          timezone('utc', now())
        );
      else
        update public.holdings_snapshot
        set qty = qty + v_fill.qty,
            avg_cost = round(
              ((v_snapshot.qty * v_snapshot.avg_cost) + (v_fill.price * v_fill.qty + v_fill.fees))
              / nullif(v_snapshot.qty + v_fill.qty, 0),
              6
            ),
            updated_at = timezone('utc', now())
        where account_id = p_account_id and symbol = v_fill.symbol;
      end if;

      insert into public.holding_lots (account_id, symbol, qty, cost_basis, acquired_at, fill_id)
      values (
        p_account_id,
        v_fill.symbol,
        v_fill.qty,
        round((v_fill.price * v_fill.qty + v_fill.fees) / v_fill.qty, 6),
        v_fill.filled_at,
        v_fill.id
      );
    else
      select * into v_snapshot
      from public.holdings_snapshot
      where account_id = p_account_id and symbol = v_fill.symbol
      for update;

      if not found or v_snapshot.qty < v_fill.qty then
        raise exception 'cannot recompute sell fill %: insufficient holdings', v_fill.id;
      end if;

      v_to_sell := v_fill.qty;
      v_realized := 0;

      for v_lot in
        select *
        from public.holding_lots
        where account_id = p_account_id
          and symbol = v_fill.symbol
          and qty > 0
        order by acquired_at, id
        for update
      loop
        exit when v_to_sell <= 0;
        v_consume := least(v_lot.qty, v_to_sell);
        v_realized := v_realized + ((v_fill.price - v_lot.cost_basis) * v_consume);
        update public.holding_lots set qty = qty - v_consume where id = v_lot.id;
        v_to_sell := v_to_sell - v_consume;
      end loop;

      if v_to_sell > 0 then
        raise exception 'cannot recompute sell fill %: lot exhaustion', v_fill.id;
      end if;

      update public.holdings_snapshot
      set qty = qty - v_fill.qty,
          avg_cost = case when qty - v_fill.qty <= 0 then 0 else avg_cost end,
          realized_pnl = realized_pnl + v_realized - v_fill.fees,
          updated_at = timezone('utc', now())
      where account_id = p_account_id and symbol = v_fill.symbol;
    end if;
  end loop;

  return jsonb_build_object(
    'account_id', p_account_id,
    'status', 'ok',
    'symbols', (
      select coalesce(jsonb_agg(jsonb_build_object('symbol', h.symbol, 'qty', h.qty, 'avg_cost', h.avg_cost, 'realized_pnl', h.realized_pnl)), '[]'::jsonb)
      from public.holdings_snapshot h
      where h.account_id = p_account_id
    )
  );
end;
$$;

create or replace function public.snapshot_competition_daily(
  p_competition_id uuid,
  p_date date default (timezone('utc', now()))::date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_acc record;
  v_eq jsonb;
  v_equity numeric(18,6);
  v_cash numeric(18,6);
  v_prev_equity numeric(18,6);
  v_starting_cash numeric(18,6);
  v_pnl_day numeric(18,6);
  v_pnl_total numeric(18,6);
  v_return_pct numeric(18,6);
  v_peak numeric(18,6);
  v_drawdown_pct numeric(18,6);
  v_avg_ret numeric(18,6);
  v_std_ret numeric(18,6);
  v_sharpe numeric(18,6);
  v_win_rate numeric(18,6);
  v_max_drawdown numeric(18,6);
begin
  if not public.is_service_role() then
    raise exception 'snapshot_competition_daily is service-only';
  end if;

  for v_acc in
    select ca.account_id
    from public.competition_accounts ca
    where ca.competition_id = p_competition_id
  loop
    v_eq := public.compute_account_equity(v_acc.account_id, (p_date + interval '1 day' - interval '1 second')::timestamptz);
    v_equity := coalesce((v_eq ->> 'equity')::numeric, 0);
    v_cash := coalesce((v_eq ->> 'cash')::numeric, 0);

    select ps.equity into v_prev_equity
    from public.performance_snapshots_daily ps
    where ps.competition_id = p_competition_id
      and ps.account_id = v_acc.account_id
      and ps.date < p_date
    order by ps.date desc
    limit 1;

    select a.starting_cash into v_starting_cash
    from public.trading_accounts a
    where a.id = v_acc.account_id;

    v_pnl_day := v_equity - coalesce(v_prev_equity, v_starting_cash);
    v_pnl_total := v_equity - v_starting_cash;
    v_return_pct := case when v_starting_cash = 0 then 0 else (v_pnl_total / v_starting_cash) * 100 end;

    select greatest(coalesce(max(ps.equity), v_equity), v_equity) into v_peak
    from public.performance_snapshots_daily ps
    where ps.competition_id = p_competition_id
      and ps.account_id = v_acc.account_id
      and ps.date <= p_date;

    v_drawdown_pct := case when v_peak = 0 then 0 else ((v_peak - v_equity) / v_peak) * 100 end;

    insert into public.performance_snapshots_daily (
      competition_id,
      account_id,
      date,
      equity,
      cash,
      pnl_day,
      pnl_total,
      return_pct,
      drawdown_pct
    )
    values (
      p_competition_id,
      v_acc.account_id,
      p_date,
      v_equity,
      v_cash,
      v_pnl_day,
      v_pnl_total,
      v_return_pct,
      v_drawdown_pct
    )
    on conflict (competition_id, account_id, date)
    do update set
      equity = excluded.equity,
      cash = excluded.cash,
      pnl_day = excluded.pnl_day,
      pnl_total = excluded.pnl_total,
      return_pct = excluded.return_pct,
      drawdown_pct = excluded.drawdown_pct;

    select
      coalesce(avg(day_ret), 0),
      coalesce(stddev_samp(day_ret), 0)
    into v_avg_ret, v_std_ret
    from (
      select (ps.pnl_day / nullif(ps.equity - ps.pnl_day, 0)) as day_ret
      from public.performance_snapshots_daily ps
      where ps.competition_id = p_competition_id
        and ps.account_id = v_acc.account_id
        and ps.date <= p_date
      order by ps.date desc
      limit 60
    ) r;

    v_sharpe := case when v_std_ret = 0 then 0 else (v_avg_ret / v_std_ret) * sqrt(252) end;

    select coalesce(avg(case when ps.pnl_day > 0 then 1 else 0 end), 0)
    into v_win_rate
    from public.performance_snapshots_daily ps
    where ps.competition_id = p_competition_id
      and ps.account_id = v_acc.account_id
      and ps.date <= p_date;

    select coalesce(max(ps.drawdown_pct), 0)
    into v_max_drawdown
    from public.performance_snapshots_daily ps
    where ps.competition_id = p_competition_id
      and ps.account_id = v_acc.account_id
      and ps.date <= p_date;

    insert into public.risk_metrics (
      competition_id,
      account_id,
      date,
      volatility,
      sharpe_proxy,
      max_drawdown,
      win_rate,
      avg_hold_time
    )
    values (
      p_competition_id,
      v_acc.account_id,
      p_date,
      coalesce(v_std_ret, 0),
      coalesce(v_sharpe, 0),
      v_max_drawdown,
      v_win_rate,
      0
    )
    on conflict (competition_id, account_id, date)
    do update set
      volatility = excluded.volatility,
      sharpe_proxy = excluded.sharpe_proxy,
      max_drawdown = excluded.max_drawdown,
      win_rate = excluded.win_rate,
      avg_hold_time = excluded.avg_hold_time;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.compute_competition_scores(
  p_competition_id uuid,
  p_date date,
  p_mode text default 'risk_adjusted'
)
returns table(
  account_id uuid,
  equity numeric(18,6),
  return_pct numeric(18,6),
  score numeric(18,6),
  risk_adjusted_score numeric(18,6)
)
language sql
stable
set search_path = public
as $$
  with base as (
    select
      ps.account_id,
      ps.equity,
      ps.return_pct,
      coalesce(rm.volatility, 0) as volatility,
      coalesce(ps.drawdown_pct, 0) as drawdown_pct,
      (
        coalesce(ps.return_pct, 0)
        - 0.5 * coalesce(ps.drawdown_pct, 0)
        - 0.5 * coalesce(rm.volatility, 0)
      )::numeric(18,6) as risk_score,
      coalesce((
        select count(*)::numeric
        from public.rule_violations rv
        where rv.competition_id = ps.competition_id
          and rv.account_id = ps.account_id
          and rv.created_at::date <= p_date
      ), 0) as violation_count,
      coalesce((
        select count(*)::numeric
        from public.activity_flags af
        join public.trading_accounts ta on ta.id = af.account_id
        join public.competitions c on c.class_id = af.class_id
        where c.id = ps.competition_id
          and af.account_id = ps.account_id
          and af.created_at::date <= p_date
      ), 0) as spam_count
    from public.performance_snapshots_daily ps
    left join public.risk_metrics rm
      on rm.competition_id = ps.competition_id
     and rm.account_id = ps.account_id
     and rm.date = ps.date
    where ps.competition_id = p_competition_id
      and ps.date = p_date
  )
  select
    b.account_id,
    b.equity,
    b.return_pct,
    case
      when p_mode = 'total_return' then b.return_pct
      when p_mode = 'rules_compliance_weighted' then (b.risk_score - (2 * b.violation_count) - (0.5 * b.spam_count))::numeric(18,6)
      else b.risk_score
    end as score,
    b.risk_score as risk_adjusted_score
  from base b;
$$;

create or replace function public.refresh_leaderboard(
  p_competition_id uuid,
  p_date date default (timezone('utc', now()))::date,
  p_mode text default 'risk_adjusted'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if not public.is_service_role() then
    raise exception 'refresh_leaderboard is service-only';
  end if;

  delete from public.leaderboard_cache
  where competition_id = p_competition_id
    and date = p_date;

  insert into public.leaderboard_cache (
    competition_id,
    date,
    rank,
    account_id,
    score,
    equity,
    return_pct,
    risk_adjusted_score
  )
  select
    p_competition_id,
    p_date,
    rank() over (order by s.score desc, s.account_id),
    s.account_id,
    s.score,
    s.equity,
    s.return_pct,
    s.risk_adjusted_score
  from public.compute_competition_scores(p_competition_id, p_date, p_mode) s;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function public.enqueue_job(
  p_job_type text,
  p_payload jsonb,
  p_next_run_at timestamptz default timezone('utc', now())
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.job_queue (job_type, payload_json, next_run_at)
  values (p_job_type, coalesce(p_payload, '{}'::jsonb), p_next_run_at)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.process_due_jobs(p_max_jobs integer default 50)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue%rowtype;
  v_count integer := 0;
  v_comp_id uuid;
  v_job_date date;
begin
  if not public.is_service_role() then
    raise exception 'process_due_jobs is service-only';
  end if;

  for v_job in
    select *
    from public.job_queue
    where status in ('queued', 'retry')
      and next_run_at <= timezone('utc', now())
    order by next_run_at
    limit p_max_jobs
    for update skip locked
  loop
    begin
      update public.job_queue
      set status = 'running',
          attempts = attempts + 1,
          updated_at = timezone('utc', now())
      where id = v_job.id;

      if v_job.job_type = 'nightly_snapshot' then
        v_comp_id := (v_job.payload_json ->> 'competition_id')::uuid;
        v_job_date := coalesce((v_job.payload_json ->> 'date')::date, (timezone('utc', now()))::date);
        perform public.snapshot_competition_daily(v_comp_id, v_job_date);
      elsif v_job.job_type = 'leaderboard_refresh' then
        v_comp_id := (v_job.payload_json ->> 'competition_id')::uuid;
        v_job_date := coalesce((v_job.payload_json ->> 'date')::date, (timezone('utc', now()))::date);
        perform public.refresh_leaderboard(v_comp_id, v_job_date, coalesce(v_job.payload_json ->> 'mode', 'risk_adjusted'));
      end if;

      update public.job_queue
      set status = 'done',
          updated_at = timezone('utc', now())
      where id = v_job.id;

      v_count := v_count + 1;
    exception
      when others then
        update public.job_queue
        set status = case when attempts >= 5 then 'failed' else 'retry' end,
            last_error = sqlerrm,
            next_run_at = timezone('utc', now()) + (interval '30 seconds' * greatest(1, attempts)),
            updated_at = timezone('utc', now())
        where id = v_job.id;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
revoke all on function public.broker_apply_fill(uuid, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.broker_engine_tick(integer) from public, anon, authenticated;
revoke all on function public.recompute_holdings_from_fills(uuid) from public, anon, authenticated;
revoke all on function public.snapshot_competition_daily(uuid, date) from public, anon, authenticated;
revoke all on function public.refresh_leaderboard(uuid, date, text) from public, anon, authenticated;
revoke all on function public.enqueue_job(text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.process_due_jobs(integer) from public, anon, authenticated;

revoke all on function public.record_rule_violation(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_activity_flag(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.append_cash_ledger(uuid, numeric, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(uuid, text, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.log_function_request(uuid, uuid, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.emit_event(uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.compute_account_equity(uuid, timestamptz) from public, anon;
revoke all on function public.compute_competition_scores(uuid, date, text) from public, anon;

grant execute on function public.compute_account_equity(uuid, timestamptz) to authenticated;
grant execute on function public.compute_competition_scores(uuid, date, text) to authenticated;
grant execute on function public.compute_account_equity(uuid, timestamptz) to service_role;
grant execute on function public.compute_competition_scores(uuid, date, text) to service_role;
grant execute on function public.place_order(uuid, jsonb, text) to service_role;
grant execute on function public.cancel_order(uuid) to service_role;
grant execute on function public.broker_engine_tick(integer) to service_role;
grant execute on function public.recompute_holdings_from_fills(uuid) to service_role;
grant execute on function public.snapshot_competition_daily(uuid, date) to service_role;
grant execute on function public.refresh_leaderboard(uuid, date, text) to service_role;
grant execute on function public.enqueue_job(text, jsonb, timestamptz) to service_role;
grant execute on function public.process_due_jobs(integer) to service_role;
grant execute on function public.consume_rate_limit(uuid, text, numeric, numeric, numeric) to service_role;
grant execute on function public.log_function_request(uuid, uuid, text, integer, integer, jsonb) to service_role;

create or replace function public.reset_trading_account(
  p_account_id uuid,
  p_starting_cash numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.trading_accounts%rowtype;
  v_cash numeric(18,6);
begin
  if not public.is_service_role() then
    raise exception 'reset_trading_account is service-only';
  end if;

  select * into v_account
  from public.trading_accounts
  where id = p_account_id
  for update;

  if not found then
    raise exception 'account not found';
  end if;

  v_cash := coalesce(p_starting_cash, v_account.starting_cash);

  delete from public.reservations where account_id = p_account_id;
  delete from public.fills where account_id = p_account_id;
  delete from public.orders where account_id = p_account_id;
  delete from public.holding_lots where account_id = p_account_id;
  delete from public.holdings_snapshot where account_id = p_account_id;
  delete from public.cash_ledger where account_id = p_account_id;

  update public.trading_accounts
  set starting_cash = v_cash,
      cash_balance = v_cash,
      status = 'active',
      is_frozen = false,
      updated_at = timezone('utc', now())
  where id = p_account_id;

  return jsonb_build_object(
    'account_id', p_account_id,
    'starting_cash', v_cash,
    'status', 'reset'
  );
end;
$$;

revoke all on function public.reset_trading_account(uuid, numeric) from public, anon, authenticated;
grant execute on function public.reset_trading_account(uuid, numeric) to service_role;
