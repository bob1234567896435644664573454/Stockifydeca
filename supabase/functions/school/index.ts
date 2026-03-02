import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth, requireRole } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";
import { parseJsonBody, z } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `school${parsePath(req)}`;

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

    const roleErr = requireRole(auth, ["platform_admin", "org_admin"]);
    if (roleErr) {
      statusCode = roleErr.status;
      return roleErr;
    }

    const path = parsePath(req);
    if (req.method === "POST" && path === "/create") {
      const parsed = parseJsonBody(
        z.object({
          org_id: z.string().uuid().optional(),
          name: z.string().min(1).max(160),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const orgId = parsed.data.org_id ?? String(auth.profile.org_id ?? "");
      const name = parsed.data.name.trim();
      if (!orgId) {
        statusCode = 400;
        return json({ error: "org_id is required" }, 400);
      }

      if (auth.profile.role === "org_admin" && auth.profile.org_id !== orgId) {
        statusCode = 403;
        return json({ error: "org scope violation" }, 403);
      }

      const { data, error } = await admin
        .from("schools")
        .insert({ org_id: orgId, name })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ school: data });
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
