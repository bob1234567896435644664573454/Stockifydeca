-- Stockify backend assertions
-- Run with: supabase db test --file supabase/tests/stockify_backend_tests.sql

begin;

-- Regression: ensure auth.users -> public.profiles trigger exists and no users are missing profiles.
-- Run this before switching to service_role, because service_role cannot read auth.users directly.
do $$
declare
  v_cnt integer;
begin
  select count(*) into v_cnt
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth'
    and c.relname = 'users'
    and t.tgenabled <> 'D'
    and t.tgname = 'trg_on_auth_user_created';

  if v_cnt <> 1 then
    raise exception 'expected trigger trg_on_auth_user_created on auth.users, found %', v_cnt;
  end if;

  select count(*) into v_cnt
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where p.user_id is null;

  if v_cnt <> 0 then
    raise exception 'found auth users without profiles: %', v_cnt;
  end if;
end;
$$;

-- Service context for mutating RPC tests
set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Make order-path tests deterministic by disabling cooldown/rate caps.
update public.competitions
set rules_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(rules_json, '{trade_cooldown_seconds}', '0'::jsonb, true),
      '{max_orders_per_minute}',
      '1000'::jsonb,
      true
    ),
    '{max_trades_per_day}',
    '10000'::jsonb,
    true
  ),
  '{market_hours_mode}',
  to_jsonb('relaxed'::text),
  true
)
where id = '55555555-5555-5555-5555-555555555555';

do $$
declare
  v_r1 jsonb;
  v_r2 jsonb;
  v_order_id_1 uuid;
  v_order_id_2 uuid;
  v_status text;
  v_reservation numeric;
begin
  v_r1 := public.place_order(
    '44444444-4444-4444-4444-444444444441',
    '{"symbol":"AAPL","side":"buy","qty":10,"order_type":"market","tif":"day"}'::jsonb,
    'test-idempotent-001'
  );

  v_r2 := public.place_order(
    '44444444-4444-4444-4444-444444444441',
    '{"symbol":"AAPL","side":"buy","qty":10,"order_type":"market","tif":"day"}'::jsonb,
    'test-idempotent-001'
  );

  v_order_id_1 := (v_r1 ->> 'order_id')::uuid;
  v_order_id_2 := (v_r2 ->> 'order_id')::uuid;

  if v_order_id_1 is null or v_order_id_2 is null or v_order_id_1 <> v_order_id_2 then
    raise exception 'idempotency failed: % vs %', v_order_id_1, v_order_id_2;
  end if;

  select status into v_status from public.orders where id = v_order_id_1;
  if v_status not in ('open', 'partially_filled', 'filled') then
    raise exception 'unexpected order status %', v_status;
  end if;

  select amount into v_reservation
  from public.reservations
  where ref_order_id = v_order_id_1 and resource_type = 'cash' and released_at is null
  limit 1;

  if coalesce(v_reservation, 0) <= 0 then
    raise exception 'buy reservation not created';
  end if;
end;
$$;

do $$
declare
  v_before numeric;
  v_after numeric;
  v_order_id uuid;
  v_res_shares numeric;
  v_result integer;
begin
  -- fill pending orders
  v_result := public.broker_engine_tick(100);

  select cash_balance into v_before
  from public.trading_accounts
  where id = '44444444-4444-4444-4444-444444444441';

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"sell","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-sell-reserve-001'
    ) ->> 'order_id'
  )::uuid;

  select amount into v_res_shares
  from public.reservations
  where ref_order_id = v_order_id and resource_type = 'shares' and released_at is null
  limit 1;

  if coalesce(v_res_shares, 0) <> 1 then
    raise exception 'sell reservation should be 1 share, got %', v_res_shares;
  end if;

  perform public.broker_engine_tick(100);

  select cash_balance into v_after
  from public.trading_accounts
  where id = '44444444-4444-4444-4444-444444444441';

  if v_after is null then
    raise exception 'account cash missing';
  end if;

  if v_after = v_before then
    raise exception 'sell fill did not affect cash';
  end if;
end;
$$;

do $$
declare
  v_limit_order uuid;
  v_stop_order uuid;
  v_status text;
