# CODEBASE_MAP

## Snapshot (as of 2026-02-28)
- Monorepo contains frontend (`web/`) and Supabase backend (`supabase/`).
- Frontend quality gates are green:
  - `cd web && npx tsc -b` passes.
  - `cd web && npm test -- --run` passes (`21/21`).
- Portfolio math is centralized in `web/src/lib/portfolio-calc.ts` and now consumed by dashboard/portfolio/order preview paths.
- Realtime invalidation is centralized via `web/src/lib/portfolio-refresh.ts` and a single provider path.

## Top-Level Structure
- `web/`: Vite + React + TypeScript app, TanStack Router, TanStack Query, Supabase JS.
- `supabase/`: SQL migrations, RLS policies, Edge Functions.
- Root audit docs:
  - `CODEBASE_MAP.md`
  - `REFACTOR_PLAN.md`
  - `STATE.md`
  - `CHANGELOG_DEV.md`

## Frontend Architecture

### Boot/Providers
- Entry: `web/src/main.tsx`
  - Provider chain: `ErrorBoundary` -> `QueryClientProvider` -> `ThemeProvider` -> `AuthProvider` -> `RealtimeProvider` -> `RouterProvider`.
- Root route: `web/src/routes/__root.tsx`
  - Now renders `RootLayout` only (no duplicate auth/realtime wiring).

### Routing
- Router: `web/src/router.tsx`.
- Public: `/auth`.
- Student routes:
  - `/student`
  - `/student/trade/$symbol`
  - `/student/leaderboard`
  - `/student/portfolio`
  - `/student/learn`
  - `/student/journal`
  - `/student/challenges`
- Teacher routes:
  - `/teacher`
  - `/teacher/class/$classId`

### Data Access Boundaries
- `web/src/lib/api.ts`
  - Single Edge Function client wrapper.
  - Adds bearer token from current Supabase session.
  - Supports parsed/validated transport (`getParsed`, `postParsed`).
- Direct Supabase reads remain for selected low-latency, RLS-protected tables (`useActiveAccount`, equity history, teacher classes).
- `select("*")` usage in frontend has been removed in favor of explicit columns.

### Query Keys / Refreshing
- Canonical keys: `web/src/lib/queryKeys.ts`.
- Central portfolio refresh invalidation helper:
  - `web/src/lib/portfolio-refresh.ts` (`refreshStudentPortfolio`).
- Realtime refresh source:
  - `web/src/providers/RealtimeProvider.tsx`.

### Core Feature Modules
- Student dashboard: `web/src/features/student/StudentDashboard.tsx`.
- Trading workspace: `web/src/features/trade/TradePage.tsx` + `components/OrderTicket.tsx`.
- Portfolio analytics: `web/src/features/portfolio/PortfolioPage.tsx`.
- Teacher console: `web/src/features/teacher/*`.
- Mentor surfaces: `web/src/features/mentor/MentorPanel.tsx`.

## Portfolio Calculation Boundary
- Single source: `web/src/lib/portfolio-calc.ts`.
- Exported primitives:
  - `computePortfolioMetrics()`
  - `computeMaxDrawdown()`
  - `previewTradeImpact()`
  - `validateInvariants()`
- Current usage:
  - `StudentDashboard`: equity/cash/return/allocation-adjacent metrics via `computePortfolioMetrics`.
  - `PortfolioPage`: HHI/allocation/returns via `computePortfolioMetrics`; drawdown via `computeMaxDrawdown`.
  - `OrderTicket`: impact panel via `previewTradeImpact` only.
  - Invariant wrapper: `web/src/lib/portfolio-invariants.ts` used in order placement and onboarding account-init checks.

## AI Reliability Boundary
- Contract module: `web/src/lib/ai-contracts.ts`.
  - Runtime Zod schemas + parsers for Daily Brief / Mentor / Analyst / Journal payload shapes.
  - Safe parsers for graceful fallback behavior.
  - Stable v1 cache key format with encoded parts.
  - Client rate limiter configs (`mentor_chat`, `daily_brief`).
- Current runtime usage:
  - `MentorPanel` validates simulated mentor responses at render boundary.
  - `DailyBrief` validates brief payload and surfaces `dataSource` in UI badge.
  - Rate limiter is only applied to mentor/daily-brief interactions (AI-only paths).

## UI State System
- Standard state primitives: `web/src/components/ui/states.tsx`.
- Core pages now use standardized state components (`EmptyState`, `ErrorState`, `SkeletonGrid`, `SkeletonList`).
- Legacy duplicate files removed:
  - `web/src/components/ui/error-state.tsx`
  - `web/src/components/ui/empty-state.tsx`

## Backend / Supabase

### Auth/RLS
- Edge Functions use service role client + explicit auth checks (`requireAuth`) with role/scope controls.
- Frontend access assumes RLS isolation for direct table reads.

### Key Edge Functions
- `supabase/functions/trade` (place/cancel/orders/fills/positions/equity)
- `supabase/functions/charts` (context/ohlc)
- `supabase/functions/class` (create/list/join/resolve-code)
- `supabase/functions/teacher-console` (roster/freeze/competitions/announcements/audit/exports/analytics/leaderboard)

### Query Hygiene
- Teacher console backend tightened for overfetch reduction in touched paths:
  - competitions endpoint now selects explicit fields.
  - student analytics violations query now selects explicit fields.

## Main Runtime Flows

### Trade Placement
1. `TradePage` loads market context (`/charts/context`).
2. `OrderTicket` validates order form and shows estimated impact from `previewTradeImpact`.
3. `usePlaceOrder` submits to `/trade/place`.
4. Success + realtime events call `refreshStudentPortfolio()` to keep orders/positions/equity/account synchronized.
5. Invariant checks run pre-submit and log non-blocking warnings on violations.

### Onboarding + Class Join
1. `OnboardingPage` persists `user_preferences`.
2. Class code resolution: `/class/resolve-code`.
3. Join flow: `/class/join`.
4. Account-init invariant checks run in non-blocking mode.

### Dashboard / Portfolio Analytics
1. `useActiveAccount`, `usePositions`, `useOrders`, `useEquityHistory` provide account + position + history data.
2. Derived metrics flow through portfolio-calc helpers.
3. Empty/loading/error states use standardized state components.

## Known Hotspots Remaining (Low Risk / Optional)
- Teacher analytics surface (`StudentProfile`) still computes simple return from equity curve locally; this is currently consistent with returned data but could be further normalized.
- Export job history flow is now aligned (`GET /teacher-console/exports/list` implemented); remaining opportunities are incremental UX/perf polish rather than contract gaps.
