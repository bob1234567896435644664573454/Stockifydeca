# Stockify Competition Day Runbook

This is the minimum set of actions to keep a live classroom competition stable under pressure.

Assumptions:
- You are using Edge Functions deployed with `--no-verify-jwt`.
- Auth is enforced inside functions via JWKS verification (`requireAuth`).
- Job runners are triggered by pg_cron schedules (and can be manually invoked).

## Immediate Actions

Freeze trading for a whole class:
- `POST /functions/v1/teacher-console/freeze`
- Body:
  - `scope_type`: `"class"`
  - `scope_id`: `<class_id>`
  - `is_trading_enabled`: `false`
  - `reason`: `"incident: <short reason>"`

Freeze trading for one account:
- Same endpoint, but `scope_type: "account"`, `scope_id: <account_id>`

Pause all automated jobs (incident mode):
- `POST /functions/v1/teacher-console/incident_mode`
- Body: `{ "paused": true, "reason": "incident: <short reason>" }`

Unpause jobs:
- Same endpoint with `{ "paused": false }`

## Check System Health

1) Cron schedules + recent runs (remote DB):
- Call RPC `public.get_cron_status(p_limit := 20)` using the service role key.
- Expected:
  - `stockify_engine_tick` runs every minute (cron granularity is 1 minute).
  - `stockify_market_data` runs every minute.
  - `stockify_report_jobs` runs every minute.
  - `stockify_competition_jobs` runs nightly.

2) Function-level logs:
- Query `public.function_logs` (service role) ordered by `created_at desc`.
- Look for spikes in `status >= 400` on:
  - `trade/*` (student traffic)
  - `engine-tick/`, `market-data/`, `report-jobs/` (system traffic)

3) Data freshness:
- `market_prices_latest.ts` should be recent for actively traded symbols.
- If prices are stale, consider pausing fills (incident mode) to preserve fairness.

## Manual “Kick” Operations

Manually invoke the broker engine tick:
- `POST /functions/v1/engine-tick`
- Header: `x-engine-key: <ENGINE_JOB_KEY>`

Manually invoke report worker (exports):
- `POST /functions/v1/report-jobs`
- Header: `x-report-key: <REPORT_JOBS_KEY>`

Manually invoke market data sync:
- `POST /functions/v1/market-data`
- Header: `x-market-key: <MARKET_DATA_JOB_KEY>`

## Exports (Teacher)

1) Request export:
- `POST /functions/v1/teacher-console/exports/request`

2) Poll until ready:
- `GET /functions/v1/teacher-console/exports/download?job_id=<id>`
- When ready, you receive a `signed_url`.

## Recovery / Debug

If holdings look wrong (admin-only tooling):
- Run `recompute_holdings_from_fills(account_id)` (service-role only).

If a competition needs a rules hotfix:
- `POST /functions/v1/teacher-console/competition/upsert_rules` (audited)

If job schedules need to be reinstalled:
- Call `public.setup_stockify_schedules(...)` using the service role key.

