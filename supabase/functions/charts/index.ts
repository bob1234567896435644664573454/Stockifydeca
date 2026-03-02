import { createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

function safeNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function getUserClassIds(
  admin: ReturnType<typeof createServiceClient>,
  role: string,
  userId: string,
  orgId: string | null,
): Promise<Set<string>> {
  if (role === "platform_admin") {
    const { data } = await admin.from("classes").select("id");
    return new Set((data ?? []).map((row: any) => row.id as string));
  }
  if (role === "org_admin") {
    const { data } = await admin.from("classes").select("id").eq("org_id", orgId);
    return new Set((data ?? []).map((row: any) => row.id as string));
  }
  if (role === "teacher") {
    const { data } = await admin.from("classes").select("id").eq("teacher_id", userId);
    return new Set((data ?? []).map((row: any) => row.id as string));
  }
  const { data } = await admin
    .from("enrollments")
    .select("class_id")
    .eq("student_id", userId)
    .eq("status", "active");
  return new Set((data ?? []).map((row: any) => row.class_id as string));
}

Deno.serve(async (req: Request) => {
  const start = Date.now();
  const reqId = requestId(req);
  const admin = createServiceClient();
  const route = `charts${parsePath(req)}`;

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

    if (req.method === "GET" && path === "/context") {
      const symbol = String(url.searchParams.get("symbol") ?? "").toUpperCase().trim();
      const competitionId = String(url.searchParams.get("competition_id") ?? "");
      const accountIdInput = String(url.searchParams.get("account_id") ?? "");

      if (!symbol) {
        statusCode = 400;
        return json({ error: "symbol is required" }, 400);
      }

      const userClassIds = await getUserClassIds(
        admin,
        auth.profile.role,
        auth.user.id,
        auth.profile.org_id,
      );

      const { data: alias } = await admin
        .from("symbol_aliases")
        .select("tradingview_symbol, primary_exchange")
        .eq("symbol", symbol)
        .maybeSingle();

      const { data: symbolMeta } = await admin
        .from("symbol_master")
        .select("exchange")
        .eq("symbol", symbol)
        .maybeSingle();

      let selectedCompetitionId: string | null = competitionId || null;
      let competitionRules: Record<string, unknown> = {};
      let classId: string | null = null;

      if (competitionId) {
        const { data: competition } = await admin
          .from("competitions")
          .select("id, class_id, rules_json")
          .eq("id", competitionId)
          .maybeSingle();

        if (!competition) {
          statusCode = 404;
          return json({ error: "competition not found" }, 404);
        }
        if (!userClassIds.has(competition.class_id as string)) {
          statusCode = 403;
          return json({ error: "competition access denied" }, 403);
        }
        selectedCompetitionId = competition.id as string;
        classId = competition.class_id as string;
        competitionRules = (competition.rules_json ?? {}) as Record<string, unknown>;
      }

      let accountId = accountIdInput || null;
      if (!accountId) {
        const { data: account } = await admin
          .from("trading_accounts")
          .select("id")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        accountId = (account?.id as string) ?? null;
      }

      if (accountId && !selectedCompetitionId) {
        const { data: compRows } = await admin
          .from("competition_accounts")
          .select("competition_id, competitions!inner(status, class_id, rules_json)")
          .eq("account_id", accountId);

        const active = (compRows ?? []).find((row: any) => {
          const comp = row.competitions;
          if (Array.isArray(comp)) return comp.some((c: any) => c?.status === "active");
          return comp?.status === "active";
        }) as any;

        const activeComp = Array.isArray(active?.competitions)
          ? active.competitions.find((c: any) => c?.status === "active")
          : active?.competitions;

        if (activeComp) {
          selectedCompetitionId = active.competition_id as string;
          classId = activeComp.class_id as string;
          competitionRules = (activeComp.rules_json ?? {}) as Record<string, unknown>;
        }
      }

      let position: { qty: number; avg_cost: number; realized_pnl: number } | null = null;
      const fills: Array<{ id: string; order_id: string; side: string; qty: number; price: number; fees: number; slippage: number; filled_at: string }> = [];

      if (accountId) {
        const { data: account } = await admin
          .from("trading_accounts")
          .select("id, user_id, class_id, org_id")
          .eq("id", accountId)
          .maybeSingle();

        const canRead = account && (
          account.user_id === auth.user.id
          || auth.profile.role === "platform_admin"
          || (auth.profile.role === "org_admin" && auth.profile.org_id === account.org_id)
          || (auth.profile.role === "teacher" && userClassIds.has(account.class_id as string))
        );

        if (!canRead) {
          statusCode = 403;
          return json({ error: "account access denied" }, 403);
        }

        if (!classId) classId = account?.class_id as string;

        const { data: positionData } = await admin
          .from("holdings_snapshot")
          .select("qty, avg_cost, realized_pnl")
          .eq("account_id", accountId)
          .eq("symbol", symbol)
          .maybeSingle();

        if (positionData) {
          position = {
            qty: safeNum(positionData.qty),
            avg_cost: safeNum(positionData.avg_cost),
            realized_pnl: safeNum(positionData.realized_pnl),
          };
        }

        const { data: fillsData } = await admin
          .from("fills")
          .select("id, order_id, qty, price, fees, slippage, filled_at, orders!inner(side)")
          .eq("account_id", accountId)
          .eq("symbol", symbol)
          .order("filled_at", { ascending: true })
          .limit(200);

        for (const f of (fillsData ?? []) as any[]) {
          fills.push({
            id: String(f.id),
            order_id: String(f.order_id),
            side: String(f.orders?.side ?? ""),
            qty: safeNum(f.qty),
            price: safeNum(f.price),
            fees: safeNum(f.fees),
            slippage: safeNum(f.slippage),
            filled_at: String(f.filled_at),
          });
        }
      }

      const { data: latestPriceRow } = await admin
        .from("market_prices_latest")
        .select("price, ts")
        .eq("symbol", symbol)
        .maybeSingle();

      const latestPrice = safeNum(latestPriceRow?.price);
      const { data: recentBars } = await admin
        .from("market_bars_cache")
        .select("c, ts")
        .eq("symbol", symbol)
        .eq("timeframe", "1m")
        .order("ts", { ascending: false })
        .limit(2);

      const lastClose = safeNum(recentBars?.[0]?.c ?? latestPrice);
      const prevClose = safeNum(recentBars?.[1]?.c ?? lastClose);
      const change = lastClose - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
      const delayedQuotesSeconds = safeNum(competitionRules.delayed_quotes_seconds ?? 0);
      const marketStatus = "open";
      let tradingEnabled = true;
      if (accountId) {
        const { data: enabled } = await admin.rpc("is_account_trading_enabled", {
          p_account_id: accountId,
        });
        tradingEnabled = Boolean(enabled ?? true);
      }

      return json({
        symbol,
        trading_enabled: tradingEnabled,
        tradingview_symbol: alias?.tradingview_symbol ?? symbol,
        exchange: alias?.primary_exchange ?? symbolMeta?.exchange ?? null,
        primary_exchange: alias?.primary_exchange ?? symbolMeta?.exchange ?? null,
        competition_id: selectedCompetitionId,
        class_id: classId,
        previous_close: prevClose,
        last_price: lastClose || latestPrice,
        price: lastClose || latestPrice,
        change,
        change_percent: changePct,
        market_status: marketStatus,
        rules: competitionRules,
        chart_rules: {
          delayed_quotes_seconds: delayedQuotesSeconds,
          symbol_allowed: true,
          market_hours_mode: String(competitionRules.market_hours_mode ?? "relaxed"),
          short_selling_enabled: Boolean(competitionRules.short_selling_enabled ?? false),
        },
        overlays: {
          account_id: accountId,
          position,
          fills,
          avg_cost: position?.avg_cost ?? 0,
          current_position_qty: position?.qty ?? 0,
          day_pnl: 0,
        },
        position: position
          ? { qty: position.qty, avg_cost: position.avg_cost }
          : { qty: 0, avg_cost: 0 },
        candles: [],
      });
    }

    if (req.method === "GET" && path === "/ohlc") {
      const symbol = String(url.searchParams.get("symbol") ?? "").toUpperCase().trim();
      const timeframe = String(url.searchParams.get("tf") ?? "1m");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const limit = Number(url.searchParams.get("limit") ?? 1000);

      if (!symbol) {
        statusCode = 400;
        return json({ error: "symbol is required" }, 400);
      }

      const toTs = new Date(to || new Date().toISOString());
      const fromTs = new Date(from || new Date(toTs.getTime() - 24 * 60 * 60 * 1000).toISOString());

      const { data: bars, error } = await admin.rpc("get_ohlc_bars", {
        p_symbol: symbol,
        p_timeframe: timeframe,
        p_from: fromTs.toISOString(),
        p_to: toTs.toISOString(),
        p_limit: limit,
      });
      if (error) {
        statusCode = 500;
        return json({ error: error.message }, 500);
      }

      const formattedBars = (bars ?? []).map((b: any) => ({
        time: Math.floor(new Date(b.ts).getTime() / 1000),
        open: safeNum(b.o),
        high: safeNum(b.h),
        low: safeNum(b.l),
        close: safeNum(b.c),
        volume: safeNum(b.v),
      }));

      const { data: latestOne } = await admin
        .from("market_bars_cache")
        .select("ts")
        .eq("symbol", symbol)
        .eq("timeframe", "1m")
        .order("ts", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastUpdated = latestOne?.ts ? new Date(latestOne.ts) : new Date(0);
      const ageSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      const stale = ageSec > 180;

      return json({
        bars: formattedBars,
        meta: {
          tf: timeframe,
          last_updated_at: lastUpdated.toISOString(),
          stale,
        },
      });
    }

    statusCode = 404;
    return json({ error: `route not found: ${path}` }, 404);
  } catch (err) {
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
