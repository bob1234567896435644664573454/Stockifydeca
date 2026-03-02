-- Trade engine concurrency, idempotency, and reconciliation hardening.

alter table public.fills
  add column if not exists execution_key text;

alter table public.orders
  add column if not exists fee_bps_snapshot numeric(18,6),
  add column if not exists slippage_bps_snapshot numeric(18,6),
  add column if not exists reserve_price_snapshot numeric(18,6);

alter table public.reservations
  add column if not exists initial_amount numeric(18,6),
  add column if not exists release_reason text;

update public.reservations
set initial_amount = amount
where initial_amount is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'initial_amount'
      and is_nullable = 'YES'
  ) then
    alter table public.reservations
      alter column initial_amount set not null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_initial_amount_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_initial_amount_check
      check (initial_amount >= amount and initial_amount >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fills_order_execution_key_key'
      and conrelid = 'public.fills'::regclass
  ) then
    alter table public.fills
      add constraint fills_order_execution_key_key unique (order_id, execution_key);
  end if;
end;
$$;

create or replace function public.capture_order_pricing_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rules jsonb := '{}'::jsonb;
  v_market_price numeric(18,6);
begin
  select ac.rules_json into v_rules
  from public.get_account_active_competition(new.account_id) ac;

  if v_rules is null then
    v_rules := '{}'::jsonb;
  end if;

  new.fee_bps_snapshot := coalesce((v_rules -> 'fee_model' ->> 'bps')::numeric, 0);
  new.slippage_bps_snapshot := coalesce((v_rules -> 'slippage_model' ->> 'bps')::numeric, 0);

  if new.order_type in ('limit', 'stop_limit') then
    new.reserve_price_snapshot := coalesce(new.limit_price, new.stop_price, new.reserve_price_snapshot);
  else
    select mp.price into v_market_price
    from public.market_prices_latest mp
    where mp.symbol = new.symbol;
    new.reserve_price_snapshot := coalesce(v_market_price, new.reserve_price_snapshot);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_capture_order_pricing_snapshot on public.orders;

create trigger trg_capture_order_pricing_snapshot
before insert on public.orders
for each row
execute function public.capture_order_pricing_snapshot();

create or replace function public.normalize_buy_cash_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_required numeric(18,6);
begin
  if new.resource_type <> 'cash' then
    if new.initial_amount is null then
      new.initial_amount := new.amount;
    end if;
    return new;
  end if;

  select * into v_order
  from public.orders
  where id = new.ref_order_id;

  if not found or v_order.side <> 'buy' then
    if new.initial_amount is null then
      new.initial_amount := new.amount;
    end if;
    return new;
  end if;

  if coalesce(v_order.reserve_price_snapshot, 0) <= 0 then
    if new.initial_amount is null then
      new.initial_amount := new.amount;
    end if;
    return new;
  end if;

  v_required := round(
    v_order.qty
    * v_order.reserve_price_snapshot
    * (1 + (coalesce(v_order.slippage_bps_snapshot, 0) / 10000))
    * (1 + (coalesce(v_order.fee_bps_snapshot, 0) / 10000)),
    6
  );

  if v_required > 0 then
    new.amount := v_required;
  end if;
  new.initial_amount := new.amount;

  return new;
end;
$$;

drop trigger if exists trg_normalize_buy_cash_reservation on public.reservations;

