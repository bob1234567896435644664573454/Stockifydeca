import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth, roleAtLeastTeacher } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";
import { parseJsonBody, z } from "../_shared/validation.ts";

const DEFAULT_COMP_RULES = {
  starting_cash: 100000,
  allowed_asset_types: ["stock", "etf"],
  allowed_symbols: [],
  banned_symbols: [],
  min_price: 5,
  max_spread_pct: 5,
  max_order_size: 500,
  max_position_size_pct: 25,
  max_trades_per_day: 30,
  max_orders_per_minute: 8,
  no_daytrade: false,
  daytrade_limit: 4,
  trade_cooldown_seconds: 10,
  market_hours_mode: "relaxed",
  slippage_model: { type: "bps", bps: 5 },
  fee_model: { type: "bps", bps: 0 },
  delayed_quotes_seconds: 15,
  short_selling_enabled: false,
  leverage_enabled: false,
  auto_liquidate_on_rule_break: false,
  news_blackout: false,
  research_tools_enabled: true,
  penny_stocks_disabled: true,
  min_limit_distance_bps: 3,
  score_mode: "rules_compliance_weighted",
};

function deepMerge(base: Record<string, unknown>, ...patches: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const patch of patches) {
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        typeof out[k] === "object" &&
        out[k] !== null &&
        !Array.isArray(out[k])
      ) {
        out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

function safeNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function getManageableClassIds(
  admin: ReturnType<typeof createServiceClient>,
  role: string,
  userId: string,
  orgId: string | null,
): Promise<Set<string>> {
  if (role === "platform_admin") {
    const { data } = await admin.from("classes").select("id");
    return new Set((data ?? []).map((c) => c.id as string));
  }

  if (role === "org_admin") {
    const { data } = await admin.from("classes").select("id").eq("org_id", orgId);
    return new Set((data ?? []).map((c) => c.id as string));
  }

  const { data } = await admin.from("classes").select("id").eq("teacher_id", userId);
  return new Set((data ?? []).map((c) => c.id as string));
}

Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const authHeader = req.headers.get("authorization");
  const anon = createAnonClient(authHeader);
  const admin = createServiceClient();
  const route = `teacher-console${parsePath(req)}`;

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

    if (!roleAtLeastTeacher(auth.profile.role)) {
      statusCode = 403;
      return json({ error: "Forbidden" }, 403);
    }

    const path = parsePath(req);
    const url = new URL(req.url);
    const manageableClassIds = await getManageableClassIds(
      admin,
      auth.profile.role,
      auth.user.id,
      auth.profile.org_id,
    );

    if (req.method === "GET" && path === "/incident_mode") {
      const { data, error } = await admin.rpc("get_incident_mode");
      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }
      return json({ incident_mode: data ?? { paused: false, reason: "" } });
    }

    if (req.method === "POST" && path === "/incident_mode") {
      if (auth.profile.role !== "platform_admin") {
        statusCode = 403;
        return json({ error: "platform_admin required" }, 403);
      }

      const parsed = parseJsonBody(
        z.object({
          paused: z.boolean(),
          reason: z.string().max(500).optional().default(""),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }

      const valueJson = {
        paused: parsed.data.paused,
        reason: (parsed.data.reason ?? "").trim(),
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from("system_controls")
        .upsert(
          {
            key: "incident_mode",
            value_json: valueJson,
            updated_by: auth.user.id,
          },
          { onConflict: "key" },
        )
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ incident_mode: data?.value_json ?? valueJson });
    }

    if (req.method === "GET" && path === "/roster") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
      const pageSize = Math.min(Math.max(Number(url.searchParams.get("page_size") ?? 50), 1), 200);
      const offset = (page - 1) * pageSize;
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data: enrollments, error } = await admin
        .from("enrollments")
        .select(
          "student_id, status, created_at, profiles!enrollments_student_id_fkey(display_name)",
        )
        .eq("class_id", classId)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const studentIds = (enrollments ?? []).map((row) => row.student_id as string);
      const { data: accounts } = studentIds.length > 0
        ? await admin
          .from("trading_accounts")
          .select("id, user_id, cash_balance, starting_cash")
          .eq("class_id", classId)
          .in("user_id", studentIds)
        : { data: [] as { id: string; user_id: string; cash_balance: number; starting_cash: number }[] };

      const accountByStudent = new Map(
        (accounts ?? []).map((a) => [a.user_id as string, a as { id: string; cash_balance: number; starting_cash: number }]),
      );
      const accountIds = (accounts ?? []).map((a) => a.id as string);

      let equityByAccount = new Map<string, number>();
      if (accountIds.length > 0) {
        const { data: positions } = await admin
          .from("holdings_snapshot")
          .select("account_id, symbol, qty")
          .in("account_id", accountIds);

        const symbols = [...new Set((positions ?? []).map((p) => p.symbol as string))];
        const { data: prices } = symbols.length > 0
          ? await admin.from("market_prices_latest").select("symbol, price").in("symbol", symbols)
          : { data: [] as { symbol: string; price: number }[] };
        const priceMap = new Map((prices ?? []).map((p) => [p.symbol as string, Number(p.price)]));

        const mvByAccount = new Map<string, number>();
        for (const p of positions ?? []) {
          const current = mvByAccount.get(p.account_id as string) ?? 0;
          mvByAccount.set(
            p.account_id as string,
            current + Number(p.qty) * (priceMap.get(p.symbol as string) ?? 0),
          );
        }

        for (const a of accounts ?? []) {
          equityByAccount.set(
            a.id as string,
            Number(a.cash_balance) + (mvByAccount.get(a.id as string) ?? 0),
          );
        }
      }

      const roster = (enrollments ?? []).map((row) => {
        const typed = row as unknown as {
          student_id: string;
          status: string;
          profiles: { display_name: string };
        };

        const account = accountByStudent.get(typed.student_id);
        return {
          student_id: typed.student_id,
          display_name: typed.profiles?.display_name,
          enrollment_status: typed.status,
          account_id: account?.id ?? null,
          cash_balance: account?.cash_balance ?? null,
          starting_cash: account?.starting_cash ?? null,
          equity: account?.id ? equityByAccount.get(account.id) ?? account.cash_balance : null,
        };
      });

      return json({ class_id: classId, roster, page_size: pageSize, offset });
    }

    if (req.method === "POST" && path === "/freeze") {
      const parsed = parseJsonBody(
        z.object({
          scope_type: z.enum(["class", "account"]),
          scope_id: z.string().uuid(),
          is_trading_enabled: z.boolean(),
          reason: z.string().max(500).optional().default(""),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const scopeType = parsed.data.scope_type;
      const scopeId = parsed.data.scope_id;
      const isTradingEnabled = parsed.data.is_trading_enabled;
      const reason = (parsed.data.reason ?? "").trim();

      let classId = scopeId;
      if (scopeType === "account") {
        const { data: account } = await admin
          .from("trading_accounts")
          .select("class_id")
          .eq("id", scopeId)
          .maybeSingle();
        classId = account?.class_id ?? "";
      }

      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data, error } = await admin
        .from("trading_controls")
        .upsert(
          {
            scope_type: scopeType,
            scope_id: scopeId,
            is_trading_enabled: isTradingEnabled,
            reason,
            updated_by: auth.user.id,
          },
          { onConflict: "scope_type,scope_id" },
        )
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: classId,
        action_type: "freeze_toggle",
        payload_json: {
          scope_type: scopeType,
          scope_id: scopeId,
          is_trading_enabled: isTradingEnabled,
          reason,
        },
      });

      return json({ control: data });
    }

    if (req.method === "POST" && path === "/competition/upsert_rules") {
      const parsed = parseJsonBody(
        z.object({
          class_id: z.string().uuid(),
          competition_id: z.string().uuid().optional(),
          name: z.string().min(1).max(120).default("Competition"),
          status: z.enum(["draft", "active", "paused", "completed", "archived"]).default("draft"),
          rules_json: z.record(z.any()).default({}),
          auto_lock_trading: z.boolean().default(true),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const classId = parsed.data.class_id;
      const competitionId = parsed.data.competition_id ?? null;
      const name = (parsed.data.name ?? "Competition").trim();
      const status = parsed.data.status;
      const rulesJson = (parsed.data.rules_json ?? {}) as Record<string, unknown>;
      const autoLockTrading = parsed.data.auto_lock_trading;

      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      let competition: Record<string, unknown> | null = null;
      if (competitionId) {
        const { data: existingComp } = await admin
          .from("competitions")
          .select("rules_json")
          .eq("id", competitionId)
          .eq("class_id", classId)
          .maybeSingle();

        const mergedRules = deepMerge(
          DEFAULT_COMP_RULES as Record<string, unknown>,
          (existingComp?.rules_json ?? {}) as Record<string, unknown>,
          rulesJson,
        );

        const { data, error } = await admin
          .from("competitions")
          .update({
            name,
            status,
            rules_json: mergedRules,
          })
          .eq("id", competitionId)
          .eq("class_id", classId)
          .select()
          .single();

        if (error) {
          statusCode = 400;
          return json({ error: error.message }, 400);
        }
        competition = data as unknown as Record<string, unknown>;
      } else {
        const mergedRules = deepMerge(
          DEFAULT_COMP_RULES as Record<string, unknown>,
          rulesJson,
        );

        const { data, error } = await admin
          .from("competitions")
          .insert({
            class_id: classId,
            name,
            status,
            rules_json: mergedRules,
          })
          .select()
          .single();

        if (error) {
          statusCode = 400;
          return json({ error: error.message }, 400);
        }
        competition = data as unknown as Record<string, unknown>;
      }

      if (status === "active" && competition?.id) {
        const { data: accounts } = await admin
          .from("trading_accounts")
          .select("id")
          .eq("class_id", classId);

        if ((accounts ?? []).length > 0) {
          await admin.from("competition_accounts").upsert(
            (accounts ?? []).map((a) => ({
              competition_id: competition?.id,
              account_id: a.id,
            })),
            { onConflict: "competition_id,account_id" },
          );
        }
      }

      if (autoLockTrading && (status === "completed" || status === "archived")) {
        await admin
          .from("trading_controls")
          .upsert(
            {
              scope_type: "class",
              scope_id: classId,
              is_trading_enabled: false,
              reason: `competition_${status}`,
              updated_by: auth.user.id,
            },
            { onConflict: "scope_type,scope_id" },
          );
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: classId,
        action_type: "competition_rules_upsert",
        payload_json: {
          competition_id: competition?.id,
          status,
          rules_json: (competition?.rules_json ?? rulesJson),
          auto_lock_trading: autoLockTrading,
        },
      });

      return json({ competition });
    }

    if (req.method === "POST" && path === "/account/reset") {
      const parsed = parseJsonBody(
        z.object({
          account_id: z.string().uuid(),
          starting_cash: z.coerce.number().nonnegative().optional(),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const accountId = parsed.data.account_id;
      const startingCash = parsed.data.starting_cash ?? null;

      const { data: account } = await admin
        .from("trading_accounts")
        .select("id, class_id")
        .eq("id", accountId)
        .maybeSingle();

      if (!account || !manageableClassIds.has(account.class_id as string)) {
        statusCode = 403;
        return json({ error: "account access denied" }, 403);
      }

      const { data, error } = await admin.rpc("reset_trading_account", {
        p_account_id: accountId,
        p_starting_cash: startingCash,
      });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: account.class_id,
        action_type: "account_reset",
        payload_json: {
          account_id: accountId,
          starting_cash: startingCash,
        },
      });

      return json({ result: data });
    }

    if (req.method === "POST" && path === "/announcements/create") {
      const parsed = parseJsonBody(
        z.object({
          class_id: z.string().uuid(),
          title: z.string().min(1).max(200),
          body: z.string().min(1).max(4000),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const classId = parsed.data.class_id;
      const title = parsed.data.title.trim();
      const announcementBody = parsed.data.body.trim();

      if (!manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data, error } = await admin
        .from("announcements")
        .insert({
          class_id: classId,
          created_by: auth.user.id,
          title,
          body: announcementBody,
        })
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: classId,
        action_type: "announcement_create",
        payload_json: { announcement_id: data.id },
      });

      return json({ announcement: data });
    }

    if (req.method === "GET" && path === "/signals") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
      const pageSize = Math.min(Math.max(Number(url.searchParams.get("page_size") ?? 50), 1), 200);
      const offset = (page - 1) * pageSize;
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data: activityFlags } = await admin
        .from("activity_flags")
        .select("id, account_id, flag_type, severity, details_json, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data: competitions } = await admin
        .from("competitions")
        .select("id")
        .eq("class_id", classId);

      const compIds = (competitions ?? []).map((c) => c.id as string);
      let ruleViolations: unknown[] = [];
      if (compIds.length > 0) {
        const { data } = await admin
          .from("rule_violations")
          .select("id, competition_id, account_id, rule_key, severity, details_json, created_at, resolved_at")
          .in("competition_id", compIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        ruleViolations = data ?? [];
      }

      return json({
        activity_flags: activityFlags ?? [],
        rule_violations: ruleViolations,
        page_size: pageSize,
        offset,
      });
    }

    if (req.method === "POST" && path === "/permissions/grant") {
      const parsed = parseJsonBody(
        z.object({
          class_id: z.string().uuid(),
          account_id: z.string().uuid(),
          permission_key: z.string().min(1).max(120),
          symbol: z.string().max(16).optional(),
          expires_at: z.string().datetime().optional(),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const classId = parsed.data.class_id;
      const accountId = parsed.data.account_id;
      const permissionKey = parsed.data.permission_key.trim();
      const symbol = parsed.data.symbol ? parsed.data.symbol.toUpperCase() : null;
      const expiresAt = parsed.data.expires_at ?? null;

      if (!manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data: account } = await admin
        .from("trading_accounts")
        .select("id, class_id")
        .eq("id", accountId)
        .maybeSingle();

      if (!account || account.class_id !== classId) {
        statusCode = 400;
        return json({ error: "account not in class" }, 400);
      }

      const { data, error } = await admin
        .from("special_permissions")
        .upsert(
          {
            class_id: classId,
            account_id: accountId,
            permission_key: permissionKey,
            symbol,
            granted_by: auth.user.id,
            expires_at: expiresAt,
          },
          { onConflict: "account_id,permission_key,symbol" },
        )
        .select()
        .single();

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: classId,
        action_type: "special_permission_grant",
        payload_json: { permission_key: permissionKey, symbol, account_id: accountId },
      });

      return json({ permission: data });
    }

    if (req.method === "POST" && path === "/exports/request") {
      const parsed = parseJsonBody(
        z.object({
          class_id: z.string().uuid(),
          competition_id: z.string().uuid().optional(),
          type: z.enum(["trades_orders_fills", "equity_curve", "violations_log", "holdings_end_period"]),
          filters: z.object({
            start_date: z.string().date().optional(),
            end_date: z.string().date().optional(),
          }).partial().default({}),
        }),
        await req.json().catch(() => ({})),
      );
      if (!parsed.ok) {
        statusCode = 400;
        return parsed.response;
      }
      const classId = parsed.data.class_id;
      const competitionId = parsed.data.competition_id ?? null;
      const type = parsed.data.type;
      const filters = parsed.data.filters;

      if (!classId || !type || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied or missing type" }, 403);
      }
      if ((type === "equity_curve" || type === "violations_log") && !competitionId) {
        statusCode = 400;
        return json({ error: "competition_id required for this export type" }, 400);
      }

      const { data: job, error: jobErr } = await admin
        .from("reports_export_jobs")
        .insert({
          requested_by: auth.user.id,
          class_id: classId,
          competition_id: competitionId,
          type,
          status: "queued",
          filters_json: filters,
          attempts: 0,
          next_run_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobErr || !job) {
        statusCode = 400;
        return json({ error: jobErr?.message ?? "failed creating job" }, 400);
      }

      await admin.from("teacher_actions_audit").insert({
        teacher_id: auth.user.id,
        class_id: classId,
        action_type: "export_enqueue",
        payload_json: {
          job_id: job.id,
          type,
          competition_id: competitionId,
        },
      });

      return json({
        job_id: job.id,
        status: "queued",
      });
    }

    if (req.method === "GET" && path === "/exports/list") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data: jobs, error } = await admin
        .from("reports_export_jobs")
        .select("id, type, status, storage_path, last_error, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const normalizedJobs = (jobs ?? []).map((job) => {
        const rawStatus = String(job.status ?? "");
        const status = rawStatus === "done"
          ? "done"
          : rawStatus === "failed" || rawStatus === "dead_letter"
          ? "failed"
          : rawStatus === "queued"
          ? "queued"
          : "processing";

        return {
          id: job.id,
          type: job.type,
          status,
          storage_path: job.storage_path,
          error: job.last_error ?? undefined,
          created_at: job.created_at,
        };
      });

      return json({ jobs: normalizedJobs });
    }

    if (req.method === "GET" && path === "/exports/download") {
      const jobId = String(url.searchParams.get("job_id") ?? "");
      if (!jobId) {
        statusCode = 400;
        return json({ error: "job_id is required" }, 400);
      }

      const { data: job } = await admin
        .from("reports_export_jobs")
        .select("id, class_id, requested_by, status, storage_path")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) {
        statusCode = 404;
        return json({ error: "job not found" }, 404);
      }

      const canRead = manageableClassIds.has(job.class_id as string) || job.requested_by === auth.user.id;
      if (!canRead) {
        statusCode = 403;
        return json({ error: "forbidden" }, 403);
      }

      if (job.status !== "done" || !job.storage_path) {
        statusCode = 409;
        return json({ error: "export not ready" }, 409);
      }

      const { data: signed } = await admin.storage
        .from("reports")
        .createSignedUrl(job.storage_path as string, 3600);

      return json({
        job_id: job.id,
        status: job.status,
        signed_url: signed?.signedUrl ?? null,
      });
    }

    if (req.method === "GET" && path === "/leaderboard") {
      const competitionId = String(url.searchParams.get("competition_id") ?? "");
      const date = String(url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10));
      const mode = String(url.searchParams.get("mode") ?? "rules_compliance_weighted");
      const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
      const pageSize = Math.min(Math.max(Number(url.searchParams.get("page_size") ?? 100), 1), 500);
      const offset = (page - 1) * pageSize;
      if (!competitionId) {
        statusCode = 400;
        return json({ error: "competition_id is required" }, 400);
      }

      const { data: competition } = await admin
        .from("competitions")
        .select("id, class_id")
        .eq("id", competitionId)
        .maybeSingle();

      if (!competition || !manageableClassIds.has(competition.class_id as string)) {
        statusCode = 403;
        return json({ error: "competition access denied" }, 403);
      }

      const { data: scores, error } = await admin.rpc("compute_competition_scores", {
        p_competition_id: competitionId,
        p_date: date,
        p_mode: mode,
      });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const { data: accounts } = await admin
        .from("trading_accounts")
        .select("id, user_id, profiles!inner(display_name)")
        .eq("class_id", competition.class_id)
        .in("id", (scores ?? []).map((s: any) => s.account_id));

      const accountMap = new Map(
        (accounts ?? []).map((a: any) => [
          a.id,
          { student_id: a.user_id, display_name: a.profiles?.display_name },
        ]),
      );

      const rankings = (scores ?? [])
        .sort((a: any, b: any) => safeNum(b.score) - safeNum(a.score))
        .map((s: any, idx: number) => {
        const acct = accountMap.get(s.account_id);
        return {
          student_id: acct?.student_id,
          display_name: acct?.display_name,
          rank: idx + 1,
          prev_rank: safeNum(s.prev_rank) || (idx + 1),
          score: safeNum(s.score),
          equity: safeNum(s.equity),
          return_pct: safeNum(s.return_pct),
          penalties: safeNum(s.total_penalties),
          breakdown: s.score_breakdown,
        };
      });

      return json({
        generated_at: new Date().toISOString(),
        rankings,
        page_size: pageSize,
        offset,
      });
    }

    if (req.method === "GET" && path === "/competitions") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data: competitions, error } = await admin
        .from("competitions")
        .select("id,class_id,name,status,rules_json,created_at,updated_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      return json({ competitions: competitions ?? [] });
    }

    if (req.method === "GET" && path === "/announcements") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data, error } = await admin
        .from("announcements")
        .select("id, class_id, title, body, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const items = (data ?? []).map((a) => ({
        id: a.id,
        class_id: a.class_id,
        title: a.title,
        content: a.body,
        priority: "medium",
        created_at: a.created_at,
      }));
      return json({ items });
    }

    if (req.method === "GET" && path === "/audit") {
      const classId = String(url.searchParams.get("class_id") ?? "");
      if (!classId || !manageableClassIds.has(classId)) {
        statusCode = 403;
        return json({ error: "class access denied" }, 403);
      }

      const { data, error } = await admin
        .from("teacher_actions_audit")
        .select("id, action_type, teacher_id, payload_json, created_at, profiles!teacher_actions_audit_teacher_id_fkey(display_name)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        statusCode = 400;
        return json({ error: error.message }, 400);
      }

      const logs = (data ?? []).map((row: any) => ({
        id: row.id,
        action: String(row.action_type ?? "unknown"),
        actor_id: row.teacher_id,
        actor_name: row.profiles?.display_name ?? "Teacher",
        details: JSON.stringify(row.payload_json ?? {}),
        created_at: row.created_at,
        severity: "info",
      }));
      return json({ logs });
    }

    if (req.method === "GET" && path === "/analytics/student") {
      const studentId = String(url.searchParams.get("student_id") ?? "");
      const competitionId = String(url.searchParams.get("competition_id") ?? "");

      if (!studentId) {
        statusCode = 400;
        return json({ error: "student_id is required" }, 400);
      }

      // Check access: teacher must have access to the student's class
      const { data: account } = await admin
        .from("trading_accounts")
        .select("id, class_id")
        .eq("user_id", studentId)
        .maybeSingle();

      if (!account || !manageableClassIds.has(account.class_id)) {
        statusCode = 403;
        return json({ error: "access denied" }, 403);
      }

      let selectedCompetitionId: string | null = null;
      if (competitionId) {
        const { data: explicitCompetition } = await admin
          .from("competitions")
          .select("id")
          .eq("id", competitionId)
          .eq("class_id", account.class_id)
          .maybeSingle();
        selectedCompetitionId = explicitCompetition?.id ?? null;
      } else {
        const { data: linkedCompetitions } = await admin
          .from("competition_accounts")
          .select("competition_id, competitions!inner(status)")
          .eq("account_id", account.id);

        selectedCompetitionId = ((linkedCompetitions ?? []).find((row: any) => {
          const comp = row.competitions;
          if (Array.isArray(comp)) return comp.some((c: any) => c?.status === "active");
          return comp?.status === "active";
        })?.competition_id as string | undefined) ?? null;
      }

      // Fetch equity curve from daily performance snapshots
      const { data: curve } = selectedCompetitionId
        ? await admin
          .from("performance_snapshots_daily")
          .select("date, equity")
          .eq("competition_id", selectedCompetitionId)
          .eq("account_id", account.id)
          .order("date", { ascending: true })
        : { data: [] as any[] };

      // Fetch violations
      let violations: any[] = [];
      if (selectedCompetitionId) {
        const { data: v } = await admin
          .from("rule_violations")
          .select("id,account_id,competition_id,rule_key,severity,created_at,resolved_at")
          .eq("account_id", account.id)
          .eq("competition_id", selectedCompetitionId)
          .order("created_at", { ascending: false });
        violations = v ?? [];
      }

      // Risk metrics from nightly pipeline if available.
      const { data: risk } = selectedCompetitionId
        ? await admin
          .from("risk_metrics")
          .select("sharpe_proxy, max_drawdown, win_rate")
          .eq("competition_id", selectedCompetitionId)
          .eq("account_id", account.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle()
        : { data: null as any };

      const curvePoints = (curve ?? []).map((c: any) => ({
        date: c.date,
        equity: safeNum(c.equity),
      }));

      // Fallback metrics from equity curve when risk_metrics is not populated yet.
      const returns: number[] = [];
      for (let i = 1; i < curvePoints.length; i++) {
        const prev = curvePoints[i - 1].equity;
        const curr = curvePoints[i].equity;
        if (prev > 0) returns.push((curr - prev) / prev);
      }

      const avg = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const variance = returns.length
        ? returns.reduce((a, b) => a + ((b - avg) ** 2), 0) / returns.length
        : 0;
      const stdev = Math.sqrt(Math.max(variance, 0));
      const sharpeFallback = stdev > 0 ? (avg / stdev) * Math.sqrt(252) : 0;

      let peak = 0;
      let maxDd = 0;
      for (const point of curvePoints) {
        peak = Math.max(peak, point.equity);
        if (peak > 0) {
          const dd = (point.equity - peak) / peak;
          maxDd = Math.min(maxDd, dd);
        }
      }

      const { data: sellFills } = await admin
        .from("fills")
        .select("price, qty, fees, orders!inner(side)")
        .eq("account_id", account.id)
        .order("filled_at", { ascending: true });

      let buyQty = 0;
      let buyCost = 0;
      let wins = 0;
      let sells = 0;
      for (const row of (sellFills ?? []) as any[]) {
        const side = row.orders?.side;
        const qty = safeNum(row.qty);
        const price = safeNum(row.price);
        const fees = safeNum(row.fees);
        if (side === "buy") {
          buyQty += qty;
          buyCost += (qty * price) + fees;
        } else if (side === "sell") {
          sells += 1;
          const avgCost = buyQty > 0 ? (buyCost / buyQty) : 0;
          const pnl = (price - avgCost) * qty - fees;
          if (pnl > 0) wins += 1;
          buyQty = Math.max(0, buyQty - qty);
          buyCost = Math.max(0, buyCost - (avgCost * qty));
        }
      }

      const metrics = {
        sharpe: safeNum(risk?.sharpe_proxy ?? sharpeFallback),
        drawdown_max: safeNum(risk?.max_drawdown ?? maxDd),
        win_rate: safeNum(risk?.win_rate ?? (sells > 0 ? (wins / sells) : 0)),
      };

      return json({
        student_id: studentId,
        competition_id: selectedCompetitionId,
        equity_curve: curvePoints,
        metrics,
        violations,
      });
    }

    statusCode = 404;
    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    statusCode = 500;
    return json({ error: err.message }, 500);
  } finally {
    await logRequest(admin, {
      requestId: reqId,
      userId,
      route,
      status: statusCode,
      latencyMs: Date.now() - start
    });
  }
});