begin
  -- Limit order should wait until crossed
  v_limit_order := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"MSFT","side":"buy","qty":2,"order_type":"limit","limit_price":300,"tif":"gtc"}'::jsonb,
      'test-limit-001'
    ) ->> 'order_id'
  )::uuid;

  perform public.broker_engine_tick(100);
  select status into v_status from public.orders where id = v_limit_order;
  if v_status not in ('open', 'partially_filled') then
    raise exception 'limit order should not fill before cross, got %', v_status;
  end if;

  update public.market_prices_latest set price = 299 where symbol = 'MSFT';
  perform public.broker_engine_tick(100);
  select status into v_status from public.orders where id = v_limit_order;
  if v_status not in ('partially_filled', 'filled') then
    raise exception 'limit order should fill after cross, got %', v_status;
  end if;

  -- Stop order should not trigger until crossed
  update public.market_prices_latest set price = 180 where symbol = 'AAPL';
  v_stop_order := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"stop","stop_price":200,"tif":"gtc"}'::jsonb,
      'test-stop-001'
    ) ->> 'order_id'
  )::uuid;

  perform public.broker_engine_tick(100);
  select status into v_status from public.orders where id = v_stop_order;
  if v_status not in ('open', 'partially_filled') then
    raise exception 'stop order should stay open pre-trigger, got %', v_status;
  end if;

  update public.market_prices_latest set price = 205 where symbol = 'AAPL';
  perform public.broker_engine_tick(100);
  select status into v_status from public.orders where id = v_stop_order;
  if v_status not in ('partially_filled', 'filled') then
    raise exception 'stop order should trigger and fill, got %', v_status;
  end if;
end;
$$;

do $$
declare
  v_order_id uuid;
  v_first jsonb;
  v_second jsonb;
  v_fill_count integer;
  v_filled_qty numeric;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 100000);

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":2,"order_type":"market","tif":"day"}'::jsonb,
      'test-fill-idempotency-001'
    ) ->> 'order_id'
  )::uuid;

  v_first := public.broker_apply_fill(v_order_id, 1, 190, 0, 0, 'dup-fill-key-001');
  v_second := public.broker_apply_fill(v_order_id, 1, 190, 0, 0, 'dup-fill-key-001');

  if coalesce((v_first ->> 'applied')::boolean, false) is not true then
    raise exception 'first fill application should apply: %', v_first;
  end if;

  if coalesce((v_second ->> 'idempotent')::boolean, false) is not true
     or coalesce((v_second ->> 'applied')::boolean, true) is not false then
    raise exception 'second fill application should be idempotent no-op: %', v_second;
  end if;

  select count(*) into v_fill_count
  from public.fills
  where order_id = v_order_id
    and execution_key = 'dup-fill-key-001';

  if v_fill_count <> 1 then
    raise exception 'expected exactly one fill row for idempotent key, got %', v_fill_count;
  end if;

  select filled_qty into v_filled_qty from public.orders where id = v_order_id;
  if v_filled_qty <> 1 then
    raise exception 'idempotent duplicate should not advance filled_qty twice, got %', v_filled_qty;
  end if;
end;
$$;

do $$
declare
  v_prev_rules jsonb;
  v_order_id uuid;
  v_reserved numeric;
  v_initial numeric;
  v_expected numeric;
  v_fee_snapshot numeric;
  v_slip_snapshot numeric;
begin
  select rules_json into v_prev_rules
  from public.competitions
  where id = '55555555-5555-5555-5555-555555555555';

  update public.competitions
  set rules_json = jsonb_set(
    jsonb_set(
      coalesce(v_prev_rules, '{}'::jsonb),
      '{slippage_model,bps}',
      to_jsonb(100::numeric),
      true
    ),
    '{fee_model,bps}',
    to_jsonb(200::numeric),
    true
  )
  where id = '55555555-5555-5555-5555-555555555555';

  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 100000);
  update public.market_prices_latest set price = 100 where symbol = 'AAPL';

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":10,"order_type":"market","tif":"day"}'::jsonb,
      'test-worst-case-reserve-001'
    ) ->> 'order_id'
  )::uuid;

  select amount into v_reserved
  from public.reservations
  where ref_order_id = v_order_id
    and resource_type = 'cash'
    and released_at is null
  limit 1;

  select initial_amount into v_initial
  from public.reservations
  where ref_order_id = v_order_id
    and resource_type = 'cash'
    and released_at is null
  limit 1;

  select fee_bps_snapshot, slippage_bps_snapshot
    into v_fee_snapshot, v_slip_snapshot
  from public.orders
  where id = v_order_id;

  if v_fee_snapshot <> 200 or v_slip_snapshot <> 100 then
    raise exception 'order pricing snapshots mismatch fee/slip: %/%', v_fee_snapshot, v_slip_snapshot;
  end if;

  v_expected := round(10 * 100 * 1.01 * 1.02, 6);
  if coalesce(v_reserved, 0) < v_expected then
    raise exception 'market buy reservation must include worst-case slippage+fee, expected >= %, got %', v_expected, v_reserved;
  end if;
  if coalesce(v_initial, 0) <> coalesce(v_reserved, 0) then
    raise exception 'initial_amount should equal active reserved amount at placement: initial %, active %', v_initial, v_reserved;
  end if;

  update public.competitions
  set rules_json = v_prev_rules
  where id = '55555555-5555-5555-5555-555555555555';
