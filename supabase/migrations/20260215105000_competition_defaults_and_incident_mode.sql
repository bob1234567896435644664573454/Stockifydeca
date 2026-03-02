-- Competition defaults + incident mode controls

create or replace function public.default_competition_rules()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'starting_cash', 100000,
    'allowed_asset_types', jsonb_build_array('stock', 'etf'),
    'allowed_symbols', jsonb_build_array(),
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
    'market_hours_mode', 'strict',
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
  );
$$;

alter table public.competitions
  alter column rules_json set default public.default_competition_rules();

with d as (
  select public.default_competition_rules() as rules
)
update public.competitions c
set rules_json = jsonb_set(
  jsonb_set(
    d.rules || coalesce(c.rules_json, '{}'::jsonb),
    '{slippage_model}',
    coalesce(d.rules -> 'slippage_model', '{}'::jsonb)
      || coalesce(c.rules_json -> 'slippage_model', '{}'::jsonb),
    true
  ),
  '{fee_model}',
  coalesce(d.rules -> 'fee_model', '{}'::jsonb)
    || coalesce(c.rules_json -> 'fee_model', '{}'::jsonb),
  true
)
from d;

create table if not exists public.system_controls (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(user_id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_system_controls_set_updated_at
before update on public.system_controls
for each row execute function public.set_updated_at();

insert into public.system_controls (key, value_json)
values (
  'incident_mode',
  jsonb_build_object('paused', false, 'reason', '', 'updated_at', timezone('utc', now()))
)
on conflict (key) do nothing;

create or replace function public.get_incident_mode()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select sc.value_json from public.system_controls sc where sc.key = 'incident_mode'),
    jsonb_build_object('paused', false, 'reason', '')
  );
$$;

create or replace function public.is_incident_mode_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.get_incident_mode() ->> 'paused')::boolean, false);
$$;

alter table public.system_controls enable row level security;

create policy system_controls_select
on public.system_controls
for select
using (
  public.current_app_role() in ('platform_admin', 'org_admin', 'teacher')
);

create policy system_controls_modify_platform
on public.system_controls
for all
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

revoke all on function public.default_competition_rules() from public, anon;
revoke all on function public.get_incident_mode() from public, anon;
revoke all on function public.is_incident_mode_paused() from public, anon;

grant execute on function public.default_competition_rules() to authenticated;
grant execute on function public.default_competition_rules() to service_role;
grant execute on function public.get_incident_mode() to authenticated;
grant execute on function public.get_incident_mode() to service_role;
grant execute on function public.is_incident_mode_paused() to authenticated;
grant execute on function public.is_incident_mode_paused() to service_role;
