-- Demo-friendly defaults: allow relaxed market hours by default.
-- Teachers can still set `market_hours_mode` to 'strict' per competition.

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
  );
$$;

alter table public.competitions
  alter column rules_json set default public.default_competition_rules();

-- If the competition is still strict, flip to relaxed for a smoother demo experience.
update public.competitions
set rules_json = jsonb_set(rules_json, '{market_hours_mode}', to_jsonb('relaxed'::text), true)
where coalesce(rules_json ->> 'market_hours_mode', 'strict') = 'strict';

