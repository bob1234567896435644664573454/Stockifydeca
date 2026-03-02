import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };
  const headerLine = headers.join(",");
  const lines = rows.map((row) => headers.map((h) => escape(row[h])).join(","));
  return `${headerLine}\n${lines.join("\n")}`;
}

function parseDateFilters(filters: unknown): { startDate: string | null; endDate: string | null } {
  const obj = typeof filters === "object" && filters !== null ? filters as Record<string, unknown> : {};
  const startDate = typeof obj.start_date === "string" ? obj.start_date : null;
  const endDate = typeof obj.end_date === "string" ? obj.end_date : null;
  return { startDate, endDate };
}

async function processOneJob(
  admin: ReturnType<typeof createServiceClient>,
  job: Record<string, unknown>,
): Promise<{ ok: true; jobId: string; rowCount: number } | { ok: false; jobId: string; error: string }> {
  const jobId = String(job.id);
  const classId = String(job.class_id ?? "");
  const competitionId = job.competition_id ? String(job.competition_id) : null;
  const type = String(job.type ?? "");
  const filters = job.filters_json;

  try {
    const { startDate, endDate } = parseDateFilters(filters);

    const { data: classAccounts } = await admin
      .from("trading_accounts")
      .select("id, user_id")
      .eq("class_id", classId);

    const accountToUser = new Map(
      (classAccounts ?? []).map((a) => [a.id as string, a.user_id as string]),
    );
    const userIds = [...new Set((classAccounts ?? []).map((a) => a.user_id as string))];
    const { data: profileRows } = userIds.length > 0
      ? await admin.from("profiles").select("user_id, display_name").in("user_id", userIds)
      : { data: [] as { user_id: string; display_name: string }[] };
    const userNameById = new Map(
      (profileRows ?? []).map((p) => [p.user_id as string, p.display_name as string]),
    );

    let scopedAccountIds = [...accountToUser.keys()];
    if (competitionId) {
      const { data: compAccounts } = await admin
        .from("competition_accounts")
        .select("account_id")
        .eq("competition_id", competitionId);
      const compSet = new Set((compAccounts ?? []).map((x) => x.account_id as string));
      scopedAccountIds = scopedAccountIds.filter((id) => compSet.has(id));
    }

    let rows: Record<string, unknown>[] = [];

    if (type === "trades_orders_fills") {
      if (scopedAccountIds.length > 0) {
        let fillsQuery = admin
          .from("fills")
          .select("id, order_id, account_id, symbol, qty, price, fees, slippage, filled_at")
          .in("account_id", scopedAccountIds)
          .order("filled_at", { ascending: false });
        if (startDate) fillsQuery = fillsQuery.gte("filled_at", `${startDate}T00:00:00Z`);
        if (endDate) fillsQuery = fillsQuery.lte("filled_at", `${endDate}T23:59:59Z`);
        const { data: fills } = await fillsQuery.limit(10000);

        const orderIds = [...new Set((fills ?? []).map((f) => f.order_id as string))];
        const { data: orderRows } = orderIds.length > 0
          ? await admin
            .from("orders")
            .select("id, side, order_type, tif")
            .in("id", orderIds)
          : { data: [] as { id: string; side: string; order_type: string; tif: string }[] };
        const orderById = new Map(
          (orderRows ?? []).map((o) => [o.id as string, o as { side: string; order_type: string; tif: string }]),
        );

        rows = (fills ?? []).map((r) => {
          const user = accountToUser.get(r.account_id as string);
          const order = orderById.get(r.order_id as string);
          return {
            fill_id: r.id,
            order_id: r.order_id,
            account_id: r.account_id,
            student: user ? (userNameById.get(user) ?? "") : "",
            symbol: r.symbol,
            qty: r.qty,
            price: r.price,
            fees: r.fees,
            slippage: r.slippage,
            side: order?.side ?? null,
            order_type: order?.order_type ?? null,
            tif: order?.tif ?? null,
            filled_at: r.filled_at,
          };
        });
      }
    } else if (type === "equity_curve") {
      if (!competitionId) {
        throw new Error("competition_id required for equity_curve");
      }
      let data: any[] = [];
      if (scopedAccountIds.length > 0) {
        let equityQuery = admin
          .from("performance_snapshots_daily")
          .select("date, account_id, equity, cash, pnl_day, pnl_total, return_pct, drawdown_pct")
          .eq("competition_id", competitionId)
          .in("account_id", scopedAccountIds)
          .order("date", { ascending: true });
        if (startDate) equityQuery = equityQuery.gte("date", startDate);
        if (endDate) equityQuery = equityQuery.lte("date", endDate);
        const { data: rowsData } = await equityQuery.limit(20000);
        data = rowsData ?? [];
      }
      rows = (data ?? []).map((r) => {
        const user = accountToUser.get(r.account_id as string);
        return {
          date: r.date,
          account_id: r.account_id,
          student: user ? (userNameById.get(user) ?? "") : "",
          equity: r.equity,
          cash: r.cash,
          pnl_day: r.pnl_day,
          pnl_total: r.pnl_total,
          return_pct: r.return_pct,
          drawdown_pct: r.drawdown_pct,
        };
      });
    } else if (type === "violations_log") {
      if (!competitionId) {
        throw new Error("competition_id required for violations_log");
      }
      let data: any[] = [];
      if (scopedAccountIds.length > 0) {
        let violationsQuery = admin
          .from("rule_violations")
          .select("id, account_id, rule_key, severity, details_json, created_at, resolved_at")
          .eq("competition_id", competitionId)
          .in("account_id", scopedAccountIds)
          .order("created_at", { ascending: false });
        if (startDate) violationsQuery = violationsQuery.gte("created_at", `${startDate}T00:00:00Z`);
        if (endDate) violationsQuery = violationsQuery.lte("created_at", `${endDate}T23:59:59Z`);
        const { data: rowsData } = await violationsQuery.limit(10000);
        data = rowsData ?? [];
      }
      rows = (data ?? []).map((r) => {
        const user = accountToUser.get(r.account_id as string);
        return {
          id: r.id,
          account_id: r.account_id,
          student: user ? (userNameById.get(user) ?? "") : "",
          rule_key: r.rule_key,
          severity: r.severity,
          details: JSON.stringify(r.details_json ?? {}),
          created_at: r.created_at,
          resolved_at: r.resolved_at,
        };
      });
    } else if (type === "holdings_end_period") {
      const { data } = scopedAccountIds.length > 0
        ? await admin
          .from("holdings_snapshot")
          .select("account_id, symbol, qty, avg_cost, realized_pnl, updated_at")
          .in("account_id", scopedAccountIds)
          .order("account_id", { ascending: true })
          .limit(10000)
        : { data: [] as any[] };
      rows = (data ?? []).map((r) => {
        const user = accountToUser.get(r.account_id as string);
        return {
          account_id: r.account_id,
          student: user ? (userNameById.get(user) ?? "") : "",
          symbol: r.symbol,
          qty: r.qty,
          avg_cost: r.avg_cost,
          realized_pnl: r.realized_pnl,
          updated_at: r.updated_at,
        };
      });
    } else {
      throw new Error(`unsupported export type: ${type}`);
    }

    const csv = toCsv(rows);
    const storagePath = `${classId}/${jobId}/${type}.csv`;
    const upload = await admin.storage
      .from("reports")
      .upload(storagePath, new TextEncoder().encode(csv), {
        contentType: "text/csv",
        upsert: true,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const { error: completeErr } = await admin.rpc("complete_report_job", {
      p_job_id: jobId,
      p_storage_path: storagePath,
    });
    if (completeErr) throw new Error(completeErr.message);

    return { ok: true, jobId, rowCount: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown export error";
    await admin.rpc("fail_report_job", {
      p_job_id: jobId,
      p_error: message,
    });
    return { ok: false, jobId, error: message };
  }
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `report-jobs${parsePath(req)}`;

  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const jobKey = Deno.env.get("REPORT_JOBS_KEY");
    const keyValid = jobKey && req.headers.get("x-report-key") === jobKey;

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
        claimed: 0,
        results: [],
      });
    }

    const body = await req.json().catch(() => ({}));
    const maxJobs = Math.min(Math.max(Number(body.max_jobs ?? 10), 1), 100);

    const { data: jobs, error: claimErr } = await admin.rpc("claim_report_jobs", {
      p_limit: maxJobs,
    });
    if (claimErr) {
      statusCode = 500;
      return json({ error: claimErr.message }, 500);
    }

    const results: Record<string, unknown>[] = [];
    for (const job of jobs ?? []) {
      results.push(await processOneJob(admin, job as Record<string, unknown>));
    }

    return json({
      ok: true,
      claimed: (jobs ?? []).length,
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
