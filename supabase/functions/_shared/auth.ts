import { json } from "./http.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as jose from "jsr:@panva/jose@6";

export type AppRole = "platform_admin" | "org_admin" | "teacher" | "student";

export interface AuthContext {
  user: { id: string };
  profile: {
    user_id: string;
    role: AppRole;
    org_id: string | null;
    school_id: string | null;
    display_name: string;
  };
}

function getBearer(req: Request): string {
  const h = req.headers.get("authorization");
  if (!h) throw new Error("Missing authorization header");
  const [t, token] = h.split(" ");
  if (t !== "Bearer" || !token) throw new Error("Bad authorization header");
  return token;
}

let _jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
function jwks(): ReturnType<typeof jose.createRemoteJWKSet> {
  if (_jwks) return _jwks;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL not set");
  _jwks = jose.createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return _jwks;
}

function issuer(): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL not set");
  return Deno.env.get("SB_JWT_ISSUER") ?? `${supabaseUrl}/auth/v1`;
}

export async function requireAuth(
  serviceClient: SupabaseClient,
  req: Request,
): Promise<AuthContext | Response> {
  let sub: string | null = null;
  try {
    const token = getBearer(req);
    const jwtSecret = Deno.env.get("JWT_SECRET");

    let payload;
    if (jwtSecret) {
      const secret = new TextEncoder().encode(jwtSecret);
      const result = await jose.jwtVerify(token, secret, { issuer: issuer() });
      payload = result.payload;
    } else {
      const { payload: p } = await jose.jwtVerify(token, jwks(), { issuer: issuer() });
      payload = p;
    }

    // Optional defense-in-depth: Supabase access tokens typically carry aud=authenticated.
    const aud = payload.aud;
    const audOk = aud === undefined ||
      aud === "authenticated" ||
      (Array.isArray(aud) && aud.includes("authenticated"));
    if (!audOk) throw new Error("Bad audience");

    sub = typeof payload.sub === "string" ? payload.sub : null;
  } catch (err: any) {
    console.error("requireAuth: JWT verification failed", err.message);
    return json({ error: "Unauthorized" }, 401);
  }
  if (!sub) return json({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("user_id, role, org_id, school_id, display_name")
    .eq("user_id", sub)
    .single();

  if (profileError || !profile) {
    console.error("requireAuth: Profile lookup failed", profileError?.message || "Profile not found");
    return json({ error: "Profile not found" }, 403);
  }

  return {
    user: { id: sub },
    profile,
  };
}

export function requireRole(
  ctx: AuthContext,
  roles: AppRole[],
): Response | null {
  if (!roles.includes(ctx.profile.role)) {
    return json({ error: "Forbidden" }, 403);
  }
  return null;
}

export function roleAtLeastTeacher(role: AppRole): boolean {
  return role === "teacher" || role === "org_admin" || role === "platform_admin";
}
