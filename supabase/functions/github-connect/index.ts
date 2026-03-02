/**
 * GitHub Connect Integration Edge Function
 *
 * Routes:
 *   GET  /github-connect/status         - Check connection status + profile
 *   GET  /github-connect/oauth/start    - Start GitHub OAuth flow (returns consent URL)
 *   GET  /github-connect/oauth/callback - Handle OAuth callback (exchanges code, stores token)
 *   GET  /github-connect/profile        - Get connected GitHub profile + repos
 *   POST /github-connect/disconnect     - Remove the GitHub connection
 *
 * Requires GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_TOKEN_ENC_KEY as Supabase secrets.
 * Accessible by all authenticated users (students can connect their GitHub for portfolio display).
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

// ─── Encryption helpers ───────────────────────────────────────────────────────
async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertextB64: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────
function getGitHubConfig() {
  const clientId = Deno.env.get("GITHUB_CLIENT_ID");
  const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");
  const encKey = Deno.env.get("GITHUB_TOKEN_ENC_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
  return { clientId, clientSecret, encKey, supabaseUrl };
}

function getRedirectUri(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1/github-connect/oauth/callback`;
}

async function githubApiGet(path: string, token: string): Promise<unknown> {
  const resp = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`GitHub API error ${resp.status}: ${JSON.stringify(err)}`);
  }
  return resp.json();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const admin = createServiceClient();
  const route = `github-connect${parsePath(req)}`;
  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const path = parsePath(req);
    const { clientId, clientSecret, encKey, supabaseUrl } = getGitHubConfig();

    // ── OAuth callback (no auth header, uses state param) ──────────────────
    if (req.method === "GET" && path === "/oauth/callback") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // user_id encoded in state
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          `<html><body><script>window.close();</script><p>GitHub connection cancelled: ${error}</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code || !state) {
        return json({ error: "Missing code or state" }, 400);
      }

      if (!clientId || !clientSecret || !encKey) {
        return json({ error: "GitHub OAuth not configured. Please set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_TOKEN_ENC_KEY secrets." }, 503);
      }

      // Exchange code for token
      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: getRedirectUri(supabaseUrl),
        }),
      });
      const tokenData = await tokenResp.json();

      if (!tokenData.access_token) {
        return new Response(
          `<html><body><p>Error: No access token received. ${JSON.stringify(tokenData)}</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      // Get GitHub user info
      const userInfo = await githubApiGet("/user", tokenData.access_token) as {
        login: string;
        name: string;
        avatar_url: string;
        public_repos: number;
      };

      // Encrypt and store token
      const encryptedToken = await encrypt(tokenData.access_token, encKey);
      const scopes = (tokenData.scope ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

      await admin.from("github_connections").upsert({
        user_id: state,
        github_username: userInfo.login,
        access_token_enc: encryptedToken,
        scopes,
        updated_at: new Date().toISOString(),
      });

      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'github_connected',username:'${userInfo.login}'},'*');window.close();</script><p>GitHub connected as @${userInfo.login}! You can close this window.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // ── All other routes require auth ──────────────────────────────────────
    const auth = await requireAuth(admin, req);
    if (auth instanceof Response) {
      statusCode = auth.status;
      return auth;
    }
    userId = auth.user.id;

    // ── GET /status ────────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/status") {
      const { data } = await admin
        .from("github_connections")
        .select("github_username, scopes, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      return json({
        connected: !!data,
        github_username: data?.github_username ?? null,
        scopes: data?.scopes ?? [],
        updated_at: data?.updated_at ?? null,
        configured: !!(clientId && clientSecret && encKey),
      });
    }

    // ── GET /oauth/start ───────────────────────────────────────────────────
    if (req.method === "GET" && path === "/oauth/start") {
      if (!clientId || !clientSecret || !encKey) {
        return json({
          error: "GitHub OAuth not configured. Please set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_TOKEN_ENC_KEY secrets in the Supabase dashboard.",
          setup_required: true,
        }, 503);
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(supabaseUrl),
        scope: "read:user,public_repo",
        state: userId,
      });

      const consentUrl = `https://github.com/login/oauth/authorize?${params}`;
      return json({ url: consentUrl });
    }

    // ── GET /profile ───────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/profile") {
      if (!encKey) {
        return json({ error: "GitHub OAuth not configured." }, 503);
      }

      const { data: conn } = await admin
        .from("github_connections")
        .select("github_username, access_token_enc")
        .eq("user_id", userId)
        .maybeSingle();

      if (!conn) {
        return json({ error: "No GitHub account connected." }, 400);
      }

      const accessToken = await decrypt(conn.access_token_enc, encKey);

      // Fetch profile and top repos in parallel
      const [profile, repos] = await Promise.all([
        githubApiGet("/user", accessToken),
        githubApiGet("/user/repos?sort=updated&per_page=6&type=owner", accessToken),
      ]);

      return json({ profile, repos });
    }

    // ── POST /disconnect ───────────────────────────────────────────────────
    if (req.method === "POST" && path === "/disconnect") {
      await admin.from("github_connections").delete().eq("user_id", userId);
      return json({ success: true });
    }

    statusCode = 404;
    return json({ error: "Not found" }, 404);
  } catch (err: unknown) {
    statusCode = 500;
    console.error(`[${reqId}] Error:`, err);
    return json({ error: "Internal server error" }, 500);
  } finally {
    logRequest(reqId, req.method, route, statusCode, Date.now() - start, userId);
  }
});
