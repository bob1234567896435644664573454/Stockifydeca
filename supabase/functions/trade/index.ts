import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId, getPagination } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";
import { parseJsonBody, z } from "../_shared/validation.ts";

function round6(n: number): number {
  const factor = 1_000_000;
  return Math.round(n * factor) / factor;
}

function canReadAccount(
  role: string,
  me: string,
  profileOrgId: string | null,
  account: { user_id: string; org_id: string; class_id: string },
  teacherClassIds: Set<string>,
): boolean {
  if (role === "platform_admin") return true;
  if (role === "org_admin") return profileOrgId === account.org_id;
  if (role === "teacher") return teacherClassIds.has(account.class_id);
  return account.user_id === me;
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `trade${parsePath(req)}`;

  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const auth = await requireAuth(admin, req);
    if (auth instanceof Response) {
      statusCode = auth.status;
      return auth;
    }
    userId = auth.user.id;

    const path = parsePath(req);
    const url = new URL(req.url);

    const { data: teacherClasses } = await admin
      .from("classes")
      .select("id")
      .eq("teacher_id", auth.user.id);
    const teacherClassIds = new Set((teacherClasses ?? []).map((c) => c.id as string));

    if (req.method === "POST" && path === "/place") {
      const bodyParse = parseJsonBody(
        z.object({
          account_id: z.string().uuid(),
          client_request_id: z.string().min(1).max(128),
          symbol: z.string().min(1).max(16).optional(),
          side: z.enum(["buy", "sell"]).optional(),
          qty: z.coerce.number().positive().optional(),
          order_type: z.enum(["market", "limit", "stop", "stop_limit"]).optional(),
          limit_price: z.coerce.number().positive().optional(),
          stop_price: z.coerce.number().positive().optional(),
          tif: z.enum(["day", "gtc", "ioc", "fok"]).optional(),
          competition_id: z.string().uuid().optional(),
          payload: z.object({
            symbol: z.string().min(1).max(16).optional(),
            side: z.enum(["buy", "sell"]).optional(),
            qty: z.coerce.number().positive().optional(),
            order_type: z.enum(["market", "limit", "stop", "stop_limit"]).optional(),
            limit_price: z.coerce.number().positive().optional(),
            stop_price: z.coerce.number().positive().optional(),
            tif: z.enum(["day", "gtc", "ioc", "fok"]).optional(),
            competition_id: z.string().uuid().optional(),
          }).passthrough().optional(),
        }),
        await req.json().catch(() => ({})),
      );
      if (!bodyParse.ok) {
        statusCode = 400;
        return bodyParse.response;
      }
      const accountId = bodyParse.data.account_id;
      const payload = {
        ...(bodyParse.data.payload ?? {}),
        ...(bodyParse.data.payload ? {} : {
          symbol: bodyParse.data.symbol,
          side: bodyParse.data.side,
          qty: bodyParse.data.qty,
          order_type: bodyParse.data.order_type,
          limit_price: bodyParse.data.limit_price,
          stop_price: bodyParse.data.stop_price,
          tif: bodyParse.data.tif,
          competition_id: bodyParse.data.competition_id,
        }),
      };
      const clientRequestId = bodyParse.data.client_request_id.trim();

      const { data: account, error: accountErr } = await admin
        .from("trading_accounts")
        .select("id, user_id, org_id, class_id")
        .eq("id", accountId)
        .single();

      if (accountErr || !account) {
        statusCode = 404;
        return json({ error: "account not found" }, 404);
      }

      if (account.user_id !== auth.user.id) {
        statusCode = 403;
        return json({ error: "students can only place orders on their own account" }, 403);
      }

      const symbol = String(payload.symbol ?? "").toUpperCase().trim();
      const orderType = String(payload.order_type ?? "market");
      const limitPrice = Number(payload.limit_price ?? 0);
      if (symbol && (orderType === "limit" || orderType === "stop_limit") && Number.isFinite(limitPrice) && limitPrice > 0) {
        const competitionId = String(payload.competition_id ?? "");
        let rules: Record<string, unknown> = {};

        if (competitionId) {
          const { data: comp } = await admin
            .from("competitions")
            .select("rules_json")
            .eq("id", competitionId)
            .maybeSingle();
          rules = (comp?.rules_json ?? {}) as Record<string, unknown>;
        } else {
          const { data: compAccounts } = await admin
            .from("competition_accounts")
            .select("competition_id, competitions!inner(status, rules_json)")
            .eq("account_id", accountId);
          const active = (compAccounts ?? []).find((row: any) => {
            const comp = row.competitions;
            if (Array.isArray(comp)) {
              return comp.some((c: any) => c?.status === "active");
            }
            return comp?.status === "active";
          });
          const activeComp = Array.isArray((active as any)?.competitions)
            ? (active as any).competitions.find((c: any) => c?.status === "active")
            : (active as any)?.competitions;
          rules = (activeComp?.rules_json ?? {}) as Record<string, unknown>;
        }

        const minDistanceBps = Number(rules.min_limit_distance_bps ?? 0);
        if (Number.isFinite(minDistanceBps) && minDistanceBps > 0) {
          const { data: px } = await admin
            .from("market_prices_latest")
            .select("price")
            .eq("symbol", symbol)
            .maybeSingle();
          const marketPrice = Number(px?.price ?? 0);
          if (marketPrice > 0) {
            const distanceBps = Math.abs((limitPrice - marketPrice) / marketPrice) * 10000;
            if (distanceBps < minDistanceBps) {
              statusCode = 400;
              return json({
                error: `limit_price must be at least ${minDistanceBps} bps away from market price`,
              }, 400);
            }
          }
        }
      }

      const { data: allowed, error: rateErr } = await admin.rpc("consume_rate_limit", {
        p_user_id: auth.user.id,
        p_key: "trade.place",
        p_capacity: 30,
        p_refill_per_sec: 0.5,
        p_cost: 1,
      });

      if (rateErr) {
        statusCode = 400;
        return json({ error: rateErr.message }, 400);
      }

      if (!allowed) {
        statusCode = 429;
        return json({ error: "rate limit exceeded" }, 429);
      }

      const { data, error } = await admin.rpc("place_order", {
        p_account_id: accountId,
        p_payload_json: payload,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ result: data });
    }

    if (req.method === "POST" && path === "/cancel") {
      const bodyParse = parseJsonBody(
        z.object({ order_id: z.string().uuid() }),
        await req.json().catch(() => ({})),
      );
      if (!bodyParse.ok) {
        statusCode = 400;
        return bodyParse.response;
      }
      const orderId = bodyParse.data.order_id;

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, account_id, trading_accounts!inner(user_id, org_id, class_id)")
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        statusCode = 404;
        return json({ error: "order not found" }, 404);
      }

      const account = (order as unknown as {
        account_id: string;
        trading_accounts: { user_id: string; org_id: string; class_id: string };
      }).trading_accounts;

      const canCancel = account.user_id === auth.user.id
        || auth.profile.role === "platform_admin"
        || (auth.profile.role === "org_admin" && auth.profile.org_id === account.org_id)
        || (auth.profile.role === "teacher" && teacherClassIds.has(account.class_id));

      if (!canCancel) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { data, error } = await admin.rpc("cancel_order", {
        p_order_id: orderId,
      });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ result: data });
    }

    if (req.method === "GET" && path === "/orders") {
      const accountId = String(url.searchParams.get("account_id") ?? "");
      if (!accountId) {
        statusCode = 400;
        return json({ error: "account_id is required" }, 400);
      }

      const { data: account, error: accountErr } = await admin
        .from("trading_accounts")
        .select("id, user_id, org_id, class_id")
        .eq("id", accountId)
        .single();

      if (accountErr || !account) {
        statusCode = 404;
        return json({ error: "account not found" }, 404);
      }

      if (!canReadAccount(auth.profile.role, auth.user.id, auth.profile.org_id, account, teacherClassIds)) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { limit, offset } = getPagination(url);
      let query = admin
        .from("orders")
        .select("id, account_id, symbol, side, qty, filled_qty, order_type, limit_price, stop_price, tif, status, client_request_id, placed_at, updated_at")
        .eq("account_id", accountId)
        .order("placed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const status = url.searchParams.get("status");
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ items: data ?? [], page_size: limit, offset });
    }

    if (req.method === "GET" && path === "/fills") {
      const accountId = String(url.searchParams.get("account_id") ?? "");
      if (!accountId) {
        statusCode = 400;
        return json({ error: "account_id is required" }, 400);
      }

      const { data: account, error: accountErr } = await admin
        .from("trading_accounts")
        .select("id, user_id, org_id, class_id")
        .eq("id", accountId)
        .single();

      if (accountErr || !account) {
        statusCode = 404;
        return json({ error: "account not found" }, 404);
      }

      if (!canReadAccount(auth.profile.role, auth.user.id, auth.profile.org_id, account, teacherClassIds)) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { limit, offset } = getPagination(url);
      const { data, error } = await admin
        .from("fills")
        .select("id, order_id, account_id, symbol, qty, price, fees, slippage, filled_at")
        .eq("account_id", accountId)
        .order("filled_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ items: data ?? [], page_size: limit, offset });
    }

    if (req.method === "GET" && path === "/positions") {
      const accountId = String(url.searchParams.get("account_id") ?? "");
      const { limit, offset } = getPagination(url);
      if (!accountId) {
        statusCode = 400;
        return json({ error: "account_id is required" }, 400);
      }

      const { data: account, error: accountErr } = await admin
        .from("trading_accounts")
        .select("id, user_id, org_id, class_id")
        .eq("id", accountId)
        .single();

      if (accountErr || !account) {
        statusCode = 404;
        return json({ error: "account not found" }, 404);
      }

      if (!canReadAccount(auth.profile.role, auth.user.id, auth.profile.org_id, account, teacherClassIds)) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { data: positions, error } = await admin
        .from("holdings_snapshot")
        .select("symbol, qty, avg_cost, realized_pnl, updated_at")
        .eq("account_id", accountId)
        .neq("qty", 0)
        .order("symbol", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const symbols = (positions ?? []).map((p) => p.symbol);
      let priceMap = new Map<string, number>();
      if (symbols.length > 0) {
        const { data: prices } = await admin
          .from("market_prices_latest")
          .select("symbol, price")
          .in("symbol", symbols);

        priceMap = new Map((prices ?? []).map((p) => [p.symbol as string, Number(p.price)]));
      }

      const enriched = (positions ?? []).map((p) => {
        const last = priceMap.get(p.symbol as string) ?? 0;
        const qty = Number(p.qty);
        const avg = Number(p.avg_cost);
        return {
          ...p,
          market_price: last,
          // Avoid floating representation noise in API responses.
          market_value: round6(qty * last),
          unrealized_pnl: round6(qty * (last - avg)),
        };
      });

      return json({ items: enriched, page_size: limit, offset });
    }

    if (req.method === "GET" && path === "/equity") {
      const accountId = String(url.searchParams.get("account_id") ?? "");
      const asOf = url.searchParams.get("as_of_ts") ?? undefined;
      if (!accountId) {
        statusCode = 400;
        return json({ error: "account_id is required" }, 400);
      }

      const { data: account, error: accountErr } = await admin
        .from("trading_accounts")
        .select("id, user_id, org_id, class_id")
        .eq("id", accountId)
        .single();

      if (accountErr || !account) {
        statusCode = 404;
        return json({ error: "account not found" }, 404);
      }

      if (!canReadAccount(auth.profile.role, auth.user.id, auth.profile.org_id, account, teacherClassIds)) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { data, error } = await admin.rpc("compute_account_equity", {
        p_account_id: accountId,
        p_as_of_ts: asOf,
      });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ equity: data });
    }

    statusCode = 404;
    return json({ error: `route not found: ${path}` }, 404);
  } catch (err) {
    console.error(err);
    statusCode = 500;
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  } finally {
    await logRequest(admin, {
      requestId: reqId,
      userId,
      route,
      status: statusCode,
      latencyMs: Date.now() - start,
    });
  }
});
