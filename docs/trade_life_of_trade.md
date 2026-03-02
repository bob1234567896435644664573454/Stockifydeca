# Life Of A Trade (Stockify)

## Call Graph
1. `TradePage` renders `OrderTicket` and market context (`web/src/features/trade/TradePage.tsx`).
2. `OrderTicket` -> `usePlaceOrder` mutation (`web/src/features/trade/components/OrderTicket.tsx`, `web/src/features/student/hooks.ts`).
3. `usePlaceOrder` posts to `POST /functions/v1/trade/place` with `account_id`, `client_request_id`, and payload.
4. Edge Function `trade` (`supabase/functions/trade/index.ts`):
   - Verifies JWT (`requireAuth`).
   - Loads account and enforces ownership (`account.user_id === auth.user.id`) for placement.
   - Applies guardrails/rate-limit.
   - Calls RPC `public.place_order(...)` using service-role client.
5. SQL RPC `public.place_order` (`supabase/migrations/20260214173000_stockify_rpc_and_jobs.sql`):
   - Service-role only gate (`public.is_service_role()`).
   - Idempotency lookup by `(account_id, client_request_id)` and returns existing order on repeat.
   - Inserts order + reservation (`cash` for buys, `shares` for sells).
   - `trg_capture_order_pricing_snapshot` snapshots `fee_bps_snapshot`, `slippage_bps_snapshot`, and `reserve_price_snapshot` on the order.
   - `trg_normalize_buy_cash_reservation` sizes buy reservation from those order snapshots (no mutable rules lookup).
6. Engine tick path:
   - `POST /functions/v1/engine-tick` (`supabase/functions/engine-tick/index.ts`) requires `x-engine-key`.
   - Calls `public.broker_engine_tick(...)`.
7. `public.broker_engine_tick`:
   - Service-role only gate.
   - Advisory xact lock + `FOR UPDATE SKIP LOCKED` order selection.
   - Resolves executable price/qty and calls `public.broker_apply_fill(...)`.
8. `public.broker_apply_fill`:
   - Service-role only gate.
   - Idempotency key guard via `fills(order_id, execution_key)` uniqueness.
   - Applies ledger + holdings lots/snapshot updates + reservation decrement/release.
   - Reservation auditability preserved with `reservations.initial_amount`; release paths keep historical amount context instead of blanket-zeroing on cancel/expire/reject.
   - Emits `fill.created` and `order.updated` events.
9. Realtime:
   - `RealtimeProvider` subscribes to `orders`/`fills` changes (`web/src/providers/RealtimeProvider.tsx`).
   - Debounced, targeted invalidations refresh affected student queries.

## Boundary Validation Summary
- Client -> Edge (`/trade/place`): authenticated JWT required; account ownership enforced for placement.
- Edge -> RPC (`place_order`): service-role only RPC; client cannot call directly due revoked grants.
- Tick endpoint: now guarded by `ENGINE_JOB_KEY` (`x-engine-key`) only; no end-user role path.
- Engine RPCs (`broker_engine_tick`, `broker_apply_fill`, `cancel_order`): service-role checks + revoked anon/authenticated execute rights.
- Data isolation: table RLS policies restrict reads by tenant/class/account; Edge read paths also perform explicit account access checks before returning data.

## Invariants Covered
- No double-spend: reservations + account row locking + non-negative cash constraint.
- Idempotent placement: unique `(account_id, client_request_id)` and repeat-return behavior.
- Exactly-once fill application: execution key uniqueness + idempotent fill path + tick concurrency lock.
- Reservation lifecycle: active reservations are released via `released_at`; audit trail retains `initial_amount` and release metadata.
- Realtime performance: debounced targeted refresh, no broad invalidation blasts.
