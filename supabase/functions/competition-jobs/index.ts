import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `competition-jobs${parsePath(req)}`;

  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const jobKey = Deno.env.get("COMPETITION_JOBS_KEY");
    const keyValid = jobKey && req.headers.get("x-jobs-key") === jobKey;

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
        date: new Date().toISOString().slice(0, 10),
        mode: "rules_compliance_weighted",
        results: [],
      });
    }

    const body = await req.json().catch(() => ({}));
    const date = String(body.date ?? new Date().toISOString().slice(0, 10));
    const mode = String(body.mode ?? "rules_compliance_weighted");

    const { data: competitions, error: compErr } = await admin
      .from("competitions")
      .select("id")
      .eq("status", "active");

    if (compErr) {
      statusCode = 500;
      return json({ error: compErr.message }, 500);
    }

    const results: Record<string, unknown>[] = [];
    for (const competition of competitions ?? []) {
      const competitionId = competition.id as string;

      const { data: snapCount, error: snapErr } = await admin.rpc("snapshot_competition_daily", {
        p_competition_id: competitionId,
        p_date: date,
      });

      if (snapErr) {
        results.push({ competition_id: competitionId, error: snapErr.message });
        continue;
      }

      const { data: lbCount, error: lbErr } = await admin.rpc("refresh_leaderboard", {
        p_competition_id: competitionId,
        p_date: date,
        p_mode: mode,
      });

      if (lbErr) {
        results.push({ competition_id: competitionId, snapshots: snapCount ?? 0, error: lbErr.message });
        continue;
      }

      results.push({
        competition_id: competitionId,
        snapshots: snapCount ?? 0,
        leaderboard_rows: lbCount ?? 0,
      });
    }

    return json({ ok: true, date, mode, results });
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
