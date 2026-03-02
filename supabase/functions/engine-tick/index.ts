import { createServiceClient } from "../_shared/supabase.ts";
import { parsePath, requestId } from "../_shared/http.ts";
import { logRequest } from "../_shared/logging.ts";

function engineJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function constantTimeEquals(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  const maxLen = Math.max(aa.length, bb.length);
  let diff = aa.length === bb.length ? 0 : 1;

  for (let i = 0; i < maxLen; i += 1) {
    const av = i < aa.length ? aa[i] : 0;
    const bv = i < bb.length ? bb[i] : 0;
    diff |= av ^ bv;
  }

  return diff === 0;
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const admin = createServiceClient();
  const route = `engine-tick${parsePath(req)}`;

  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") {
      statusCode = 405;
      return engineJson({ error: "method not allowed" }, 405);
    }

    const providedKey = req.headers.get("x-engine-key") ?? "";
    const jobKey = Deno.env.get("ENGINE_JOB_KEY") ?? "";
    const previousJobKey = Deno.env.get("ENGINE_JOB_KEY_PREVIOUS") ?? "";
    if (!jobKey) {
      statusCode = 500;
      return engineJson({ error: "engine job key is not configured" }, 500);
    }

    const matchesCurrent = constantTimeEquals(providedKey, jobKey);
    const matchesPrevious = previousJobKey.length > 0 && constantTimeEquals(providedKey, previousJobKey);
    if (!matchesCurrent && !matchesPrevious) {
      statusCode = 403;
      return engineJson({ error: "forbidden" }, 403);
    }

    if (req.method !== "POST") {
      statusCode = 405;
      return engineJson({ error: "method not allowed" }, 405);
    }

    const { data: incidentMode } = await admin.rpc("get_incident_mode");
    const paused = Boolean((incidentMode as Record<string, unknown> | null)?.paused ?? false);
    if (paused) {
      return engineJson({
        ok: true,
        paused: true,
        reason: (incidentMode as Record<string, unknown> | null)?.reason ?? "",
      });
    }

    const body = await req.json().catch(() => ({}));
    const maxOrders = Math.min(Math.max(Number(body.max_orders ?? 200), 1), 5000);
    const maxJobs = Math.min(Math.max(Number(body.max_jobs ?? 50), 1), 500);

    const { data: processedOrders, error: tickErr } = await admin.rpc("broker_engine_tick", {
      p_max_orders: maxOrders,
    });

    if (tickErr) {
      statusCode = 500;
      return engineJson({ error: tickErr.message }, 500);
    }

    const { data: processedJobs, error: jobsErr } = await admin.rpc("process_due_jobs", {
      p_max_jobs: maxJobs,
    });

    if (jobsErr) {
      statusCode = 500;
      return engineJson({ error: jobsErr.message }, 500);
    }

    return engineJson({
      ok: true,
      processed_orders: processedOrders ?? 0,
      processed_jobs: processedJobs ?? 0,
    });
  } catch (err) {
    console.error(err);
    statusCode = 500;
    return engineJson({ error: err instanceof Error ? err.message : "Internal error" }, 500);
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
