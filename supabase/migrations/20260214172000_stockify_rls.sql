-- Tenant + role helpers and RLS policies

create or replace function public.current_app_role()
returns public.app_role
language plpgsql
stable
as $$
declare
  v_role text;
begin
  v_role := coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );

  if v_role is null and auth.uid() is not null then
    select p.role::text into v_role
    from public.profiles p
    where p.user_id = auth.uid();
  end if;

  if v_role is null then
    return 'student'::public.app_role;
  end if;

  return v_role::public.app_role;
exception
  when others then
    return 'student'::public.app_role;
end;
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select p.org_id from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'platform_admin'::public.app_role;
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or (
      public.current_app_role() = 'org_admin'::public.app_role
      and public.current_org_id() = p_org_id
    );
$$;

create or replace function public.is_teacher_for_class(p_class_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.classes c
      where c.id = p_class_id
        and (
          (c.teacher_id = auth.uid() and public.current_app_role() in ('teacher', 'org_admin', 'platform_admin'))
          or public.is_org_admin(c.org_id)
        )
    );
$$;

create or replace function public.is_student_in_class(p_class_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.class_id = p_class_id
      and e.student_id = auth.uid()
      and e.status = 'active'
  );
$$;

create or replace function public.can_access_class(p_class_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_teacher_for_class(p_class_id)
    or public.is_student_in_class(p_class_id);
$$;

create or replace function public.can_access_account(p_account_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.trading_accounts a
    where a.id = p_account_id
      and (
        a.user_id = auth.uid()
        or public.is_teacher_for_class(a.class_id)
        or public.is_org_admin(a.org_id)
      )
  );
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select auth.role() = 'service_role';
$$;

create or replace function public.log_function_request(
  p_request_id uuid,
  p_user_id uuid,
  p_route text,
  p_status integer,
  p_latency_ms integer,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.function_logs (request_id, user_id, route, status, latency_ms, metadata_json)
  values (p_request_id, p_user_id, p_route, p_status, p_latency_ms, p_metadata);
$$;

create or replace function public.consume_rate_limit(
  p_user_id uuid,
  p_key text,
  p_capacity numeric,
  p_refill_per_sec numeric,
  p_cost numeric default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_tokens numeric;
  v_updated_at timestamptz;
  v_refilled numeric;
begin
  if p_capacity <= 0 or p_refill_per_sec < 0 or p_cost <= 0 then
    raise exception 'Invalid rate limit params';
  end if;

  insert into public.rate_limits (user_id, key, tokens, updated_at)
  values (p_user_id, p_key, p_capacity, v_now)
  on conflict (user_id, key) do nothing;

  select tokens, updated_at
  into v_tokens, v_updated_at
  from public.rate_limits
  where user_id = p_user_id and key = p_key
  for update;

  v_refilled := least(p_capacity, v_tokens + extract(epoch from (v_now - v_updated_at)) * p_refill_per_sec);

  if v_refilled < p_cost then
    update public.rate_limits
    set tokens = v_refilled,
        updated_at = v_now
    where user_id = p_user_id and key = p_key;
    return false;
  end if;

  update public.rate_limits
  set tokens = (v_refilled - p_cost),
      updated_at = v_now
  where user_id = p_user_id and key = p_key;

  return true;
end;
$$;

create or replace function public.emit_event(
  p_org_id uuid,
  p_class_id uuid,
  p_type text,
  p_entity_table text,
  p_entity_id uuid,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.events (org_id, class_id, type, entity_table, entity_id, payload_json)
  values (p_org_id, p_class_id, p_type, p_entity_table, p_entity_id, coalesce(p_payload, '{}'::jsonb));
$$;

-- RLS enablement (all tables)
alter table public.organizations enable row level security;
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.invitations enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.cash_ledger enable row level security;
alter table public.holdings_snapshot enable row level security;
alter table public.holding_lots enable row level security;
alter table public.orders enable row level security;
alter table public.fills enable row level security;
alter table public.reservations enable row level security;
alter table public.market_prices_latest enable row level security;
alter table public.market_bars_cache enable row level security;
alter table public.symbol_master enable row level security;
alter table public.job_queue enable row level security;
alter table public.events enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_accounts enable row level security;
alter table public.rule_violations enable row level security;
alter table public.performance_snapshots_daily enable row level security;
alter table public.risk_metrics enable row level security;
alter table public.leaderboard_cache enable row level security;
alter table public.reports_export_jobs enable row level security;
alter table public.teacher_actions_audit enable row level security;
alter table public.trading_controls enable row level security;
alter table public.announcements enable row level security;
alter table public.activity_flags enable row level security;
alter table public.special_permissions enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.featured_symbols enable row level security;
alter table public.symbol_aliases enable row level security;
alter table public.rate_limits enable row level security;
alter table public.function_logs enable row level security;

-- Base tenant policies
create policy organizations_select
on public.organizations
for select
using (
  public.is_platform_admin() or id = public.current_org_id()
);

create policy schools_select
on public.schools
for select
using (
  public.is_platform_admin() or public.is_org_admin(org_id) or org_id = public.current_org_id()
);

create policy profiles_select
on public.profiles
for select
using (
  user_id = auth.uid()
  or public.is_platform_admin()
  or public.is_org_admin(org_id)
  or exists (
    select 1
    from public.classes c
    join public.enrollments e on e.class_id = c.id
    where c.teacher_id = auth.uid()
      and e.student_id = profiles.user_id
      and e.status = 'active'
  )
);

create policy classes_select
on public.classes
for select
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
  or teacher_id = auth.uid()
  or public.is_student_in_class(id)
);

create policy enrollments_select
on public.enrollments
for select
using (
  student_id = auth.uid()
  or public.is_teacher_for_class(class_id)
);

create policy invitations_select
on public.invitations
for select
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
  or (class_id is not null and public.is_teacher_for_class(class_id))
);

create policy trading_accounts_select
on public.trading_accounts
for select
using (
  user_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or public.is_org_admin(org_id)
);

create policy cash_ledger_select
on public.cash_ledger
for select
using (public.can_access_account(account_id));

create policy holdings_snapshot_select
on public.holdings_snapshot
for select
using (public.can_access_account(account_id));

create policy holding_lots_select
on public.holding_lots
for select
using (public.can_access_account(account_id));

create policy orders_select
on public.orders
for select
using (public.can_access_account(account_id));

create policy fills_select
on public.fills
for select
using (public.can_access_account(account_id));

create policy reservations_select
on public.reservations
for select
using (public.can_access_account(account_id));

create policy market_prices_latest_select
on public.market_prices_latest
for select
using (auth.uid() is not null);

create policy market_bars_cache_select
on public.market_bars_cache
for select
using (auth.uid() is not null);

create policy symbol_master_select
on public.symbol_master
for select
using (auth.uid() is not null);

create policy symbol_aliases_select
on public.symbol_aliases
for select
using (auth.uid() is not null);

create policy competitions_select
on public.competitions
for select
using (public.can_access_class(class_id));

create policy competition_accounts_select
on public.competition_accounts
for select
using (
  exists (
    select 1
    from public.competitions c
    where c.id = competition_accounts.competition_id
      and public.can_access_class(c.class_id)
  )
);

create policy rule_violations_select
on public.rule_violations
for select
using (
  exists (
    select 1
    from public.competitions c
    where c.id = rule_violations.competition_id
      and public.can_access_class(c.class_id)
  )
);

create policy performance_snapshots_daily_select
on public.performance_snapshots_daily
for select
using (
  exists (
    select 1
    from public.competitions c
    where c.id = performance_snapshots_daily.competition_id
      and public.can_access_class(c.class_id)
  )
);

create policy risk_metrics_select
on public.risk_metrics
for select
using (
  exists (
    select 1
    from public.competitions c
    where c.id = risk_metrics.competition_id
      and public.can_access_class(c.class_id)
  )
);

create policy leaderboard_cache_select
on public.leaderboard_cache
for select
using (
  exists (
    select 1
    from public.competitions c
    where c.id = leaderboard_cache.competition_id
      and public.can_access_class(c.class_id)
  )
);

create policy reports_export_jobs_select
on public.reports_export_jobs
for select
using (
  requested_by = auth.uid()
  or (class_id is not null and public.is_teacher_for_class(class_id))
  or exists (
    select 1
    from public.classes c
    where c.id = reports_export_jobs.class_id
      and public.is_org_admin(c.org_id)
  )
);

create policy teacher_actions_audit_select
on public.teacher_actions_audit
for select
using (
  teacher_id = auth.uid()
  or public.is_teacher_for_class(class_id)
  or exists (
    select 1
    from public.classes c
    where c.id = teacher_actions_audit.class_id
      and public.is_org_admin(c.org_id)
  )
);

create policy trading_controls_select
on public.trading_controls
for select
using (
  (
    scope_type = 'class'
    and public.can_access_class(scope_id)
  )
  or (
    scope_type = 'account'
    and public.can_access_account(scope_id)
  )
);

create policy announcements_select
on public.announcements
for select
using (public.can_access_class(class_id));

create policy activity_flags_select
on public.activity_flags
for select
using (public.can_access_class(class_id));

create policy special_permissions_select
on public.special_permissions
for select
using (public.can_access_account(account_id));

create policy watchlists_select
on public.watchlists
for select
using (
  (owner_type = 'user' and owner_id = auth.uid())
  or (owner_type = 'class' and public.can_access_class(owner_id))
);

create policy watchlists_insert
on public.watchlists
for insert
with check (
  (
    owner_type = 'user'
    and owner_id = auth.uid()
    and created_by = auth.uid()
  )
  or (
    owner_type = 'class'
    and public.is_teacher_for_class(owner_id)
  )
);

create policy watchlists_update
on public.watchlists
for update
using (
  created_by = auth.uid()
  or (owner_type = 'class' and public.is_teacher_for_class(owner_id))
)
with check (
  created_by = auth.uid()
  or (owner_type = 'class' and public.is_teacher_for_class(owner_id))
);

create policy watchlists_delete
on public.watchlists
for delete
using (
  created_by = auth.uid()
  or (owner_type = 'class' and public.is_teacher_for_class(owner_id))
);

create policy watchlist_items_select
on public.watchlist_items
for select
using (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_items.watchlist_id
      and (
        (w.owner_type = 'user' and w.owner_id = auth.uid())
        or (w.owner_type = 'class' and public.can_access_class(w.owner_id))
      )
  )
);

create policy watchlist_items_insert
on public.watchlist_items
for insert
with check (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_items.watchlist_id
      and (
        (w.owner_type = 'user' and w.owner_id = auth.uid())
        or (w.owner_type = 'class' and public.is_teacher_for_class(w.owner_id))
      )
  )
);