end;
$$;

do $$
declare
  v_order_id uuid;
  v_result jsonb;
  v_fill_count integer;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 5000);

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-reject-no-phantom-fill-001'
    ) ->> 'order_id'
  )::uuid;

  update public.trading_accounts
  set cash_balance = 0
  where id = '44444444-4444-4444-4444-444444444441';

  v_result := public.broker_apply_fill(v_order_id, 1, 1000, 0, 0, 'reject-no-fill-key-001');

  if (v_result ->> 'status') <> 'rejected' then
    raise exception 'expected rejected fill result after forcing cash shortfall, got %', v_result;
  end if;

  select count(*) into v_fill_count
  from public.fills
  where order_id = v_order_id;

  if v_fill_count <> 0 then
    raise exception 'rejected fill should not create fill rows, found %', v_fill_count;
  end if;
end;
$$;

do $$
declare
  v_first jsonb;
  v_second_err text;
  v_open_reservations integer;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 1000);
  update public.market_prices_latest set price = 100 where symbol = 'AAPL';

  v_first := public.place_order(
    '44444444-4444-4444-4444-444444444441',
    '{"symbol":"AAPL","side":"buy","qty":8,"order_type":"market","tif":"day"}'::jsonb,
    'test-cash-exhaust-001'
  );

  begin
    perform public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":8,"order_type":"market","tif":"day"}'::jsonb,
      'test-cash-exhaust-002'
    );
  exception
    when others then
      v_second_err := sqlerrm;
  end;

  if v_second_err is null or position('insufficient available cash' in v_second_err) = 0 then
    raise exception 'second buy should fail due reserved cash, got %', coalesce(v_second_err, '<no error>');
  end if;

  select count(*) into v_open_reservations
  from public.reservations
  where account_id = '44444444-4444-4444-4444-444444444441'
    and released_at is null;

  if v_open_reservations <> 1 then
    raise exception 'expected one active reservation after first buy, got %', v_open_reservations;
  end if;
end;
$$;

do $$
declare
  v_cancel_order uuid;
  v_fill_order uuid;
  v_open_res_count integer;
  v_initial numeric;
  v_amount numeric;
  v_release_reason text;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 100000);

  v_cancel_order := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-res-release-cancel-001'
    ) ->> 'order_id'
  )::uuid;
  perform public.cancel_order(v_cancel_order);

  select count(*) into v_open_res_count
  from public.reservations
  where ref_order_id = v_cancel_order
    and released_at is null
    and amount > 0;

  if v_open_res_count <> 0 then
    raise exception 'cancel should release reservation completely';
  end if;

  select initial_amount, amount, release_reason
    into v_initial, v_amount, v_release_reason
  from public.reservations
  where ref_order_id = v_cancel_order
  limit 1;

  if coalesce(v_initial, 0) <= 0 or v_release_reason <> 'canceled' then
    raise exception 'cancel reservation audit trail missing: initial %, reason %', v_initial, v_release_reason;
  end if;
  if v_amount <> v_initial then
    raise exception 'released canceled reservation should preserve amount for audit: amount %, initial %', v_amount, v_initial;
  end if;

  v_fill_order := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-res-release-fill-001'
    ) ->> 'order_id'
  )::uuid;

  perform public.broker_engine_tick(100);

  select count(*) into v_open_res_count
  from public.reservations
  where ref_order_id = v_fill_order
    and released_at is null
    and amount > 0;

  if v_open_res_count <> 0 then
    raise exception 'fill should release reservation completely';
  end if;

  select initial_amount, amount, release_reason
    into v_initial, v_amount, v_release_reason
  from public.reservations
  where ref_order_id = v_fill_order
  limit 1;

  if coalesce(v_initial, 0) <= 0 or v_release_reason <> 'filled' then
    raise exception 'fill reservation audit trail missing: initial %, reason %', v_initial, v_release_reason;
  end if;
  if v_amount < 0 then
    raise exception 'released fill reservation should never be negative, got %', v_amount;
  end if;
