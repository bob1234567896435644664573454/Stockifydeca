import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

// Credentials must be provided via env/secrets (do not hardcode).
const ALPACA_KEY = Deno.env.get("ALPACA_KEY") ?? "";
const ALPACA_SECRET = Deno.env.get("ALPACA_SECRET") ?? "";

const ALPACA_BASE = "https://data.alpaca.markets/v2/stocks";

type PriceBar = {
  price: number;
  ts: string;
  source: "alpaca" | "yahoo";
  bar?: {
    timeframe: string;
    ts: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  };
};

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function fetchFromAlpaca(symbol: string): Promise<PriceBar | null> {
  try {
    if (!ALPACA_KEY || !ALPACA_SECRET) return null;
    const headers = {
      "APCA-API-KEY-ID": ALPACA_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET,
      "accept": "application/json",
    };

    const [quoteResp, barResp] = await Promise.all([
      fetch(`${ALPACA_BASE}/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`, { headers }),
      fetch(`${ALPACA_BASE}/${encodeURIComponent(symbol)}/bars/latest?feed=iex`, { headers }),
    ]);

    if (!quoteResp.ok || !barResp.ok) return null;

    const quoteJson = await quoteResp.json();
    const barJson = await barResp.json();

    const q = quoteJson?.quote;
    const b = barJson?.bar;
    const bid = Number(q?.bp ?? 0);
    const ask = Number(q?.ap ?? 0);
    const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(q?.ap ?? q?.bp ?? 0);
    const close = Number(b?.c ?? 0);
    const price = isFinitePositive(mid) ? mid : close;

    if (!isFinitePositive(price)) return null;

    const ts = typeof q?.t === "string"
      ? q.t
      : (typeof b?.t === "string" ? b.t : new Date().toISOString());

    const bar = isFinitePositive(Number(b?.o)) && isFinitePositive(Number(b?.h))
      && isFinitePositive(Number(b?.l)) && isFinitePositive(Number(b?.c))
      ? {
        timeframe: "1m",
        ts: typeof b?.t === "string" ? b.t : new Date().toISOString(),
        o: Number(b.o),
        h: Number(b.h),
        l: Number(b.l),
        c: Number(b.c),
        v: Number(b.v ?? 0),
      }
      : undefined;

    return {
      price,
      ts,
      source: "alpaca",
      bar,
    };
  } catch {
    return null;
  }
}

async function fetchFromYahoo(symbol: string): Promise<PriceBar | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const resp = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "stockify-supabase/1.0",
      },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta ?? {};
    const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
    const quote = result.indicators?.quote?.[0] ?? {};

    const closes: number[] = Array.isArray(quote.close) ? quote.close.map((v: unknown) => Number(v)) : [];
    const opens: number[] = Array.isArray(quote.open) ? quote.open.map((v: unknown) => Number(v)) : [];
    const highs: number[] = Array.isArray(quote.high) ? quote.high.map((v: unknown) => Number(v)) : [];
    const lows: number[] = Array.isArray(quote.low) ? quote.low.map((v: unknown) => Number(v)) : [];
    const vols: number[] = Array.isArray(quote.volume) ? quote.volume.map((v: unknown) => Number(v)) : [];

    let idx = closes.length - 1;
    while (idx >= 0 && !isFinitePositive(closes[idx])) idx -= 1;

    const regular = Number(meta?.regularMarketPrice ?? 0);
    const price = idx >= 0 && isFinitePositive(closes[idx]) ? closes[idx] : regular;
    if (!isFinitePositive(price)) return null;

    const ts = idx >= 0 && timestamps[idx]
      ? new Date(Number(timestamps[idx]) * 1000).toISOString()
      : new Date().toISOString();

    const bar = idx >= 0
      ? {
        timeframe: "1m",
        ts,
        o: isFinitePositive(opens[idx]) ? opens[idx] : price,
        h: isFinitePositive(highs[idx]) ? highs[idx] : price,
        l: isFinitePositive(lows[idx]) ? lows[idx] : price,
        c: isFinitePositive(closes[idx]) ? closes[idx] : price,
        v: Number.isFinite(vols[idx]) ? vols[idx] : 0,
      }
      : undefined;

    return {
      price,
      ts,
      source: "yahoo",
      bar,
    };
  } catch {
    return null;
  }
}