create policy watchlist_items_delete
on public.watchlist_items
for delete
using (
  exists (
    select 1
    from public.watchlists w
    where w.id = watchlist_items.watchlist_id
      and (
        (w.owner_type = 'user' and w.owner_id = auth.uid())
        or (w.owner_type = 'class' and public.is_teacher_for_class(w.owner_id))
      )
  )
);

create policy featured_symbols_select
on public.featured_symbols
for select
using (
  (class_id is null and competition_id is null)
  or (class_id is not null and public.can_access_class(class_id))
  or (
    competition_id is not null and exists (
      select 1 from public.competitions c
      where c.id = featured_symbols.competition_id
        and public.can_access_class(c.class_id)
    )
  )
);

create policy events_select
on public.events
for select
using (
  public.is_platform_admin()
  or (public.current_app_role() = 'org_admin' and org_id = public.current_org_id())
  or (class_id is not null and public.can_access_class(class_id))
);

create policy announcements_insert
on public.announcements
for insert
with check (public.is_teacher_for_class(class_id));

create policy announcements_update
on public.announcements
for update
using (public.is_teacher_for_class(class_id))
with check (public.is_teacher_for_class(class_id));

create policy announcements_delete
on public.announcements
for delete
using (public.is_teacher_for_class(class_id));

create policy function_logs_select
on public.function_logs
for select
using (public.is_platform_admin());

create policy rate_limits_select
on public.rate_limits
for select
using (user_id = auth.uid() or public.is_platform_admin());

-- service-role only surfaces (no client policies for mutation; select denied unless policy exists)
-- job_queue intentionally has no select/insert/update/delete policies for authenticated users.
