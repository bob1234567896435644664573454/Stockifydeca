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
  const route = `user${parsePath(req)}`;

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

    if (req.method === "POST" && path === "/invite") {
      const roleErr = requireRole(auth, ["platform_admin", "org_admin", "teacher"]);
      if (roleErr) {
        statusCode = roleErr.status;
        return roleErr;
      }

      const parsed = parseJsonBody(
        z.object({
          email: z.string().email(),
          role: z.enum(["platform_admin", "org_admin", "teacher", "student"]).default("student"),
          class_id: z.string().uuid().optional(),
          org_id: z.string().uuid().optional(),
          expires_days: z.coerce.number().int().min(1).max(365).default(7),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }

      const email = parsed.data.email.toLowerCase().trim();
      const role = parsed.data.role;
      const classId = parsed.data.class_id ?? null;
      const orgId = parsed.data.org_id ?? auth.profile.org_id;
      const expiresDays = parsed.data.expires_days ?? 7;

      if (!email || !orgId) {
        statusCode = 400;
        return json({ error: "email and org_id are required" }, 400);
      }
      if (auth.profile.role === "teacher") {
        if (!classId) {
          statusCode = 400;
          return json({ error: "teachers must provide class_id" }, 400);
        }
        const { data: cls } = await admin
          .from("classes")
          .select("id, teacher_id")
          .eq("id", classId)
          .maybeSingle();
        if (!cls || cls.teacher_id !== auth.user.id) {
          statusCode = 403;
          return json({ error: "teacher can only invite for own class" }, 403);
        }
      }

      if (auth.profile.role === "org_admin" && auth.profile.org_id !== orgId) {
        statusCode = 403;
        return json({ error: "org scope violation" }, 403);
      }

      const token = crypto.randomUUID().replaceAll("-", "");
      const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await admin
        .from("invitations")
        .insert({
          org_id: orgId,
          class_id: classId,
          email,
          role,
          token,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ invitation: data, token });
    }

    if (req.method === "POST" && path === "/role_update") {
      const roleErr = requireRole(auth, ["platform_admin", "org_admin"]);
      if (roleErr) {
        statusCode = roleErr.status;
        return roleErr;
      }

      const parsed = parseJsonBody(
        z.object({
          user_id: z.string().uuid(),
          role: z.enum(["platform_admin", "org_admin", "teacher", "student"]),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const targetUserId = parsed.data.user_id;
      const nextRole = parsed.data.role;

      const { data: target, error: targetErr } = await admin
        .from("profiles")
        .select("user_id, org_id")
        .eq("user_id", targetUserId)
        .single();

      if (targetErr || !target) {
        statusCode = 404;
        return json({ error: "target profile not found" }, 404);
      }

      if (auth.profile.role === "org_admin") {
        if (target.org_id !== auth.profile.org_id || nextRole === "platform_admin") {
          statusCode = 403;
          return json({ error: "org admin cannot assign this role" }, 403);
        }
      }

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ role: nextRole })
        .eq("user_id", targetUserId);

      if (updateErr) {
        statusCode = 400;
        return json({ error: updateErr.message }, 400);
      }

      const { error: authUpdateErr } = await admin.auth.admin.updateUserById(targetUserId, {
        app_metadata: { role: nextRole },
      });

      if (authUpdateErr) {
        statusCode = 400;
        return json({ error: authUpdateErr.message }, 400);
      }

      return json({ updated: true });
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
