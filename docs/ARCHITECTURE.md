# Stockify Architecture

> Auto-generated 2026-03-01.  Derived from repo inspection; kept up-to-date with major changes.

## 1  Monorepo Layout

```
deca/
├── web/                  # Vite + React + TypeScript frontend
├── supabase/             # Postgres migrations, RLS, RPCs, Edge Functions
├── e2e/                  # Remote browser E2E harness (Playwright)
├── docs/                 # This file, PRODUCT_GAPS, runbooks
├── scripts/              # Dev helper scripts
└── .github/workflows/    # CI/CD (supabase-deploy.yml)
```

## 2  Frontend (`web/`)

### 2.1  Entry & Provider Chain

`main.tsx` mounts the following provider tree:

```
StrictMode
 └─ ErrorBoundary
     └─ QueryClientProvider (TanStack Query, staleTime=60s, retry=1)
         └─ ThemeProvider (dark/light/system)
             └─ AuthProvider (Supabase session context)
                 └─ RealtimeProvider (event‑bus WebSocket)
                     └─ RouterProvider (TanStack Router)
```

### 2.2  Routing & RBAC

| Guard Layer         | File                | Logic |
|---------------------|---------------------|-------|
| `authenticatedRoute`| `router.tsx`        | Redirects to `/auth` if no Supabase session |
| `studentLayoutRoute`| `router.tsx`        | Redirects teachers/admins → `/teacher` |
| `teacherLayoutRoute`| `router.tsx`        | Redirects students → `/student` |
| `indexRoute` (`/`)  | `router.tsx`        | Reads `app_metadata.role`, dispatches to correct home |

**Student routes:** `/student`, `/student/trade/$symbol`, `/student/portfolio`, `/student/leaderboard`, `/student/learn`, `/student/journal`, `/student/challenges`

**Teacher routes:** `/teacher`, `/teacher/class/$classId`

**Public routes:** `/auth` (login/signup)

### 2.3  Data Access

| Layer | Module | Purpose |
|-------|--------|---------|
| API client | `lib/api.ts` | Singleton `ApiClient`: attaches JWT, targets Edge Functions. `get`/`post`/`getParsed`/`postParsed` with Zod validation. |
| Direct Supabase | `hooks/useActiveAccount.ts`, student hooks | RLS-protected `select` for low-latency reads (account, equity history, competitions). |
| Query Keys | `lib/queryKeys.ts` | Canonical TanStack Query key registry. |
| Refresh | `lib/portfolio-refresh.ts` | `refreshStudentPortfolio()` bulk-invalidates orders/positions/equity/account. |
| Realtime | `providers/RealtimeProvider.tsx` | Subscribes to `public.events` channel; calls `refreshStudentPortfolio()` on fill/order events. |

### 2.4  Core Libraries

| File | Responsibility |
|------|----------------|
| `lib/portfolio-calc.ts` | **Single source of truth** for portfolio math: `computePortfolioMetrics`, `computeMaxDrawdown`, `previewTradeImpact`, `validateInvariants`. |
| `lib/portfolio-invariants.ts` | Wrapper that calls `validateInvariants` and logs/reports non-blocking warnings. |
| `lib/ai-contracts.ts` | Zod schemas + safe parsers for `DailyBriefData`, `TradeMentorResponse`, `PortfolioAnalystResponse`, `JournalPatternInsight`. Rate limiter. Cached definitions. |
| `lib/indicators.ts` | Client-side technical indicator calculations (SMA, EMA, VWAP, RSI). |
| `lib/formatters.ts` | Currency, number, date formatters. |
| `lib/schemas.ts` | Shared Zod schemas for API payloads. |

### 2.5  Feature Modules

| Module | Key Files | Data Source | Status |
|--------|-----------|-------------|--------|
| `auth` | `AuthPage.tsx`, `AuthContext.tsx` | Supabase Auth | ✅ Live |
| `onboarding` | `OnboardingPage.tsx`, `JoinClassWizard.tsx` | Supabase `user_preferences`, Edge `/class/join` | ✅ Live |
| `student` | `StudentDashboard.tsx`, `hooks.ts` | Edge `/trade/*`, direct Supabase reads | ✅ Live |
| `trade` | `TradePage.tsx`, `OrderTicket.tsx`, `Watchlist.tsx` | Edge `/charts/context`, `/trade/place` | ✅ Live |
| `portfolio` | `PortfolioPage.tsx` | Reuses student hooks + `portfolio-calc.ts` | ✅ Live |
| `charts` | `ProCandlestickChart.tsx`, `ChartControls.tsx` | Edge `/charts/ohlc` | ✅ Live |
| `leaderboard` | `LeaderboardPage.tsx`, `ScoreBreakdown.tsx` | Edge `/teacher-console/leaderboard` | ✅ Live |
| `teacher` | `TeacherDashboard.tsx`, `ClassControl.tsx`, `RulesEditor.tsx` | Edge `/teacher-console/*` | ✅ Live |
| `mentor` | `MentorPanel.tsx` (+ `DailyBrief`) | **Simulated** (hardcoded response pools) | ⚠️ Mock |
| `learn` | `LearnHub.tsx` | **Hardcoded** lesson paths | ⚠️ Mock |
| `journal` | `JournalPage.tsx` | **Hardcoded** entries derived from orders | ⚠️ Mock |
| `challenges` | `ChallengesPage.tsx` | **Hardcoded** challenges/achievements | ⚠️ Mock |
| `analytics` | `StudentProfile.tsx`, `ScoreCard.tsx` | Edge `/teacher-console/analytics` | ✅ Live |

