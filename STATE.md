# STATE

## Task Tracker
- [x] STEP 1: Repo scan completed.
- [x] STEP 1: `CODEBASE_MAP.md` created.
- [x] STEP 1: `REFACTOR_PLAN.md` created.
- [x] P0-1: Restore TypeScript compile baseline (`cd web && npx tsc -b`).
- [x] P0-1: Keep tests green after compile fixes (`cd web && npm test -- --run`).
- [x] P0-2: Route dashboard/portfolio portfolio metrics through `portfolio-calc.ts` only.
- [x] P0-3: Ensure impact preview uses only `previewTradeImpact()` and account-aware sizing assumptions.
- [x] P0-4: Wire invariant checks into key mutation paths safely (log/report, no UI crash).
- [x] P0-5: Align onboarding/join class frontend calls with backend endpoints.
- [x] P1-1: Consolidate realtime subscriptions and query invalidations.
- [x] P1-2: Standardize empty/error/offline/loading states with `components/ui/states.tsx`.
- [x] P1-3: Supabase query hygiene (`select("*")` removal and narrower column fetches).
- [x] P1-4: Performance pass (rerenders, chart gating, refetch pressure reduction).
- [x] P2-1: AI contract runtime validation and `dataSource` enforcement at boundaries.
- [x] P2-2: Dead code cleanup and architecture boundary tightening.
- [x] P2-3: Full docs sweep under `docs/` for legacy contract references.

## Next Up
- Optional: expand targeted coverage tests for teacher export lifecycle endpoints (`/exports/request`, `/exports/list`, `/exports/download`).

## Blocked By
- No current blockers.
