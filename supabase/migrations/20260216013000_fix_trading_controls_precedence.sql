-- Fix trading_controls precedence: class-level disable must override account-level enable.

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
    select tc.is_trading_enabled as enabled
    from public.trading_controls tc
    join acc on tc.scope_type = 'class' and tc.scope_id = acc.class_id
    limit 1
  ),
  account_control as (
    select tc.is_trading_enabled as enabled
    from public.trading_controls tc
    join acc on tc.scope_type = 'account' and tc.scope_id = acc.id
    limit 1
  )
  select
    case
      when not exists (select 1 from acc) then false
      when (select is_frozen from acc) then false
      else coalesce((select enabled from class_control), true)
        and coalesce((select enabled from account_control), true)
    end;
$$;

