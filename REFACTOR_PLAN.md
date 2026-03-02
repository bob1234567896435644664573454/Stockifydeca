# REFACTOR_PLAN

## Priority Legend
- `P0`: correctness/build safety.
- `P1`: maintainability/performance/security hardening with low behavior risk.
- `P2`: reliability polish and cleanup.

## Status Summary
- `P0`: complete.
- `P1`: complete for targeted scope in this pass.
- `P2`: complete for scoped audit pass.

## Completed Items

### P0-1: Restore TypeScript compile baseline
Scope completed:
- Fixed strict TS errors across feature pages/providers and hooks.

Acceptance met:
- `cd web && npx tsc -b` passes.
- `cd web && npm test -- --run` passes.

### P0-2: Enforce portfolio math single source in UI
Scope completed:
- `StudentDashboard` and `PortfolioPage` now route core equity/return/HHI/allocation math through `computePortfolioMetrics`.
- Drawdown on portfolio page uses `computeMaxDrawdown`.

Acceptance met:
- No duplicated HHI/equity/allocation engine left in those core student surfaces.

### P0-3: Ensure preview impact source + estimate labeling
Scope completed:
- `OrderTicket` impact preview uses `previewTradeImpact()` only.
- Removed hardcoded `$100000` assumptions.
- Impact labels explicitly mark values as estimated.

Acceptance met:
- Preview path is single-source and account-aware.

### P0-4: Wire invariant checks into mutation paths safely
Scope completed:
- Added `validateAndReportInvariants` wrapper.
- Invoked from:
  - trade placement pre-submit path
  - onboarding account initialization checks
- Violations log warnings only (non-breaking UX).

Acceptance met:
- Invariants run in key mutation paths without crashing UI.

### P0-5: Align onboarding/class join API contracts
Scope completed:
- Backend `class` function now supports:
  - `POST /resolve-code`
  - `POST /join`
- Shared enrollment logic used by join endpoints.

Acceptance met:
- Onboarding join flow calls existing backend routes successfully.

### P1-1: Realtime/query invalidation consolidation
Scope completed:
- Removed duplicate root-level auth/realtime wiring.
- Added centralized invalidation helper: `refreshStudentPortfolio`.
- Realtime provider and order placement path now share invalidation behavior.

Acceptance met:
- Single active realtime provider path.
- Query invalidations aligned with canonical student keys.

### P1-2: Standardize empty/error/loading states
Scope completed:
- Adopted `components/ui/states.tsx` across core student/teacher/leaderboard/analytics surfaces.
- Removed legacy duplicate UI state component files.

Acceptance met:
- Core pages use common state primitives and consistent CTA patterns.

### P1-3: Supabase query hygiene
Scope completed:
- Removed frontend `select("*")` queries.
- Narrowed backend `teacher-console` overfetching in touched endpoints.

Acceptance met:
- No `select("*")` usage remains in `web/src` or touched backend paths.

### P1-4: Performance pass
Scope completed:
- Debounced high-frequency order preview recompute input.
- Reduced student polling interval pressure.
- Trade page now gates heavy pro-chart queries/realtime/orders to `mode === "pro"`.
- Centralized portfolio refresh to avoid scattered invalidation logic.

Acceptance met:
- Lower unnecessary network/compute work in default trade flow.

### P2-1: AI contract runtime enforcement
Scope completed:
- Added runtime Zod schemas/parsers for AI contracts.
- Added safe parse helpers and graceful fallback behavior.
- Enforced `dataSource` display on Daily Brief UI.
- Cache keys upgraded to stable encoded v1 format.
- Rate limiter applied only to AI interactions (mentor/daily brief), not core trading.

Acceptance met:
- Malformed AI payloads are handled safely and cannot break mentor/daily-brief UI.

### P2-2: Dead code cleanup
Scope completed:
- Removed unused duplicate modules:
  - `web/src/features/trade/hooks.ts`
  - `web/src/components/ui/error-state.tsx`
  - `web/src/components/ui/empty-state.tsx`

Acceptance met:
- Duplicate/conflicting paths removed without behavior regressions.

## Remaining / Deferred

- No remaining items in the scoped P0/P1/P2 plan.
- Follow-up opportunity outside this pass: add focused integration coverage for teacher export lifecycle routes to guard contract regressions.

## Validation Checklist (latest run)
- `cd web && npx tsc -b` ✅
- `cd web && npm test -- --run` ✅ (`21/21`)
- `deno check supabase/functions/class/index.ts` ✅
- `deno check supabase/functions/teacher-console/index.ts` ✅
