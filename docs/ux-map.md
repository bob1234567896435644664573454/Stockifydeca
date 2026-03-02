# Stockify UX Map

## 1. Public / Auth
- Route: `/auth`
- Component: `AuthPage`
- Auth layer: Supabase Auth client methods (`signInWithPassword`, `signUp`, reset email flow)

## 2. App Shell and Providers

### Provider stack (current)
- File: `web/src/main.tsx`
- Order:
  - `ErrorBoundary`
  - `QueryClientProvider`
  - `ThemeProvider`
  - `AuthProvider`
  - `RealtimeProvider`
  - `RouterProvider`

### Layout shell
- Primary shell across student/teacher pages: `AppShell`
- `DashboardLayout` appears in a smaller subset of routes/components and is not the primary app shell.

## 3. Student Experience

### Dashboard
- Route: `/student`
- Component: `StudentDashboard`
- Data hooks:
  - `useActiveAccount` (direct Supabase `trading_accounts` + `is_account_trading_enabled` RPC)
  - `usePositions` (`GET /trade/positions`)
  - `useOrders` (`GET /trade/orders`)
  - `useEquityHistory` (direct Supabase `performance_snapshots_daily`)
  - `useActiveCompetition` (direct Supabase joins)
- Shared calc dependencies:
  - `computePortfolioMetrics` for equity/return/cash/invested metrics

### Trading Workspace
- Route: `/student/trade/$symbol`
- Component: `TradePage`
- Data hooks:
  - `useMarketData` (`GET /charts/context`)
  - `useChartData` (`GET /charts/ohlc`, pro mode)
  - `useRealtimeChart` (Supabase realtime on `market_bars_cache`, pro mode)
  - `useOrders` (pro markers only)
- Order entry:
  - `OrderTicket` + `usePlaceOrder` (`POST /trade/place`)
  - Preview uses shared `previewTradeImpact` only

### Portfolio
- Route: `/student/portfolio`
- Component: `PortfolioPage`
- Data hooks:
  - `useActiveAccount`
  - `usePositions`
  - `useOrders`
  - `useEquityHistory`
- Shared calc dependencies:
  - `computePortfolioMetrics`
  - `computeMaxDrawdown`

### Leaderboard
- Route: `/student/leaderboard`
- Components: `StudentLeaderboardContainer` -> `LeaderboardPage`
- Data hook:
  - `useStudentLeaderboard` (`GET /student/leaderboard`)

## 4. Teacher Experience

### Teacher Dashboard (Classes)
- Route: `/teacher`
- Component: `TeacherDashboard`
- Data hooks:
  - `useTeacherClasses` (direct Supabase `classes` + `trading_controls`)

### Class Control
- Route: `/teacher/class/$classId`
- Component: `ClassControl`
- Data hooks:
  - `useClassRoster` (`GET /teacher-console/roster`)
  - `useClassCompetitions` (`GET /teacher-console/competitions`)
  - `useClassAnnouncements` (`GET /teacher-console/announcements`)
  - `useAuditLog` (`GET /teacher-console/audit`)
  - `useStudentAnalytics` (`GET /teacher-console/analytics/student`)
  - `useExportJobs` (`GET /teacher-console/exports/list`)
  - `useExportStatus` (`GET /teacher-console/exports/download`)
- Mutations:
  - `useFreezeClass` / `useFreezeStudent` (`POST /teacher-console/freeze`)
  - `useResetStudent` (`POST /teacher-console/account/reset`)
  - `useCreateAnnouncement` (`POST /teacher-console/announcements/create`)
  - `useRequestExport` (`POST /teacher-console/exports/request`)

## 5. Realtime Behavior
- Active provider: `RealtimeProvider` (mounted in `main.tsx`)
- Channel: `public:events`
- Subscriptions:
  - `orders` table changes -> refresh student portfolio queries
  - `fills` inserts -> refresh student portfolio + fills
  - `trading_controls` -> refresh account/class states
  - `announcements` inserts -> refresh teacher announcements
  - `order.created` broadcast -> refresh student portfolio queries

## 6. Resolved Findings (2026-02-28)
- Realtime provider is mounted and active in `web/src/main.tsx`.
- Primary shell is `AppShell`, not `DashboardLayout`, for core student/teacher flows.
- Student account bootstrap does not use `/trade/accounts`; it uses direct Supabase `trading_accounts` + RPC for trading enabled state.
- Teacher export history endpoint is implemented and aligned: `GET /teacher-console/exports/list`.