end;
$$;

do $$
declare
  v_order_id uuid;
  v_initial numeric;
  v_released_amount numeric;
  v_release_reason text;
  v_released_at timestamptz;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 100000);
  update public.market_prices_latest set price = 100 where symbol = 'AAPL';

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-fill-release-leftover-audit-001'
    ) ->> 'order_id'
  )::uuid;

  select initial_amount
    into v_initial
  from public.reservations
  where ref_order_id = v_order_id
  limit 1;

  update public.market_prices_latest set price = 90 where symbol = 'AAPL';
  perform public.broker_engine_tick(100);

  select amount, released_at, release_reason
    into v_released_amount, v_released_at, v_release_reason
  from public.reservations
  where ref_order_id = v_order_id
  limit 1;

  if v_released_at is null or v_release_reason <> 'filled' then
    raise exception 'expected filled reservation to be released with reason filled';
  end if;

  if coalesce(v_released_amount, 0) <= 0 or coalesce(v_initial, 0) <= v_released_amount then
    raise exception 'filled reservation should preserve leftover amount when execution improves: initial %, released amount %', v_initial, v_released_amount;
  end if;
end;
$$;

do $$
declare
  v_order_id uuid;
  v_fills integer;
  v_key text;
begin
  perform public.reset_trading_account('44444444-4444-4444-4444-444444444441', 100000);

  v_order_id := (
    public.place_order(
      '44444444-4444-4444-4444-444444444441',
      '{"symbol":"AAPL","side":"buy","qty":1,"order_type":"market","tif":"day"}'::jsonb,
      'test-repeat-tick-no-double-fill-001'
    ) ->> 'order_id'
  )::uuid;

  perform public.broker_engine_tick(100);
  perform public.broker_engine_tick(100);

  select count(*) into v_fills
  from public.fills
  where order_id = v_order_id;

  if v_fills <> 1 then
    raise exception 'repeated ticks should not double-fill a fully-filled order, got % fills', v_fills;
  end if;

  select execution_key into v_key
  from public.fills
  where order_id = v_order_id
  limit 1;

  if coalesce(v_key, '') = '' or v_key !~ '^tick:[0-9a-f-]+:(buy|sell):[0-9.]+:[0-9.]+:[0-9.]+:[0-9.]+:[0-9.]+:[0-9]+$' then
    raise exception 'engine fill execution_key should match deterministic tick key format, got %', coalesce(v_key, '<null>');
  end if;
end;
$$;

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count
  from public.nightly_reconciliation_audit() a
  where not a.ok;

  if v_bad_count <> 0 then
    raise exception 'nightly_reconciliation_audit reported % failing checks', v_bad_count;
  end if;
end;
$$;

-- RLS checks in authenticated user contexts

set local role authenticated;
set local request.jwt.claim.role = 'student';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

do $$
declare
  v_cnt integer;
begin
  select count(*) into v_cnt
  from public.trading_accounts a
  where a.user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  if v_cnt <> 0 then
    raise exception 'student should not see other student accounts';
  end if;
end;
$$;

set local request.jwt.claim.role = 'teacher';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

do $$
declare
  v_cnt integer;
begin
  select count(*) into v_cnt
  from public.trading_accounts a
  where a.class_id = '33333333-3333-3333-3333-333333333333';

  if v_cnt < 2 then
    raise exception 'teacher should see class accounts';
  end if;
end;
$$;

set local request.jwt.claim.role = 'org_admin';
set local request.jwt.claim.sub = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

do $$
declare
  v_cnt integer;
begin
  select count(*) into v_cnt
  from public.classes c
  where c.org_id = '11111111-1111-1111-1111-111111111111';

  if v_cnt < 1 then
    raise exception 'org_admin should see org classes';
  end if;
end;
$$;

rollback;
