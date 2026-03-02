-- Stockify core schema
create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('platform_admin', 'org_admin', 'teacher', 'student');
create type public.order_side as enum ('buy', 'sell');
create type public.order_type_enum as enum ('market', 'limit', 'stop', 'stop_limit');
create type public.tif_enum as enum ('day', 'gtc', 'ioc', 'fok');
create type public.order_status_enum as enum (
  'pending',
  'open',
  'partially_filled',
  'filled',
  'canceled',
  'rejected',
  'expired'
);
create type public.reservation_resource_type as enum ('cash', 'shares');
create type public.scope_type_enum as enum ('class', 'account');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'student',
  org_id uuid references public.organizations(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(user_id) on delete restrict,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  unique (class_id, student_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  email citext not null,
  role public.app_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  base_currency text not null default 'USD',
  starting_cash numeric(18,6) not null check (starting_cash >= 0),
  cash_balance numeric(18,6) not null,
  status text not null default 'active',
  is_frozen boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, class_id)
);

create table public.cash_ledger (
  id bigserial primary key,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  ts timestamptz not null default timezone('utc', now()),
  entry_type text not null,
  amount numeric(18,6) not null,
  currency text not null default 'USD',
  ref_table text,
  ref_id uuid,
  memo text,
  balance_after numeric(18,6) not null
);

create table public.holdings_snapshot (
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  symbol text not null,
  qty numeric(18,6) not null default 0,
  avg_cost numeric(18,6) not null default 0,
  realized_pnl numeric(18,6) not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (account_id, symbol)
);

create table public.holding_lots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  symbol text not null,
  qty numeric(18,6) not null check (qty >= 0),
  cost_basis numeric(18,6) not null check (cost_basis >= 0),
  acquired_at timestamptz not null default timezone('utc', now()),
  fill_id uuid
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  symbol text not null,
  side public.order_side not null,
  qty numeric(18,6) not null check (qty > 0),
  filled_qty numeric(18,6) not null default 0 check (filled_qty >= 0),
  order_type public.order_type_enum not null,
  limit_price numeric(18,6),
  stop_price numeric(18,6),
  tif public.tif_enum not null default 'day',
  status public.order_status_enum not null default 'pending',
  client_request_id text not null,
  placed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  rejection_reason text,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (account_id, client_request_id)
);

create table public.fills (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  symbol text not null,
  qty numeric(18,6) not null check (qty > 0),
  price numeric(18,6) not null check (price > 0),
  fees numeric(18,6) not null default 0,
  slippage numeric(18,6) not null default 0,
  filled_at timestamptz not null default timezone('utc', now())
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  resource_type public.reservation_resource_type not null,
  symbol text,
  amount numeric(18,6) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  ref_order_id uuid not null references public.orders(id) on delete cascade
);

create table public.market_prices_latest (
  symbol text primary key,
  ts timestamptz not null,
  price numeric(18,6) not null check (price > 0),
  source text not null
);

create table public.market_bars_cache (
  symbol text not null,
  timeframe text not null,
  ts timestamptz not null,
  o numeric(18,6) not null,
  h numeric(18,6) not null,
  l numeric(18,6) not null,
  c numeric(18,6) not null,
  v numeric(18,6) not null,
  primary key (symbol, timeframe, ts)
);

