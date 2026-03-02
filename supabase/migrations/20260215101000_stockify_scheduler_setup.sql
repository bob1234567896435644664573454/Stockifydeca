-- Scheduler helpers for Edge Function cron jobs

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.setup_stockify_schedules(
  p_project_ref text,
  p_engine_job_key text,
  p_competition_jobs_key text,
  p_report_jobs_key text,
  p_market_data_job_key text,
  p_engine_interval_seconds integer default 5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text;
  v_engine_cron text;
  v_engine_minutes integer;
begin
  if not public.is_service_role() then
    raise exception 'setup_stockify_schedules is service-only';
  end if;

  if p_project_ref is null or length(trim(p_project_ref)) = 0 then
    raise exception 'project ref is required';
  end if;

  v_base_url := format('https://%s.supabase.co/functions/v1', trim(p_project_ref));
  v_engine_minutes := greatest(1, ceil(greatest(1, p_engine_interval_seconds)::numeric / 60)::int);
  v_engine_cron := format('*/%s * * * *', v_engine_minutes);

  begin perform extensions.cron.unschedule('stockify_engine_tick'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_competition_jobs'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_report_jobs'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_market_data'); exception when others then null; end;

  perform extensions.cron.schedule(
    'stockify_engine_tick',
    v_engine_cron,
    format($f$
      select extensions.net.http_post(
        url := '%s/engine-tick',
        headers := '{"Content-Type":"application/json","x-engine-key":"%s"}'::jsonb,
        body := '{"max_orders":300,"max_jobs":100}'::jsonb
      );
    $f$, v_base_url, p_engine_job_key)
  );

  perform extensions.cron.schedule(
    'stockify_competition_jobs',
    '0 22 * * *',
    format($f$
      select extensions.net.http_post(
        url := '%s/competition-jobs',
        headers := '{"Content-Type":"application/json","x-jobs-key":"%s"}'::jsonb,
        body := '{"mode":"risk_adjusted"}'::jsonb
      );
    $f$, v_base_url, p_competition_jobs_key)
  );

  perform extensions.cron.schedule(
    'stockify_report_jobs',
    '*/1 * * * *',
    format($f$
      select extensions.net.http_post(
        url := '%s/report-jobs',
        headers := '{"Content-Type":"application/json","x-report-key":"%s"}'::jsonb,
        body := '{"max_jobs":25}'::jsonb
      );
    $f$, v_base_url, p_report_jobs_key)
  );

  perform extensions.cron.schedule(
    'stockify_market_data',
    '*/1 * * * *',
    format($f$
      select extensions.net.http_post(
        url := '%s/market-data',
        headers := '{"Content-Type":"application/json","x-market-key":"%s"}'::jsonb,
        body := '{"limit":400}'::jsonb
      );
    $f$, v_base_url, p_market_data_job_key)
  );
end;
$$;

create or replace function public.remove_stockify_schedules()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_role() then
    raise exception 'remove_stockify_schedules is service-only';
  end if;

  begin perform extensions.cron.unschedule('stockify_engine_tick'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_competition_jobs'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_report_jobs'); exception when others then null; end;
  begin perform extensions.cron.unschedule('stockify_market_data'); exception when others then null; end;
end;
$$;

revoke all on function public.setup_stockify_schedules(text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.remove_stockify_schedules() from public, anon, authenticated;
grant execute on function public.setup_stockify_schedules(text, text, text, text, text, integer) to service_role;
grant execute on function public.remove_stockify_schedules() to service_role;
