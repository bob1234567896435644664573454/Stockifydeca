import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth, requireRole, roleAtLeastTeacher, type AuthContext } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";
import { parseJsonBody, z } from "../_shared/validation.ts";

function generateJoinCode(): string {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JOIN-${chunk}`;
}

async function joinStudentToClass(
  admin: ReturnType<typeof createServiceClient>,
  auth: AuthContext,
  cls: { id: string; org_id: string; school_id: string },
): Promise<Response | { joined: true; class_id: string }> {
  if (auth.profile.org_id && auth.profile.org_id !== cls.org_id) {
    return json({ error: "class outside user org" }, 403);
  }

  // First join sets tenant context on the profile. Keep existing values if already set.
  const profileUpdate: Record<string, unknown> = {};
  if (!auth.profile.org_id) profileUpdate.org_id = cls.org_id;
  if (!auth.profile.school_id) profileUpdate.school_id = cls.school_id;
  if (Object.keys(profileUpdate).length > 0) {
    await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", auth.user.id);
  }

  const { error: enrollmentErr } = await admin
    .from("enrollments")
    .upsert(
      {
        class_id: cls.id,
        student_id: auth.user.id,
        status: "active",
      },
      { onConflict: "class_id,student_id" },
    );

  if (enrollmentErr) {
    return json({ error: enrollmentErr.message }, 400);
  }

  const { data: existingAccount } = await admin
    .from("trading_accounts")
    .select("id")
    .eq("class_id", cls.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!existingAccount) {
    let startingCash = 100000;
    const { data: competition } = await admin
      .from("competitions")
      .select("rules_json")
      .eq("class_id", cls.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (competition?.rules_json?.starting_cash) {
      startingCash = Number(competition.rules_json.starting_cash);
    }

    const { data: account, error: accountErr } = await admin
      .from("trading_accounts")
      .insert({
        user_id: auth.user.id,
        org_id: cls.org_id,
        class_id: cls.id,
        base_currency: "USD",
        starting_cash: startingCash,
        cash_balance: startingCash,
        status: "active",
      })
      .select("id")
      .single();

    if (accountErr) {
      return json({ error: accountErr.message }, 400);
    }

    const { data: activeCompetition } = await admin
      .from("competitions")
      .select("id")
      .eq("class_id", cls.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCompetition?.id) {
      await admin.from("competition_accounts").upsert(
        {
          competition_id: activeCompetition.id,
          account_id: account.id,
        },
        { onConflict: "competition_id,account_id" },
      );
    }
  }

  return { joined: true, class_id: cls.id };
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `class${parsePath(req)}`;

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

    if (req.method === "POST" && path === "/create") {
      if (!roleAtLeastTeacher(auth.profile.role)) {
        statusCode = 403;
        return json({ error: "Forbidden" }, 403);
      }

      const parsed = parseJsonBody(
        z.object({
          name: z.string().min(1).max(120),
          school_id: z.string().uuid().optional(),
          teacher_id: z.string().uuid().optional(),
          org_id: z.string().uuid().optional(),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const body = parsed.data;
      const name = body.name.trim();
      const schoolId = String(body.school_id ?? auth.profile.school_id ?? "");
      const teacherId = auth.profile.role === "teacher"
        ? auth.user.id
        : String(body.teacher_id ?? auth.user.id);
      const orgId = auth.profile.role === "platform_admin"
        ? String(body.org_id ?? "")
        : String(auth.profile.org_id ?? body.org_id ?? "");

      if (!name || !schoolId || !orgId || !teacherId) {
        statusCode = 400;
        return json({ error: "name, school_id, teacher_id, org_id are required" }, 400);
      }

      if (auth.profile.role === "org_admin" && orgId !== auth.profile.org_id) {
        statusCode = 403;
        return json({ error: "org scope violation" }, 403);
      }

      const { data: cls, error } = await admin
        .from("classes")
        .insert({
          name,
          school_id: schoolId,
          teacher_id: teacherId,
          org_id: orgId,
          join_code: generateJoinCode(),
        })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ class: cls });
    }

    if (req.method === "POST" && path === "/rotate_join_code") {
      if (!roleAtLeastTeacher(auth.profile.role)) {
        statusCode = 403;
        return json({ error: "Forbidden" }, 403);
      }

      const parsed = parseJsonBody(
        z.object({ class_id: z.string().uuid() }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const classId = parsed.data.class_id;

      const { data: cls, error: classErr } = await admin
        .from("classes")
        .select("id, teacher_id, org_id")
        .eq("id", classId)
        .single();

      if (classErr || !cls) {
        statusCode = 404;
        return json({ error: "class not found" }, 404);
      }

      const canRotate = auth.profile.role === "platform_admin"
        || (auth.profile.role === "org_admin" && auth.profile.org_id === cls.org_id)
        || cls.teacher_id === auth.user.id;

      if (!canRotate) {
        statusCode = 403;
        return json({ error: "Forbidden" }, 403);
      }

      const joinCode = generateJoinCode();
      const { data, error } = await admin
        .from("classes")
        .update({ join_code: joinCode })
        .eq("id", classId)
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ class: data });
    }

    if (req.method === "POST" && path === "/resolve-code") {
      const roleErr = requireRole(auth, ["student"]);
      if (roleErr) {
        statusCode = roleErr.status;
        return roleErr;
      }

      const parsed = parseJsonBody(
        z.object({ code: z.string().min(3).max(64) }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }

      const joinCode = parsed.data.code.trim().toUpperCase();
      if (!joinCode) {
        statusCode = 400;
        return json({ error: "code is required" }, 400);
      }

      const { data: cls, error: classErr } = await admin
        .from("classes")
        .select("id, name, section, teacher_id, org_id")
        .eq("join_code", joinCode)
        .maybeSingle();

      if (classErr || !cls) {
        statusCode = 404;
        return json({ error: "invalid class code" }, 404);
      }

      if (auth.profile.org_id && auth.profile.org_id !== cls.org_id) {
        statusCode = 403;
        return json({ error: "class outside user org" }, 403);
      }

      const { data: teacherProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", cls.teacher_id)
        .maybeSingle();

      return json({
        id: cls.id,
        name: cls.name,
        section: cls.section,
        teacher_name: teacherProfile?.display_name ?? "Teacher",
      });
    }

    if (req.method === "POST" && path === "/join") {
      const roleErr = requireRole(auth, ["student"]);
      if (roleErr) {
        statusCode = roleErr.status;
        return roleErr;
      }

      const parsed = parseJsonBody(
        z.object({ class_id: z.string().uuid() }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }

      const classId = parsed.data.class_id;
      const { data: cls, error: classErr } = await admin
        .from("classes")
        .select("id, org_id, school_id")
        .eq("id", classId)
        .maybeSingle();

      if (classErr || !cls) {
        statusCode = 404;
        return json({ error: "class not found" }, 404);
      }

      const joinResult = await joinStudentToClass(admin, auth, {
        id: cls.id,
        org_id: cls.org_id,
        school_id: cls.school_id,
      });
      if (joinResult instanceof Response) {
        statusCode = joinResult.status;
        return joinResult;
      }

      return json(joinResult);
    }

    if (req.method === "POST" && path === "/join_via_code") {
      const roleErr = requireRole(auth, ["student"]);
      if (roleErr) {
        statusCode = roleErr.status;
        return roleErr;
      }

      const parsed = parseJsonBody(
        z.object({ join_code: z.string().min(3).max(64) }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const joinCode = parsed.data.join_code.trim();
      if (!joinCode) {
        statusCode = 400;
        return json({ error: "join_code is required" }, 400);
      }

      const { data: cls, error: classErr } = await admin
        .from("classes")
        .select("id, org_id, school_id")
        .eq("join_code", joinCode)
        .single();

      if (classErr || !cls) {
        statusCode = 404;
        return json({ error: "invalid join code" }, 404);
      }

      const joinResult = await joinStudentToClass(admin, auth, {
        id: cls.id,
        org_id: cls.org_id,
        school_id: cls.school_id,
      });
      if (joinResult instanceof Response) {
        statusCode = joinResult.status;
        return joinResult;
      }

      return json(joinResult);
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
