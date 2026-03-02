-- Demo seed for Stockify

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'platform-admin@stockify.dev',
    '$2a$06$MKIiRSriFvY2Wl3s2dGOr.U7RfCUeIw1ix.LhDYa9lzw8h30cz8zq',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"role":"platform_admin"}'::jsonb,
    '{"display_name":"Platform Admin"}'::jsonb
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'org-admin@stockify.dev',
    '$2a$06$MKIiRSriFvY2Wl3s2dGOr.U7RfCUeIw1ix.LhDYa9lzw8h30cz8zq',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"role":"org_admin"}'::jsonb,
    '{"display_name":"Org Admin"}'::jsonb
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'teacher@stockify.dev',
    '$2a$06$MKIiRSriFvY2Wl3s2dGOr.U7RfCUeIw1ix.LhDYa9lzw8h30cz8zq',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"role":"teacher"}'::jsonb,
    '{"display_name":"Ms. Rivera"}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student1@stockify.dev',
    '$2a$06$MKIiRSriFvY2Wl3s2dGOr.U7RfCUeIw1ix.LhDYa9lzw8h30cz8zq',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"role":"student"}'::jsonb,
    '{"display_name":"Alex Student"}'::jsonb
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student2@stockify.dev',
    '$2a$06$MKIiRSriFvY2Wl3s2dGOr.U7RfCUeIw1ix.LhDYa9lzw8h30cz8zq',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"role":"student"}'::jsonb,
    '{"display_name":"Jordan Student"}'::jsonb
  )
on conflict (id) do nothing;

