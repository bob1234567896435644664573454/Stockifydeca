# Stockify Supabase Backend

Production-grade backend for a multi-tenant school trading competition platform with an **internal simulation broker engine only**.

## Tech
- Supabase Postgres + Auth + Storage + Realtime + Edge Functions
- Strict multi-tenant RLS (org -> school -> class)
- SQL RPCs for atomic trading/accounting
- Edge functions for authz, route contracts, and job orchestration

## Structure
- `supabase/migrations/` schema, RLS, RPC, jobs, realtime publication, storage bucket
- `supabase/seed.sql` demo org/users/class/accounts/competition/symbols
- `supabase/functions/` edge function APIs
- `supabase/tests/stockify_backend_tests.sql` backend integration assertions

## Local setup
1. Install Supabase CLI.
2. Start local stack:
```bash
supabase start --exclude logflare,vector --ignore-health-check
```
3. Apply migrations + seed:
```bash
supabase db reset
```
4. Serve edge functions:
```bash
supabase functions serve --no-verify-jwt --env-file .env
```
Notes:
- Supabase Edge Runtime does **not** load env vars prefixed with `SUPABASE_` when serving functions locally. Use the `SB_URL` / `SB_ANON_KEY` / `SB_SERVICE_ROLE_KEY` duplicates in `.env` (see `.env.example`).
- The functions verify JWTs **inside** the function via JWKS (`supabase/functions/_shared/auth.ts`), so local serve and remote deploy should use `--no-verify-jwt`.
5. Run tests:
```bash
DB_URL=$(supabase status -o env | sed -n 's/^DB_URL="\([^"]*\)"/\1/p')
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/stockify_backend_tests.sql
```

## Env vars
Use `.env.example`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SB_URL` / `SB_ANON_KEY` / `SB_SERVICE_ROLE_KEY` (supported for local `functions serve`)
- `SB_JWT_ISSUER` (optional; set to `http://127.0.0.1:54321/auth/v1` for local JWT verification)
- `MARKET_DATA_API_KEY`
- `ALPACA_KEY`
- `ALPACA_SECRET`
- `ENGINE_TICK_INTERVAL_SECONDS`
- `DEFAULT_SLIPPAGE_BPS`
- `DEFAULT_FEE_BPS`
- `ENGINE_JOB_KEY` (optional guard for scheduled engine runner)
- `ENGINE_JOB_KEY_PREVIOUS` (optional short overlap key during rotation)
- `COMPETITION_JOBS_KEY` (optional guard for nightly jobs)

## Required RPCs
- `place_order(p_account_id, p_payload_json, p_client_request_id)`
- `cancel_order(p_order_id)`
- `compute_account_equity(p_account_id, p_as_of_ts)`
- `recompute_holdings_from_fills(p_account_id)`

Mutating RPCs are `SECURITY DEFINER`, service-role guarded, and intended to be called only by Edge Functions.

## Edge Functions

### Org / school / class / users
Functions:
- `org`: `POST /create`
- `school`: `POST /create`
- `class`: `POST /create`, `POST /rotate_join_code`, `POST /join_via_code`
- `user`: `POST /invite`, `POST /role_update`

### Trading
Function: `trade`
- `POST /place`
- `POST /cancel`
- `GET /orders?account_id=...&page=1&page_size=25`
- `GET /fills?account_id=...&page=1&page_size=25`
- `GET /positions?account_id=...`
- `GET /equity?account_id=...&as_of_ts=...`

Example place order payload:
```json
{
  "account_id": "44444444-4444-4444-4444-444444444441",
  "client_request_id": "req-123",
  "payload": {
    "symbol": "AAPL",
    "side": "buy",
    "qty": 10,
    "order_type": "limit",
    "limit_price": 180,
    "tif": "day",
    "competition_id": "55555555-5555-5555-5555-555555555555"
  }
}
```

### Teacher console
Function: `teacher-console`
- `GET /roster?class_id=...`
- `POST /freeze`
- `POST /competition/upsert_rules`
- `POST /account/reset`
- `POST /announcements/create`
- `GET /signals?class_id=...`
- `POST /permissions/grant`
- `POST /exports/request`
- `GET /exports/download?job_id=...`
- `GET /leaderboard?competition_id=...&date=YYYY-MM-DD&mode=risk_adjusted`

Example freeze payload:
```json
{
  "scope_type": "class",
  "scope_id": "33333333-3333-3333-3333-333333333333",
  "is_trading_enabled": false,
  "reason": "Exam window"
}
```

### Symbols + TradingView context
Functions:
- `symbols`: `GET /search`, `GET /featured`
- `watchlists`: `GET /`, `POST /create`, `POST /add_item`, `POST /remove_item`
- `charts`: `GET /context`
- `GET /symbols/search?q=AAP`
- `GET /symbols/featured?competition_id=...`
- `GET /watchlists`
- `POST /watchlists/create`
- `POST /watchlists/add_item`
- `POST /watchlists/remove_item`
- `GET /charts/context?symbol=AAPL&competition_id=...`