### 2.6  UI Component Library

26 UI primitives in `components/ui/` (button, card, dialog, sheet, tabs, select, table, fintech-table, states, etc.). Standardized state components: `EmptyState`, `ErrorState`, `OfflineState`, `SkeletonGrid`, `SkeletonList`, `MetricExplainer`.

## 3  Backend (`supabase/`)

### 3.1  Database Schema (19 migrations)

Core tables: `organizations`, `schools`, `profiles`, `classes`, `enrollments`, `invitations`, `trading_accounts`, `cash_ledger`, `holdings_snapshot`, `holding_lots`, `orders`, `fills`, `reservations`, `market_prices_latest`, `market_bars_cache`, `symbol_master`, `job_queue`, `events`, `competitions`, `competition_accounts`, `rule_violations`, `performance_snapshots_daily`, `risk_metrics`, `leaderboard_cache`, `reports_export_jobs`, `teacher_actions_audit`, `trading_controls`, `announcements`, `activity_flags`, `special_permissions`, `watchlists`, `watchlist_items`, `featured_symbols`, `symbol_aliases`, `rate_limits`, `function_logs`.

Phase C–H additions: `user_preferences`, `learning_paths`, `lessons`, `lesson_steps`, `question_bank`, `quizzes`, `lesson_progress`, `mastery_scores`, `journal_entries`, `challenges`, `challenge_progress`, `achievements`, `user_achievements`, `ai_threads`, `ai_messages`, `ai_insights`, `prompt_templates`, `corporate_actions`.

### 3.2  Key RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `place_order` | Edge `trade` | Validates rules, creates order + reservation |
| `cancel_order` | Edge `trade` | Cancels order, releases reservation |
| `broker_apply_fill` | `broker_engine_tick` | Executes fill, FIFO lots, cash ledger, events |
| `broker_engine_tick` | Edge `engine-tick` | Batch processes open orders against market prices |
| `compute_account_equity` | Edge `trade` | Cash + Σ(qty × market price) |
| `recompute_holdings_from_fills` | Edge `trade` | Rebuilds holdings from fill history |

### 3.3  Edge Functions (15)

`trade`, `charts`, `class`, `teacher-console`, `symbols`, `watchlists`, `org`, `school`, `user`, `student`, `engine-tick`, `competition-jobs`, `report-jobs`, `market-data`, `_shared` (auth helpers).

### 3.4  Job Runners

| Job | Schedule | Purpose |
|-----|----------|---------|
| `engine-tick` | Every N seconds | Match open orders against market prices |
| `market-data` | Every minute | Sync prices from Alpaca / Yahoo fallback |
| `competition-jobs` | Nightly | Daily snapshots + leaderboard refresh |
| `report-jobs` | Every minute | Process CSV export queue |

## 4  Testing

| Suite | Runner | Count | Coverage |
|-------|--------|-------|----------|
| `portfolio-calc.test.ts` | Vitest | 20 | Core math: equity, HHI, drawdown, trade impact, invariants |
| `portfolio-refresh.test.ts` | Vitest | 3 | Query invalidation logic |
| `ProCandlestickChart.test.tsx` | Vitest | 2 | Chart render smoke test |
| `hooks.placeOrder.test.tsx` | Vitest | 1 | Place order mutation wiring |
| `stockify_backend_tests.sql` | pgTAP/raw SQL | — | Backend broker engine integration |
| `tests/*.spec.ts` | — | 5 files | Placeholder specs (auth, leaderboard, roster, rules, trade-refetch) |

**Baseline:** `npx tsc -b` ✅ clean, `npm test -- --run` ✅ 26/26 pass.

## 5  CI/CD

GitHub Actions: `.github/workflows/supabase-deploy.yml` — pushes migrations + deploys Edge Functions on `main` push.