-- Keep GoTrue password grant compatible with local seeded users.
update auth.users
set
  aud = coalesce(aud, 'authenticated'),
  role = coalesce(role, 'authenticated'),
  email = coalesce(email, ''),
  encrypted_password = coalesce(encrypted_password, ''),
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, '')
where id in (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

insert into public.organizations (id, name, plan_tier, status)
values ('11111111-1111-1111-1111-111111111111', 'Demo District', 'school_pro', 'active')
on conflict (id) do nothing;

insert into public.schools (id, org_id, name)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Lincoln High School')
on conflict (id) do nothing;

insert into public.profiles (user_id, display_name, role, org_id, school_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Platform Admin', 'platform_admin', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Org Admin', 'org_admin', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ms. Rivera', 'teacher', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Alex Student', 'student', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Jordan Student', 'student', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict (user_id) do update
set
  display_name = excluded.display_name,
  role = excluded.role,
  org_id = excluded.org_id,
  school_id = excluded.school_id;

insert into public.classes (id, org_id, school_id, teacher_id, name, join_code)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Finance 101 - Period 1',
  'JOIN-STOCKIFY-101'
)
on conflict (id) do nothing;

insert into public.enrollments (id, class_id, student_id, status)
values
  ('99999999-9999-9999-9999-999999999991', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active'),
  ('99999999-9999-9999-9999-999999999992', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active')
on conflict (class_id, student_id) do nothing;

insert into public.trading_accounts (
  id,
  user_id,
  org_id,
  class_id,
  base_currency,
  starting_cash,
  cash_balance,
  status,
  is_frozen
)
values
  ('44444444-4444-4444-4444-444444444441', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'USD', 100000.000000, 100000.000000, 'active', false),
  ('44444444-4444-4444-4444-444444444442', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'USD', 100000.000000, 100000.000000, 'active', false)
on conflict (user_id, class_id) do nothing;

insert into public.symbol_master (symbol, name, exchange, asset_type, is_active, metadata_json)
values
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'stock', true, '{"sector":"Technology"}'::jsonb),
  ('MSFT', 'Microsoft Corp.', 'NASDAQ', 'stock', true, '{"sector":"Technology"}'::jsonb),
  ('SPY', 'SPDR S&P 500 ETF Trust', 'ARCA', 'etf', true, '{"sector":"Index"}'::jsonb),
  ('TSLA', 'Tesla, Inc.', 'NASDAQ', 'stock', true, '{"sector":"Consumer Discretionary"}'::jsonb),
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'stock', true, '{"sector":"Technology"}'::jsonb)
on conflict (symbol) do update
set name = excluded.name,
    exchange = excluded.exchange,
    asset_type = excluded.asset_type,
    is_active = excluded.is_active,
    metadata_json = excluded.metadata_json;

insert into public.symbol_aliases (symbol, tradingview_symbol, primary_exchange, metadata_json)
values
  ('AAPL', 'NASDAQ:AAPL', 'NASDAQ', '{}'::jsonb),
  ('MSFT', 'NASDAQ:MSFT', 'NASDAQ', '{}'::jsonb),
  ('SPY', 'AMEX:SPY', 'ARCA', '{}'::jsonb),
  ('TSLA', 'NASDAQ:TSLA', 'NASDAQ', '{}'::jsonb),
  ('NVDA', 'NASDAQ:NVDA', 'NASDAQ', '{}'::jsonb)
on conflict (symbol) do update
set tradingview_symbol = excluded.tradingview_symbol,
    primary_exchange = excluded.primary_exchange,
    metadata_json = excluded.metadata_json,
    updated_at = timezone('utc', now());

insert into public.market_prices_latest (symbol, ts, price, source)
values
  ('AAPL', timezone('utc', now()), 189.250000, 'seed'),
  ('MSFT', timezone('utc', now()), 407.100000, 'seed'),
  ('SPY', timezone('utc', now()), 510.300000, 'seed'),
  ('TSLA', timezone('utc', now()), 201.800000, 'seed'),
  ('NVDA', timezone('utc', now()), 722.450000, 'seed')
on conflict (symbol) do update
set ts = excluded.ts,
    price = excluded.price,
    source = excluded.source;

insert into public.market_bars_cache (symbol, timeframe, ts, o, h, l, c, v)
values
  ('AAPL', '1m', timezone('utc', now()) - interval '1 minute', 188.900000, 189.300000, 188.700000, 189.250000, 1450000.000000),
  ('MSFT', '1m', timezone('utc', now()) - interval '1 minute', 406.300000, 407.500000, 406.000000, 407.100000, 1010000.000000),
  ('SPY',  '1m', timezone('utc', now()) - interval '1 minute', 509.700000, 510.600000, 509.500000, 510.300000, 2200000.000000),
  ('TSLA', '1m', timezone('utc', now()) - interval '1 minute', 200.900000, 202.200000, 200.700000, 201.800000, 1800000.000000),
  ('NVDA', '1m', timezone('utc', now()) - interval '1 minute', 719.000000, 724.000000, 718.400000, 722.450000, 1950000.000000)
on conflict (symbol, timeframe, ts) do nothing;

insert into public.competitions (id, class_id, name, status, rules_json)
values (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'Spring Trading Challenge',
  'active',
  jsonb_build_object(
    'starting_cash', 100000,
    'allowed_asset_types', jsonb_build_array('stock', 'etf'),
    'allowed_symbols', jsonb_build_array('AAPL', 'MSFT', 'SPY', 'TSLA', 'NVDA'),
    'banned_symbols', jsonb_build_array(),
    'min_price', 5,
    'max_spread_pct', 5,
    'max_order_size', 500,
    'max_position_size_pct', 25,
    'max_trades_per_day', 30,
    'max_orders_per_minute', 8,
    'no_daytrade', false,
    'daytrade_limit', 4,
    'trade_cooldown_seconds', 10,
    'market_hours_mode', 'relaxed',
    'slippage_model', jsonb_build_object('type', 'bps', 'bps', 5),
    'fee_model', jsonb_build_object('type', 'bps', 'bps', 0),
    'delayed_quotes_seconds', 15,
    'short_selling_enabled', false,
    'leverage_enabled', false,
    'auto_liquidate_on_rule_break', false,
    'news_blackout', false,
    'research_tools_enabled', true,
    'penny_stocks_disabled', true,
    'min_limit_distance_bps', 3,
    'score_mode', 'rules_compliance_weighted'
  )
)
on conflict (id) do update
set class_id = excluded.class_id,
    name = excluded.name,
    status = excluded.status,
    rules_json = excluded.rules_json;

insert into public.competition_accounts (competition_id, account_id)
values
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444441'),
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444442')
on conflict (competition_id, account_id) do nothing;

insert into public.watchlists (id, owner_type, owner_id, name, created_by)
values
  ('66666666-6666-6666-6666-666666666661', 'class', '33333333-3333-3333-3333-333333333333', 'Class Core Symbols', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('66666666-6666-6666-6666-666666666662', 'user', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Alex Watchlist', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict (id) do nothing;

insert into public.watchlist_items (watchlist_id, symbol)
values
  ('66666666-6666-6666-6666-666666666661', 'AAPL'),
  ('66666666-6666-6666-6666-666666666661', 'MSFT'),
  ('66666666-6666-6666-6666-666666666661', 'SPY'),
  ('66666666-6666-6666-6666-666666666662', 'TSLA')
on conflict (watchlist_id, symbol) do nothing;

insert into public.featured_symbols (id, class_id, competition_id, symbol, reason, rank)
values
  ('77777777-7777-7777-7777-777777777771', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'AAPL', 'Earnings momentum', 1),
  ('77777777-7777-7777-7777-777777777772', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'SPY', 'Macro benchmark', 2)
on conflict (id) do nothing;

insert into public.trading_controls (scope_type, scope_id, is_trading_enabled, reason, updated_by)
values
  ('class', '33333333-3333-3333-3333-333333333333', true, 'Initial state', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (scope_type, scope_id) do update
set is_trading_enabled = excluded.is_trading_enabled,
    reason = excluded.reason,
    updated_by = excluded.updated_by,
    updated_at = timezone('utc', now());

insert into public.announcements (id, class_id, created_by, title, body)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Welcome to Stockify',
    'Competition is live. Remember: no short selling and keep risk controlled.'
  )
on conflict (id) do nothing;
