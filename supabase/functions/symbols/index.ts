import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId, getPagination } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

async function getUserClassIds(
  admin: ReturnType<typeof createServiceClient>,
  role: string,
  userId: string,
  orgId: string | null,
): Promise<Set<string>> {
  if (role === "platform_admin") {
    const { data } = await admin.from("classes").select("id");
    return new Set((data ?? []).map((row) => row.id as string));
  }

  if (role === "org_admin") {
    const { data } = await admin.from("classes").select("id").eq("org_id", orgId);
    return new Set((data ?? []).map((row) => row.id as string));
  }

  if (role === "teacher") {
    const { data } = await admin.from("classes").select("id").eq("teacher_id", userId);
    return new Set((data ?? []).map((row) => row.id as string));
  }

  const { data } = await admin
    .from("enrollments")
    .select("class_id")
    .eq("student_id", userId)
    .eq("status", "active");

  return new Set((data ?? []).map((row) => row.class_id as string));
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `symbols${parsePath(req)}`;

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
    const userClassIds = await getUserClassIds(
      admin,
      auth.profile.role,
      auth.user.id,
      auth.profile.org_id,
    );

    if (req.method === "GET" && (path === "/search" || path === "/symbols/search")) {
      const q = String(url.searchParams.get("q") ?? "").trim().toUpperCase();
      const { limit, offset } = getPagination(url);

      let query = admin
        .from("symbol_master")
        .select("symbol, name, exchange, asset_type, is_active, symbol_aliases(tradingview_symbol, primary_exchange)")
        .eq("is_active", true)
        .order("symbol", { ascending: true })
        .range(offset, offset + limit - 1);

      if (q) {
        query = query.or(`symbol.ilike.%${q}%,name.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ items: data ?? [], page_size: limit, offset });
    }

    if (req.method === "GET" && (path === "/featured" || path === "/symbols/featured")) {
      const classId = url.searchParams.get("class_id");
      const competitionId = url.searchParams.get("competition_id");
      const { limit, offset } = getPagination(url);

      if (classId && !userClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      let query = admin
        .from("featured_symbols")
        .select("id, class_id, competition_id, symbol, reason, rank, updated_at")
        .order("rank", { ascending: true })
        .range(offset, offset + limit - 1);

      if (competitionId) {
        query = query.eq("competition_id", competitionId);
      } else if (classId) {
        query = query.eq("class_id", classId);
      } else {
        const classIds = [...userClassIds];
        if (classIds.length > 0) {
          query = query.or(`class_id.is.null,class_id.in.(${classIds.join(",")})`);
        } else {
          query = query.is("class_id", null);
        }
      }

      const { data, error } = await query;
      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const symbols = [...new Set((data ?? []).map((x) => x.symbol as string))];
      const { data: aliases } = symbols.length > 0
        ? await admin.from("symbol_aliases").select("symbol, tradingview_symbol, primary_exchange").in("symbol", symbols)
        : { data: [] as { symbol: string; tradingview_symbol: string; primary_exchange: string }[] };

      const aliasMap = new Map((aliases ?? []).map((a) => [a.symbol as string, a]));
      const items = (data ?? []).map((row) => ({
        ...row,
        tradingview_symbol: aliasMap.get(row.symbol as string)?.tradingview_symbol ?? row.symbol,
        primary_exchange: aliasMap.get(row.symbol as string)?.primary_exchange ?? null,
      }));

      return json({ items, page_size: limit, offset });
    }

    if (req.method === "GET" && path === "/watchlists") {
      const ownerType = url.searchParams.get("owner_type");
      const { limit, offset } = getPagination(url);
      const selectClause =
        "id, owner_type, owner_id, name, created_by, created_at, watchlist_items(symbol, added_at)";

      if (ownerType === "user") {
        const { data, error } = await admin
          .from("watchlists")
          .select(selectClause)
          .eq("owner_type", "user")
          .eq("owner_id", auth.user.id)
          .order("created_at", { ascending: false });
        if (error) {
          statusCode = 400;
          return json({ error: error.message }, 400);
        }
        return json({ items: (data ?? []).slice(offset, offset + limit), page_size: limit, offset });
      }

      if (ownerType === "class") {
        const classIds = [...userClassIds];
        if (classIds.length === 0) return json({ items: [] });
        const { data, error } = await admin
          .from("watchlists")
          .select(selectClause)
          .eq("owner_type", "class")
          .in("owner_id", classIds)
          .order("created_at", { ascending: false });
        if (error) {
          statusCode = 400;
          return json({ error: error.message }, 400);
        }
        return json({ items: (data ?? []).slice(offset, offset + limit), page_size: limit, offset });
      }

      const { data: userLists, error: userErr } = await admin
        .from("watchlists")
        .select(selectClause)
        .eq("owner_type", "user")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (userErr) {
        statusCode = 400;
        return json({ error: userErr.message }, 400);
      }

      let classLists: unknown[] = [];
      if (userClassIds.size > 0) {
        const { data: classData, error: classErr } = await admin
          .from("watchlists")
          .select(selectClause)
          .eq("owner_type", "class")
          .in("owner_id", [...userClassIds])
          .order("created_at", { ascending: false });
        if (classErr) {
          statusCode = 400;
          return json({ error: classErr.message }, 400);
        }
        classLists = classData ?? [];
      }

      const items = [...(userLists ?? []), ...classLists].sort((a: any, b: any) =>
        String(b.created_at).localeCompare(String(a.created_at))
      );
      return json({ items: items.slice(offset, offset + limit), page_size: limit, offset });
    }

    if (req.method === "POST" && path === "/watchlists/create") {
      const body = await req.json();
      const ownerType = String(body.owner_type ?? "user");
      const ownerId = String(body.owner_id ?? auth.user.id);
      const name = String(body.name ?? "").trim();
      if (!name || !["user", "class"].includes(ownerType)) {
        statusCode = 400;
        return json({ error: "invalid owner_type or name" }, 400);
      }

      if (ownerType === "user" && ownerId !== auth.user.id) {
        statusCode = 403;
        return json({ error: "user watchlist must be owned by caller" }, 403);
      }

      if (ownerType === "class") {
        if (!userClassIds.has(ownerId) || auth.profile.role === "student") {
          statusCode = 403;
          return json({ error: "class watchlists require teacher or admin access" }, 403);
        }
      }

      const { data, error } = await admin
        .from("watchlists")
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          name,
          created_by: auth.user.id,
        })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ watchlist: data });
    }

    if (req.method === "POST" && path === "/watchlists/add_item") {
      const body = await req.json();
      const watchlistId = String(body.watchlist_id ?? "");
      const symbol = String(body.symbol ?? "").toUpperCase().trim();
      if (!watchlistId || !symbol) {
        statusCode = 400;
        return json({ error: "watchlist_id and symbol are required" }, 400);
      }

      const { data: watchlist } = await admin
        .from("watchlists")
        .select("id, owner_type, owner_id, created_by")
        .eq("id", watchlistId)
        .maybeSingle();

      if (!watchlist) {
        statusCode = 404;
        return json({ error: "watchlist not found" }, 404);
      }

      const canEdit = watchlist.owner_type === "user"
        ? watchlist.owner_id === auth.user.id
        : (userClassIds.has(watchlist.owner_id as string) && auth.profile.role !== "student");

      if (!canEdit) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { data: sym } = await admin
        .from("symbol_master")
        .select("symbol")
        .eq("symbol", symbol)
        .eq("is_active", true)
        .maybeSingle();

      if (!sym) {
        statusCode = 400;
        return json({ error: "unknown or inactive symbol" }, 400);
      }

      const { data, error } = await admin
        .from("watchlist_items")
        .upsert({ watchlist_id: watchlistId, symbol }, { onConflict: "watchlist_id,symbol" })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ item: data });
    }

    if (req.method === "POST" && path === "/watchlists/remove_item") {
      const body = await req.json();
      const watchlistId = String(body.watchlist_id ?? "");
      const symbol = String(body.symbol ?? "").toUpperCase().trim();
      if (!watchlistId || !symbol) {
        statusCode = 400;
        return json({ error: "watchlist_id and symbol are required" }, 400);
      }

      const { data: watchlist } = await admin
        .from("watchlists")
        .select("id, owner_type, owner_id")
        .eq("id", watchlistId)
        .maybeSingle();

      if (!watchlist) {
        statusCode = 404;
        return json({ error: "watchlist not found" }, 404);
      }

      const canEdit = watchlist.owner_type === "user"
        ? watchlist.owner_id === auth.user.id
        : (userClassIds.has(watchlist.owner_id as string) && auth.profile.role !== "student");

      if (!canEdit) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      const { error } = await admin
        .from("watchlist_items")
        .delete()
        .eq("watchlist_id", watchlistId)
        .eq("symbol", symbol);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ removed: true });
    }

    if (req.method === "GET" && path === "/charts/context") {
      const symbol = String(url.searchParams.get("symbol") ?? "").toUpperCase().trim();
      const competitionId = url.searchParams.get("competition_id");
      const accountIdInput = url.searchParams.get("account_id");
      if (!symbol) {
        statusCode = 400;
        return json({ error: "symbol is required" }, 400);
      }

      const { data: alias } = await admin
        .from("symbol_aliases")
        .select("tradingview_symbol, primary_exchange, metadata_json")
        .eq("symbol", symbol)
        .maybeSingle();

      let competitionRules: Record<string, unknown> = {};
      let classId: string | null = null;
      if (competitionId) {
        const { data: competition } = await admin
          .from("competitions")
          .select("id, class_id, rules_json")
          .eq("id", competitionId)
          .maybeSingle();

        if (competition) {
          classId = competition.class_id as string;
          if (!userClassIds.has(classId)) {
            statusCode = 403;
            return json({ error: "competition access denied" }, 403);
          }
          competitionRules = (competition.rules_json ?? {}) as Record<string, unknown>;
        }
      }

      let accountId = accountIdInput;
      if (!accountId) {
        if (competitionId) {
          const { data: account } = await admin
            .from("competition_accounts")
            .select("account_id, trading_accounts!inner(user_id)")
            .eq("competition_id", competitionId)
            .eq("trading_accounts.user_id", auth.user.id)
            .maybeSingle();
          accountId = (account?.account_id as string) ?? null;
        } else {
          const { data: account } = await admin
            .from("trading_accounts")
            .select("id")
            .eq("user_id", auth.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          accountId = (account?.id as string) ?? null;
        }
      }

      let fills: any[] = [];
      let position: { qty: number; avg_cost: number; realized_pnl: number } | null = null;
      let dayPnl = 0;

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

        if (canRead) {
          const { data: fillsData } = await admin
            .from("fills")
            .select("id, order_id, qty, price, fees, slippage, filled_at, orders!inner(side)")
            .eq("account_id", accountId)
            .eq("symbol", symbol)
            .order("filled_at", { ascending: true })
            .limit(2000);

          fills = (fillsData ?? []).map((f) => ({
            id: f.id,
            order_id: f.order_id,
            side: (f as any).orders?.side,
            qty: Number(f.qty),
            price: Number(f.price),
            fees: Number(f.fees),
            slippage: Number(f.slippage),
            filled_at: f.filled_at,
          }));

          const { data: positionData } = await admin
            .from("holdings_snapshot")
            .select("qty, avg_cost, realized_pnl")
            .eq("account_id", accountId)
            .eq("symbol", symbol)
            .maybeSingle();

          if (positionData) {
            position = {
              qty: Number(positionData.qty),
              avg_cost: Number(positionData.avg_cost),
              realized_pnl: Number(positionData.realized_pnl),
            };
          }

          const today = new Date().toISOString().slice(0, 10);
          const dayFills = fills.filter((f) => String(f.filled_at).startsWith(today));
          for (const f of dayFills) {
            if (f.side === "sell") {
              dayPnl += (Number(f.price) - (position?.avg_cost ?? 0)) * Number(f.qty) - Number(f.fees);
            } else {
              dayPnl -= Number(f.fees);
            }
          }

          const { data: latestPrice } = await admin
            .from("market_prices_latest")
            .select("price")
            .eq("symbol", symbol)
            .maybeSingle();
          const currentPrice = Number(latestPrice?.price ?? 0);
          if (position) {
            dayPnl += position.qty * (currentPrice - position.avg_cost);
          }
        }
      }

      const allowedSymbols = Array.isArray(competitionRules.allowed_symbols)
        ? competitionRules.allowed_symbols as string[]
        : null;
      const bannedSymbols = Array.isArray(competitionRules.banned_symbols)
        ? competitionRules.banned_symbols as string[]
        : [];

      const symbolAllowed =
        (!allowedSymbols || allowedSymbols.includes(symbol)) && !bannedSymbols.includes(symbol);

      return json({
        symbol,
        tradingview_symbol: alias?.tradingview_symbol ?? symbol,
        primary_exchange: alias?.primary_exchange ?? null,
        competition_id: competitionId,
        class_id: classId,
        chart_rules: {
          delayed_quotes_seconds: Number(competitionRules.delayed_quotes_seconds ?? 0),
          symbol_allowed: symbolAllowed,
          market_hours_mode: competitionRules.market_hours_mode ?? "strict",
          short_selling_enabled: Boolean(competitionRules.short_selling_enabled ?? false),
        },
        overlays: {
          account_id: accountId,
          position,
          fills,
          avg_cost: position?.avg_cost ?? 0,
          current_position_qty: position?.qty ?? 0,
          day_pnl: dayPnl,
        },
      });
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
