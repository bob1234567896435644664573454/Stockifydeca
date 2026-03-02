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
  const route = `watchlists${parsePath(req)}`;

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

    if (req.method === "GET" && path === "/") {
      const { limit, offset } = getPagination(url);
      const { data: userLists, error: userErr } = await admin
        .from("watchlists")
        .select("id, owner_type, owner_id, name, created_by, created_at, watchlist_items(symbol, added_at)")
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
          .select("id, owner_type, owner_id, name, created_by, created_at, watchlist_items(symbol, added_at)")
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

    if (req.method === "POST" && path === "/create") {
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

    if (req.method === "POST" && path === "/add_item") {
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

    if (req.method === "POST" && path === "/remove_item") {
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