`/charts/context` response contains:
- `tradingview_symbol` mapping from `symbol_aliases`
- competition-relevant chart rules (delay, allowed trading)
- overlays (fills, avg_cost, current position, day P&L)

## Job runners
### Engine tick
Function: `engine-tick`
- `POST /` with optional `{ "max_orders": 200, "max_jobs": 50 }`
- Calls `broker_engine_tick` and `process_due_jobs`
- Requires `x-engine-key` server-side key; no user-auth fallback.

### Nightly jobs
Function: `competition-jobs`
- `POST /` with optional `{ "date": "YYYY-MM-DD", "mode": "risk_adjusted" }`
- Runs daily snapshot + leaderboard refresh for active competitions

### Report export worker
Function: `report-jobs`
- `POST /` with optional `{ "max_jobs": 10 }`
- Claims queued export jobs, builds CSV, uploads to storage, and applies retry/dead-letter behavior.

### Market data worker (Alpaca + Yahoo fallback)
Function: `market-data`
- `POST /` with optional `{ "symbols": ["AAPL","MSFT"], "limit": 250 }`
- Pulls latest price/bar from Alpaca first; falls back to Yahoo Finance when Alpaca fails.

Suggested schedules:
- Engine tick every `ENGINE_TICK_INTERVAL_SECONDS`
- Nightly jobs once daily after market close (or school timezone cutoff)
- Report jobs every minute
- Market data sync every minute

Job runner auth (recommended):
- `engine-tick`: `x-engine-key: $ENGINE_JOB_KEY`
- `competition-jobs`: `x-jobs-key: $COMPETITION_JOBS_KEY`
- `report-jobs`: `x-report-key: $REPORT_JOBS_KEY`
- `market-data`: `x-market-key: $MARKET_DATA_JOB_KEY`

You can install default pg_cron schedules by calling:
```sql
select public.setup_stockify_schedules(
  'lbdmxtssrnflfawsccow',
  '<ENGINE_JOB_KEY>',
  '<COMPETITION_JOBS_KEY>',
  '<REPORT_JOBS_KEY>',
  '<MARKET_DATA_JOB_KEY>',
  5
);
```

To confirm schedules are running on a project, run in the SQL editor (service role):
```sql
select public.get_cron_status(20);
```

## Remote E2E Harness (Browser-Based)
This repo includes a real-browser harness that validates CORS + JWT + Realtime + storage signed URLs against a live project:
- `e2e/frontend-harness/index.html`
- Artifacts (example): `output/playwright/remote_e2e_results.json`

Run locally:
```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory e2e/frontend-harness
```
Open `http://127.0.0.1:4173/`, then set config in the browser console:
```js
window.setStockifyE2EConfig({
  supabaseUrl: "https://<project-ref>.supabase.co",
  anonKey: "<anon key>",
  classId: "33333333-3333-3333-3333-333333333333",
  competitionId: "55555555-5555-5555-5555-555555555555",
  studentAccountId: "44444444-4444-4444-4444-444444444441",
  otherStudentAccountId: "44444444-4444-4444-4444-444444444442",
});
```
Click “Run Remote E2E”.

## Realtime
Subscribe to `public.events` channel for:
- `order.created`, `order.updated`, `order.canceled`, `order.expired`
- `fill.created`
- `announcement.created`
- `trading_control.updated`

`orders`, `fills`, `announcements`, `trading_controls`, and `events` are added to realtime publication.

## Seed users
From `supabase/seed.sql`:
- platform admin: `platform-admin@stockify.dev`
- org admin: `org-admin@stockify.dev`
- teacher: `teacher@stockify.dev`
- student 1: `student1@stockify.dev`
- student 2: `student2@stockify.dev`
- password: `Password123!` (demo only)

## Notes
- Money is `NUMERIC(18,6)` everywhere (no float accounting).
- Buy orders reserve cash; sell orders reserve shares.
- FIFO lots are maintained for realized P&L realism.
- This backend supports TradingView embed widgets via symbol mapping and overlay context. It does **not** implement TradingView proprietary chart datafeed APIs.
- Market data worker uses `ALPACA_KEY`/`ALPACA_SECRET` from env (Supabase secrets) when available and falls back to Yahoo Finance.
- Competition-day runbook: `docs/competition-day-runbook.md`

## CI Deploy
GitHub Actions workflow: `.github/workflows/supabase-deploy.yml`

It runs on push to `main` (for Supabase files) and `workflow_dispatch`, and performs:
1. `supabase db push --linked`
2. `supabase functions deploy ... --no-verify-jwt`

Required repository secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