create table public.symbol_master (
  symbol text primary key,
  name text not null,
  exchange text not null,
  asset_type text not null default 'stock',
  is_active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.job_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  next_run_at timestamptz not null default timezone('utc', now()),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.events (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  type text not null,
  entity_table text not null,
  entity_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  payload_json jsonb not null default '{}'::jsonb
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.competition_accounts (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (competition_id, account_id)
);

create table public.rule_violations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  rule_key text not null,
  severity text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table public.performance_snapshots_daily (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  date date not null,
  equity numeric(18,6) not null,
  cash numeric(18,6) not null,
  pnl_day numeric(18,6) not null,
  pnl_total numeric(18,6) not null,
  return_pct numeric(18,6) not null,
  drawdown_pct numeric(18,6) not null,
  primary key (competition_id, account_id, date)
);

create table public.risk_metrics (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  date date not null,
  volatility numeric(18,6) not null,
  sharpe_proxy numeric(18,6) not null,
  max_drawdown numeric(18,6) not null,
  win_rate numeric(18,6) not null,
  avg_hold_time numeric(18,6) not null,
  primary key (competition_id, account_id, date)
);

create table public.leaderboard_cache (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  date date not null,
  rank integer not null,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  score numeric(18,6) not null,
  equity numeric(18,6) not null,
  return_pct numeric(18,6) not null,
  risk_adjusted_score numeric(18,6) not null,
  primary key (competition_id, date, account_id)
);

create table public.reports_export_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(user_id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  type text not null,
  status text not null default 'queued',
  storage_path text,
  filters_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.teacher_actions_audit (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(user_id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  action_type text not null,
  target_user_id uuid references public.profiles(user_id) on delete set null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.trading_controls (
  scope_type public.scope_type_enum not null,
  scope_id uuid not null,
  is_trading_enabled boolean not null default true,
  reason text,
  updated_by uuid not null references public.profiles(user_id) on delete cascade,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope_type, scope_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.activity_flags (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  flag_type text not null,
  severity text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.special_permissions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  permission_key text not null,
  symbol text,
  granted_by uuid not null references public.profiles(user_id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (account_id, permission_key, symbol)
);

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'class')),
  owner_id uuid not null,
  name text not null,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.watchlist_items (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  symbol text not null,
  added_at timestamptz not null default timezone('utc', now()),
  primary key (watchlist_id, symbol)
);

create table public.featured_symbols (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  symbol text not null,
  reason text,
  rank integer not null default 100,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.symbol_aliases (
  symbol text primary key references public.symbol_master(symbol) on delete cascade,
  tradingview_symbol text not null,
  primary_exchange text,
  metadata_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.rate_limits (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  key text not null,
  tokens numeric(18,6) not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, key)
);

create table public.function_logs (
  id bigserial primary key,
  request_id uuid not null,
  user_id uuid,
  route text not null,
  status integer not null,
  latency_ms integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  metadata_json jsonb not null default '{}'::jsonb
);

create index idx_schools_org_id on public.schools (org_id);
create index idx_profiles_org_id on public.profiles (org_id);
create index idx_classes_org_id on public.classes (org_id);
create index idx_classes_school_id on public.classes (school_id);
create index idx_classes_teacher_id on public.classes (teacher_id);
create index idx_enrollments_student on public.enrollments (student_id);
create index idx_invitations_org on public.invitations (org_id);
create index idx_invitations_class on public.invitations (class_id);

create index idx_accounts_org on public.trading_accounts (org_id);
create index idx_accounts_class on public.trading_accounts (class_id);
create index idx_accounts_user on public.trading_accounts (user_id);
create index idx_cash_ledger_account_ts on public.cash_ledger (account_id, ts desc);
create index idx_holdings_symbol on public.holdings_snapshot (symbol);
create index idx_lots_account_symbol on public.holding_lots (account_id, symbol, acquired_at);
create index idx_orders_account on public.orders (account_id, placed_at desc);
create index idx_orders_status on public.orders (status, placed_at);
create index idx_orders_symbol_status on public.orders (symbol, status);
create index idx_fills_account_ts on public.fills (account_id, filled_at desc);
create index idx_fills_order on public.fills (order_id);
create index idx_reservations_account_open on public.reservations (account_id) where released_at is null;

create index idx_market_bars_symbol_tf_ts on public.market_bars_cache (symbol, timeframe, ts desc);
create index idx_symbol_master_active on public.symbol_master (is_active);

create index idx_job_queue_status_run on public.job_queue (status, next_run_at);
create index idx_events_org_class_created on public.events (org_id, class_id, created_at desc);

create index idx_competitions_class on public.competitions (class_id, status);
create index idx_comp_accounts_account on public.competition_accounts (account_id);
create index idx_rule_violations_comp_account on public.rule_violations (competition_id, account_id, created_at desc);
create index idx_perf_snapshots_comp_date on public.performance_snapshots_daily (competition_id, date desc);
create index idx_risk_metrics_comp_date on public.risk_metrics (competition_id, date desc);
create index idx_leaderboard_comp_date_rank on public.leaderboard_cache (competition_id, date desc, rank);

create index idx_reports_jobs_scope on public.reports_export_jobs (class_id, competition_id, created_at desc);
create index idx_teacher_audit_class_created on public.teacher_actions_audit (class_id, created_at desc);
create index idx_announcements_class_created on public.announcements (class_id, created_at desc);
create index idx_activity_flags_class_account on public.activity_flags (class_id, account_id, created_at desc);
create index idx_special_permissions_account on public.special_permissions (account_id, permission_key);

create index idx_watchlists_owner on public.watchlists (owner_type, owner_id);
create index idx_watchlist_items_symbol on public.watchlist_items (symbol);
create index idx_featured_symbols_scope on public.featured_symbols (class_id, competition_id, rank);
create index idx_rate_limits_updated on public.rate_limits (updated_at);
create index idx_function_logs_route_time on public.function_logs (route, created_at desc);

create trigger trg_accounts_set_updated_at
before update on public.trading_accounts
for each row execute function public.set_updated_at();

create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger trg_job_queue_set_updated_at
before update on public.job_queue
for each row execute function public.set_updated_at();

create trigger trg_competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create trigger trg_reports_export_jobs_set_updated_at
before update on public.reports_export_jobs
for each row execute function public.set_updated_at();