create trigger trg_normalize_buy_cash_reservation
before insert on public.reservations
for each row
execute function public.normalize_buy_cash_reservation();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trading_accounts_cash_balance_nonnegative'
      and conrelid = 'public.trading_accounts'::regclass
  ) then
    alter table public.trading_accounts
      add constraint trading_accounts_cash_balance_nonnegative
      check (cash_balance >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_filled_qty_lte_qty'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_filled_qty_lte_qty
      check (filled_qty <= qty);
  end if;
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
  set released_at = timezone('utc', now()),
      release_reason = 'canceled'
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

create or replace function public.broker_apply_fill(
  p_order_id uuid,
  p_fill_qty numeric,
  p_fill_price numeric,
  p_fee_bps numeric,
  p_slippage_bps numeric,
  p_execution_key text default null
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
  v_existing_fill_id uuid;
  v_snapshot public.holdings_snapshot%rowtype;
  v_new_qty numeric(18,6);
  v_realized numeric(18,6) := 0;
  v_to_sell numeric(18,6);
  v_lot public.holding_lots%rowtype;
  v_consume numeric(18,6);
  v_reservation public.reservations%rowtype;
  v_execution_key text := nullif(trim(coalesce(p_execution_key, '')), '');
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
    return jsonb_build_object('order_id', p_order_id, 'status', v_order.status, 'applied', false, 'idempotent', false);
  end if;

  if v_execution_key is not null then
    select f.id into v_existing_fill_id
    from public.fills f
    where f.order_id = v_order.id
      and f.execution_key = v_execution_key
    limit 1;

    if found then
      return jsonb_build_object(
        'order_id', p_order_id,
        'fill_id', v_existing_fill_id,
        'status', v_order.status,
        'applied', false,
        'idempotent', true
      );
    end if;
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
    return jsonb_build_object('order_id', p_order_id, 'status', 'filled', 'applied', false, 'idempotent', false);
  end if;

  v_effective_qty := least(v_remaining, p_fill_qty);
  v_principal := v_effective_qty * p_fill_price;
  v_fee := round(v_principal * coalesce(p_fee_bps, 0) / 10000, 6);

  if v_order.side = 'buy' then
    v_total_cost := v_principal + v_fee;

    if v_account.cash_balance < v_total_cost then
      update public.orders
      set status = 'rejected', rejection_reason = 'insufficient cash at fill', updated_at = v_now
      where id = v_order.id;

      update public.reservations
      set released_at = v_now,
          release_reason = 'rejected_insufficient_cash'
      where ref_order_id = v_order.id and released_at is null;

      return jsonb_build_object('order_id', p_order_id, 'status', 'rejected', 'applied', false, 'idempotent', false);
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
      set released_at = v_now,
          release_reason = 'rejected_insufficient_shares'
      where ref_order_id = v_order.id and released_at is null;

      return jsonb_build_object('order_id', p_order_id, 'status', 'rejected', 'applied', false, 'idempotent', false);
    end if;
  end if;

  insert into public.fills (order_id, account_id, symbol, qty, price, fees, slippage, execution_key, filled_at)
  values (v_order.id, v_order.account_id, v_order.symbol, v_effective_qty, p_fill_price, v_fee, coalesce(p_slippage_bps, 0), v_execution_key, v_now)
  on conflict (order_id, execution_key) do nothing
  returning id into v_fill_id;

  if v_fill_id is null and v_execution_key is not null then
    select f.id into v_existing_fill_id
    from public.fills f
    where f.order_id = v_order.id
      and f.execution_key = v_execution_key
    limit 1;

    if found then
      return jsonb_build_object(
        'order_id', p_order_id,
        'fill_id', v_existing_fill_id,
        'status', v_order.status,
        'applied', false,
        'idempotent', true
      );
    end if;
  end if;

  if v_fill_id is null then
    raise exception 'failed to create fill';
  end if;

  if v_order.side = 'buy' then
    v_total_cost := v_principal + v_fee;

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
        release_reason = 'filled'
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

  return jsonb_build_object('order_id', v_order.id, 'fill_id', v_fill_id, 'applied', true, 'idempotent', false);
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
  v_filled_qty numeric(18,6);
  v_execution_key text;
begin
  select o.filled_qty into v_filled_qty
  from public.orders o
  where o.id = p_order_id;

  if v_filled_qty is null then
    raise exception 'order not found';
  end if;

  v_execution_key := format(
    'legacy:%s:%s:%s:%s:%s:%s',
    p_order_id,
    v_filled_qty,
    p_fill_qty,
    p_fill_price,
    coalesce(p_fee_bps, 0),
    coalesce(p_slippage_bps, 0)
  );

  return public.broker_apply_fill(
    p_order_id,
    p_fill_qty,
    p_fill_price,
    p_fee_bps,
    p_slippage_bps,
    v_execution_key
  );
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
  v_market_price_ts timestamptz;
  v_bar_volume numeric(18,6);
  v_remaining numeric(18,6);
  v_fill_qty numeric(18,6);
  v_executable boolean;
  v_triggered boolean;
  v_fill_price numeric(18,6);
  v_slip_bps numeric(18,6);
  v_fee_bps numeric(18,6);
  v_rules jsonb;
  v_max_price_age_seconds integer := 15;
  v_processed integer := 0;
  v_applied jsonb;
  v_execution_key text;
begin
  if not public.is_service_role() then
    raise exception 'broker_engine_tick is service-only';
  end if;

  -- Coarse-grained lock prevents concurrent tick runners from racing on fills.
  if not pg_try_advisory_xact_lock(hashtext('public.broker_engine_tick')::bigint) then
    return 0;
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
      update public.reservations
      set released_at = v_now, release_reason = 'expired'
      where ref_order_id = v_order.id and released_at is null;
      perform public.emit_event(v_account.org_id, v_account.class_id, 'order.expired', 'orders', v_order.id, jsonb_build_object('order_id', v_order.id));
      continue;
    end if;

    if not public.is_account_trading_enabled(v_order.account_id) then
      update public.orders set status = 'rejected', rejection_reason = 'trading disabled', updated_at = v_now where id = v_order.id;
      update public.reservations
      set released_at = v_now, release_reason = 'rejected_trading_disabled'
      where ref_order_id = v_order.id and released_at is null;
      continue;
    end if;

    select mp.price, mp.ts into v_market_price, v_market_price_ts
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

    v_max_price_age_seconds := greatest(coalesce((v_rules ->> 'max_price_staleness_seconds')::int, 15), 1);
    if v_market_price_ts is null or v_market_price_ts < v_now - make_interval(secs => v_max_price_age_seconds) then
      continue;
    end if;

    v_slip_bps := coalesce(v_order.slippage_bps_snapshot, (v_rules -> 'slippage_model' ->> 'bps')::numeric, 0);
    v_fee_bps := coalesce(v_order.fee_bps_snapshot, (v_rules -> 'fee_model' ->> 'bps')::numeric, 0);

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
        update public.reservations
        set released_at = v_now, release_reason = 'canceled_tif_unfilled'
        where ref_order_id = v_order.id and released_at is null;
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
      update public.reservations
      set released_at = v_now, release_reason = 'canceled_fok_partial'
      where ref_order_id = v_order.id and released_at is null;
      continue;
    end if;

    v_execution_key := format(
      'tick:%s:%s:%s:%s:%s:%s:%s:%s',
      v_order.id,
      v_order.side,
      v_order.filled_qty,
      v_fill_qty,
      round(v_fill_price, 6),
      v_fee_bps,
      v_slip_bps,
      coalesce(extract(epoch from v_market_price_ts)::bigint, 0)
    );

    v_applied := public.broker_apply_fill(
      v_order.id,
      v_fill_qty,
      round(v_fill_price, 6),
      v_fee_bps,
      v_slip_bps,
      v_execution_key
    );

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

create or replace function public.nightly_reconciliation_audit()
returns table(
  check_name text,
  ok boolean,
  violation_count bigint,
  sample jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_role() then
    raise exception 'nightly_reconciliation_audit is service-only';
  end if;

  return query
  with viol as (
    select a.id
    from public.trading_accounts a
    where a.cash_balance < 0
  )
  select
    'cash_non_negative'::text,
    count(*) = 0,
    count(*)::bigint,
    coalesce(jsonb_agg(v.id), '[]'::jsonb)
  from (select id from viol limit 10) v;

  return query
  with lot_totals as (
    select l.account_id, l.symbol, round(coalesce(sum(l.qty), 0), 6) as qty
    from public.holding_lots l
    group by l.account_id, l.symbol
  ),
  snap_totals as (
    select h.account_id, h.symbol, round(h.qty, 6) as qty
    from public.holdings_snapshot h
  ),
  viol as (
    select
      coalesce(s.account_id, l.account_id) as account_id,
      coalesce(s.symbol, l.symbol) as symbol,
      coalesce(s.qty, 0) as snapshot_qty,
      coalesce(l.qty, 0) as lot_qty
    from snap_totals s
    full outer join lot_totals l
      on l.account_id = s.account_id
     and l.symbol = s.symbol
    where abs(coalesce(s.qty, 0) - coalesce(l.qty, 0)) > 0.000001
  )
  select
    'lots_sum_equals_holdings'::text,
    count(*) = 0,
    count(*)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'account_id', v.account_id,
          'symbol', v.symbol,
          'snapshot_qty', v.snapshot_qty,
          'lot_qty', v.lot_qty
        )
      ),
      '[]'::jsonb
    )
  from (select * from viol limit 10) v;

  return query
  with expected as (
    select
      f.id as fill_id,
      case
        when o.side = 'buy' then round(-(f.qty * f.price + f.fees), 6)
        else round((f.qty * f.price - f.fees), 6)
      end as expected_delta
    from public.fills f
    join public.orders o on o.id = f.order_id
  ),
  actual as (
    select
      cl.ref_id as fill_id,
      round(coalesce(sum(cl.amount), 0), 6) as actual_delta
    from public.cash_ledger cl
    where cl.ref_table = 'fills'
    group by cl.ref_id
  ),
  viol as (
    select
      e.fill_id,
      e.expected_delta,
      coalesce(a.actual_delta, 0) as actual_delta
    from expected e
    left join actual a on a.fill_id = e.fill_id
    where abs(coalesce(a.actual_delta, 0) - e.expected_delta) > 0.000001
  )
  select
    'fills_match_ledger_deltas'::text,
    count(*) = 0,
    count(*)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'fill_id', v.fill_id,
          'expected_delta', v.expected_delta,
          'actual_delta', v.actual_delta
        )
      ),
      '[]'::jsonb
    )
  from (select * from viol limit 10) v;

  return query
  with viol as (
    select r.ref_order_id as order_id, r.amount
    from public.orders o
    join public.reservations r
      on r.ref_order_id = o.id
     and r.released_at is null
    where o.status = 'filled'
      and r.amount > 0
  )
  select
    'no_active_reservation_on_filled_orders'::text,
    count(*) = 0,
    count(*)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object('order_id', v.order_id, 'amount', v.amount)
      ),
      '[]'::jsonb
    )
  from (select * from viol limit 10) v;

  return query
  with viol as (
    select r.id, r.initial_amount, r.amount, r.released_at
    from public.reservations r
    where r.initial_amount is null
       or r.initial_amount < r.amount
  )
  select
    'reservation_auditability_preserved'::text,
    count(*) = 0,
    count(*)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'reservation_id', v.id,
          'initial_amount', v.initial_amount,
          'amount', v.amount,
          'released_at', v.released_at
        )
      ),
      '[]'::jsonb
    )
  from (select * from viol limit 10) v;
end;
$$;

revoke all on function public.broker_apply_fill(uuid, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.broker_apply_fill(uuid, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.nightly_reconciliation_audit() from public, anon, authenticated;
revoke all on function public.normalize_buy_cash_reservation() from public, anon, authenticated;
revoke all on function public.capture_order_pricing_snapshot() from public, anon, authenticated;

grant execute on function public.broker_apply_fill(uuid, numeric, numeric, numeric, numeric) to service_role;
grant execute on function public.broker_apply_fill(uuid, numeric, numeric, numeric, numeric, text) to service_role;
grant execute on function public.nightly_reconciliation_audit() to service_role;
