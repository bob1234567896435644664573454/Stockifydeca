-- Hardening constraints + report job retry/dead-letter support

alter table public.competitions
  add constraint competitions_status_chk
  check (status in ('draft', 'active', 'paused', 'completed', 'archived'));

alter table public.reports_export_jobs
  add constraint reports_export_jobs_status_chk
  check (status in ('queued', 'running', 'retry', 'done', 'failed', 'dead_letter'));

alter table public.reports_export_jobs
  add constraint reports_export_jobs_type_chk
  check (type in ('trades_orders_fills', 'equity_curve', 'violations_log', 'holdings_end_period'));

alter table public.reports_export_jobs
  add column if not exists attempts integer not null default 0,
  add column if not exists next_run_at timestamptz not null default timezone('utc', now()),
  add column if not exists last_error text;

create index if not exists idx_reports_export_jobs_status_run
  on public.reports_export_jobs (status, next_run_at);

create table if not exists public.dead_letter_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  source_table text not null,
  source_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  error_text text not null,
  attempts integer not null default 0,
  failed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_dead_letter_jobs_failed_at
  on public.dead_letter_jobs (failed_at desc);

alter table public.dead_letter_jobs enable row level security;

create policy dead_letter_jobs_select
on public.dead_letter_jobs
for select
using (
  public.is_platform_admin()
  or public.current_app_role() = 'org_admin'
);

create or replace function public.claim_report_jobs(p_limit integer default 10)
returns setof public.reports_export_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_role() then
    raise exception 'claim_report_jobs is service-only';
  end if;

  return query
  with picked as (
    select r.id
    from public.reports_export_jobs r
    where r.status in ('queued', 'retry')
      and r.next_run_at <= timezone('utc', now())
    order by r.next_run_at
    limit p_limit
    for update skip locked
  )
  update public.reports_export_jobs r
  set status = 'running',
      attempts = r.attempts + 1,
      updated_at = timezone('utc', now())
  where r.id in (select p.id from picked p)
  returning r.*;
end;
$$;

create or replace function public.fail_report_job(
  p_job_id uuid,
  p_error text
)
returns public.reports_export_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.reports_export_jobs%rowtype;
  v_next_status text;
  v_next_run timestamptz;
begin
  if not public.is_service_role() then
    raise exception 'fail_report_job is service-only';
  end if;

  select * into v_job
  from public.reports_export_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'report job not found';
  end if;

  if v_job.attempts >= 5 then
    v_next_status := 'dead_letter';
  else
    v_next_status := 'retry';
  end if;

  v_next_run := timezone('utc', now()) + (interval '30 seconds' * greatest(1, v_job.attempts));

  update public.reports_export_jobs
  set status = v_next_status,
      last_error = left(coalesce(p_error, 'unknown error'), 2000),
      next_run_at = v_next_run,
      updated_at = timezone('utc', now())
  where id = p_job_id
  returning * into v_job;

  if v_next_status = 'dead_letter' then
    insert into public.dead_letter_jobs (
      job_type,
      source_table,
      source_id,
      payload_json,
      error_text,
      attempts
    )
    values (
      'report_export',
      'reports_export_jobs',
      v_job.id,
      jsonb_build_object(
        'requested_by', v_job.requested_by,
        'class_id', v_job.class_id,
        'competition_id', v_job.competition_id,
        'type', v_job.type,
        'filters_json', v_job.filters_json
      ),
      left(coalesce(p_error, 'unknown error'), 3000),
      v_job.attempts
    );
  end if;

  return v_job;
end;
$$;

create or replace function public.complete_report_job(
  p_job_id uuid,
  p_storage_path text
)
returns public.reports_export_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.reports_export_jobs%rowtype;
begin
  if not public.is_service_role() then
    raise exception 'complete_report_job is service-only';
  end if;

  update public.reports_export_jobs
  set status = 'done',
      storage_path = p_storage_path,
      last_error = null,
      updated_at = timezone('utc', now())
  where id = p_job_id
  returning * into v_job;

  if not found then
    raise exception 'report job not found';
  end if;

  return v_job;
end;
$$;

revoke all on function public.claim_report_jobs(integer) from public, anon, authenticated;
revoke all on function public.fail_report_job(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_report_job(uuid, text) from public, anon, authenticated;

grant execute on function public.claim_report_jobs(integer) to service_role;
grant execute on function public.fail_report_job(uuid, text) to service_role;
grant execute on function public.complete_report_job(uuid, text) to service_role;

create or replace function public.record_dead_letter(
  p_job_type text,
  p_source_table text,
  p_source_id uuid,
  p_payload jsonb,
  p_error text,
  p_attempts integer default 0
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.dead_letter_jobs (
    job_type,
    source_table,
    source_id,
    payload_json,
    error_text,
    attempts
  )
  values (
    p_job_type,
    p_source_table,
    p_source_id,
    coalesce(p_payload, '{}'::jsonb),
    left(coalesce(p_error, 'unknown error'), 3000),
    coalesce(p_attempts, 0)
  );
$$;

revoke all on function public.record_dead_letter(text, text, uuid, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.record_dead_letter(text, text, uuid, jsonb, text, integer) to service_role;