async function upsertMarketData(
  admin: ReturnType<typeof createServiceClient>,
  symbol: string,
  data: PriceBar,
): Promise<void> {
  const { error: priceErr } = await admin
    .from("market_prices_latest")
    .upsert({
      symbol,
      ts: data.ts,
      price: data.price,
      source: data.source,
    });

  if (priceErr) throw new Error(priceErr.message);

  if (data.bar) {
    const { error: barErr } = await admin
      .from("market_bars_cache")
      .upsert({
        symbol,
        timeframe: data.bar.timeframe,
        ts: data.bar.ts,
        o: data.bar.o,
        h: data.bar.h,
        l: data.bar.l,
        c: data.bar.c,
        v: data.bar.v,
      });

    if (barErr) throw new Error(barErr.message);

    await admin
      .from("market_bars_cache")
      .delete()
      .eq("symbol", symbol)
      .eq("timeframe", data.bar.timeframe)
      .lt("ts", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `market-data${parsePath(req)}`;

  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const jobKey = Deno.env.get("MARKET_DATA_JOB_KEY");
    const keyValid = jobKey && req.headers.get("x-market-key") === jobKey;

    if (!keyValid) {
      const auth = await requireAuth(admin, req);
      if (auth instanceof Response) {
        statusCode = auth.status;
        return auth;
      }
      userId = auth.user.id;
      if (!["platform_admin", "org_admin"].includes(auth.profile.role)) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }
    }

    if (req.method !== "POST") {
      statusCode = 405;
      return json({ error: "method not allowed" }, 405);
    }

    const { data: incidentMode } = await admin.rpc("get_incident_mode");
    const paused = Boolean((incidentMode as Record<string, unknown> | null)?.paused ?? false);
    if (paused) {
      return json({
        ok: true,
        paused: true,
        reason: (incidentMode as Record<string, unknown> | null)?.reason ?? "",
        count: 0,
        success_count: 0,
        results: [],
      });
    }

    const body = await req.json().catch(() => ({}));
    const requestedSymbols = Array.isArray(body.symbols)
      ? body.symbols.map((s: unknown) => String(s).trim().toUpperCase()).filter(Boolean)
      : [];
    const limit = Math.min(Math.max(Number(body.limit ?? 250), 1), 1000);

    const symbols = requestedSymbols.length > 0
      ? requestedSymbols
      : ((await admin
        .from("symbol_master")
        .select("symbol")
        .eq("is_active", true)
        .order("symbol", { ascending: true })
        .limit(limit)).data ?? []).map((r) => String(r.symbol));

    const results: Record<string, unknown>[] = [];

    for (const symbol of symbols.slice(0, limit)) {
      let saved = false;
      let source: "alpaca" | "yahoo" | null = null;
      let errorText: string | null = null;

      const alpaca = await fetchFromAlpaca(symbol);
      if (alpaca) {
        try {
          await upsertMarketData(admin, symbol, alpaca);
          saved = true;
          source = "alpaca";
        } catch (err) {
          errorText = err instanceof Error ? err.message : "upsert failed";
        }
      }

      if (!saved) {
        const yahoo = await fetchFromYahoo(symbol);
        if (yahoo) {
          try {
            await upsertMarketData(admin, symbol, yahoo);
            saved = true;
            source = "yahoo";
            errorText = null;
          } catch (err) {
            errorText = err instanceof Error ? err.message : "upsert failed";
          }
        }
      }

      if (!saved) {
        await admin.rpc("record_dead_letter", {
          p_job_type: "market_data_pull",
          p_source_table: "symbol_master",
          p_source_id: null,
          p_payload: { symbol, providers: ["alpaca", "yahoo"] },
          p_error: errorText ?? "both providers failed",
          p_attempts: 1,
        });
      }

      results.push({
        symbol,
        success: saved,
        source,
        error: saved ? null : (errorText ?? "both providers failed"),
      });
    }

    return json({
      ok: true,
      count: results.length,
      success_count: results.filter((r) => r.success).length,
      results,
    });
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
