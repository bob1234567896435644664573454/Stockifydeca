-- Service-only helper to inspect pg_cron schedules and recent run details.

create or replace function public.get_cron_status(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jobs jsonb;
  v_runs jsonb;
begin
  if not public.is_service_role() then
    raise exception 'get_cron_status is service-only';
  end if;

  select coalesce(jsonb_agg(to_jsonb(j) order by j.jobid desc), '[]'::jsonb)
    into v_jobs
  from cron.job j;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.start_time desc), '[]'::jsonb)
    into v_runs
  from (
    select *
    from cron.job_run_details
    order by start_time desc
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) r;

  return jsonb_build_object('jobs', v_jobs, 'runs', v_runs);
end;
$$;

revoke all on function public.get_cron_status(integer) from public, anon;
grant execute on function public.get_cron_status(integer) to service_role;

