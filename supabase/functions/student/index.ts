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
    const route = `student${parsePath(req)}`;

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
        // We allow teachers to view student endpoints too if they want to 'view as student', 
        // but primarily this is for role 'student'.

        const path = parsePath(req);
        const url = new URL(req.url);

        // 1. GET /leaderboard
        if (req.method === "GET" && path === "/leaderboard") {
            const competitionId = String(url.searchParams.get("competition_id") ?? "");
            const date = String(url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10));
            // Force 'simple' mode or redact logic for students
            const mode = String(url.searchParams.get("mode") ?? "rules_compliance_weighted");

            if (!competitionId) {
                statusCode = 400;
                return json({ error: "competition_id is required" }, 400);
            }

            // Check if student belongs to the class of this competition
            const { data: competition } = await admin
                .from("competitions")
                .select("class_id, rules_json")
                .eq("id", competitionId)
                .single();

            if (!competition) {
                statusCode = 404;
                return json({ error: "Competition not found" }, 404);
            }

            // Verify enrollment
            const { data: enrollment } = await admin
                .from("enrollments")
                .select("status")
                .eq("class_id", competition.class_id)
                .eq("student_id", userId)
                .eq("status", "active")
                .maybeSingle();

            if (!enrollment && auth.profile.role !== 'teacher' && auth.profile.role !== 'org_admin' && auth.profile.role !== 'platform_admin') {
                statusCode = 403;
                return json({ error: "Not enrolled in this class" }, 403);
            }

            // Compute scores (using same RPC as teacher, but we might redact names in code)
            const { data: scores, error } = await admin.rpc("compute_competition_scores", {
                p_competition_id: competitionId,
                p_date: date,
                p_mode: mode,
            });

            if (error) {
                statusCode = 400;
                return json({ error: error.message }, 400);
            }

            // Determine anonymity rules
            // (For P0, we assume names are visible to all classmates, but we can redact if needed)
            const showNames = true;

            const accountIds = (scores ?? []).map((s: any) => s.account_id);
            const { data: accounts } = await admin
                .from("trading_accounts")
                .select("id, user_id, profiles!inner(display_name)")
                .in("id", accountIds);

            const accountMap = new Map(
                (accounts ?? []).map((a: any) => [
                    a.id,
                    { student_id: a.user_id, display_name: a.profiles?.display_name }
                ])
            );

            const rankings = (scores ?? []).map((s: any) => {
                const acct = accountMap.get(s.account_id);
                const isMe = acct?.student_id === userId;

                return {
                    student_id: acct?.student_id,
                    rank: s.rank,
                    prev_rank: s.prev_rank || s.rank,
                    display_name: showNames || isMe ? acct?.display_name : "Student",
                    score: Number(s.score),
                    equity: Number(s.equity),
                    return_pct: Number(s.return_pct),
                    // Students might not see detailed breakdown of others, only themselves
                    // For P0, we send it all.
                    penalties: Number(s.total_penalties),
                    breakdown: s.score_breakdown,
                    is_me: isMe
                };
            });

            return json({
                competition_id: competitionId,
                generated_at: new Date().toISOString(),
                rankings
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
