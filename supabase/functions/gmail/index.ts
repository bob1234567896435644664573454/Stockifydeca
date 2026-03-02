/**
 * Gmail Integration Edge Function
 *
 * Routes:
 *   GET  /gmail/status         - Check connection status
 *   GET  /gmail/oauth/start    - Start Gmail OAuth flow (returns consent URL)
 *   GET  /gmail/oauth/callback - Handle OAuth callback (exchanges code, stores token)
 *   POST /gmail/send-test      - Send a test email to the connected Gmail address
 *   POST /gmail/disconnect     - Remove the Gmail connection
 *
 * Requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_TOKEN_ENC_KEY as Supabase secrets.
 * Only accessible by teachers and admins.
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { json, parsePath, requestId } from "../_shared/http.ts";
import { requireAuth, requireRole } from "../_shared/auth.ts";
import { logRequest } from "../_shared/logging.ts";

// ─── Encryption helpers ───────────────────────────────────────────────────────
async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64)); // 32 bytes = AES-256
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

// ─── Gmail OAuth helpers ──────────────────────────────────────────────────────
function getGmailConfig() {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const encKey = Deno.env.get("GMAIL_TOKEN_ENC_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
  return { clientId, clientSecret, encKey, supabaseUrl };
}

function getRedirectUri(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1/gmail/oauth/callback`;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Failed to refresh access token: " + JSON.stringify(data));
  return data.access_token;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const start = Date.now();
  const reqId = requestId(req);
  const admin = createServiceClient();
  const route = `gmail${parsePath(req)}`;
  let statusCode = 200;
  let userId: string | null = null;

  try {
    if (req.method === "OPTIONS") return json({ ok: true });

    const path = parsePath(req);
    const { clientId, clientSecret, encKey, supabaseUrl } = getGmailConfig();

    // ── OAuth callback (no auth header, uses state param) ──────────────────
    if (req.method === "GET" && path === "/oauth/callback") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // user_id encoded in state
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          `<html><body><script>window.close();</script><p>Gmail connection cancelled: ${error}</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code || !state) {
        return json({ error: "Missing code or state" }, 400);
      }

      if (!clientId || !clientSecret || !encKey) {
        return json({ error: "Gmail OAuth not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_TOKEN_ENC_KEY secrets." }, 503);
      }

      // Exchange code for tokens
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: getRedirectUri(supabaseUrl),
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenResp.json();

      if (!tokenData.refresh_token) {
        return new Response(
          `<html><body><p>Error: No refresh token received. Make sure you requested offline access.</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      // Get user email from Google
      const userInfoResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoResp.json();
      const gmailAddress = userInfo.email;

      // Encrypt and store refresh token
      const encryptedToken = await encrypt(tokenData.refresh_token, encKey);
      const scopes = (tokenData.scope ?? "").split(" ").filter(Boolean);

      await admin.from("gmail_connections").upsert({
        user_id: state,
        gmail_address: gmailAddress,
        refresh_token_enc: encryptedToken,
        scopes,
        updated_at: new Date().toISOString(),
      });

      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'gmail_connected',email:'${gmailAddress}'},'*');window.close();</script><p>Gmail connected! You can close this window.</p></body></html>`,
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

    // Only teachers and above can use Gmail integration
    const roleErr = requireRole(auth, ["platform_admin", "org_admin", "teacher"]);
    if (roleErr) {
      statusCode = roleErr.status;
      return roleErr;
    }

    // ── GET /status ────────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/status") {
      const { data } = await admin
        .from("gmail_connections")
        .select("gmail_address, scopes, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      return json({
        connected: !!data,
        gmail_address: data?.gmail_address ?? null,
        scopes: data?.scopes ?? [],
        updated_at: data?.updated_at ?? null,
        configured: !!(clientId && clientSecret && encKey),
      });
    }

    // ── GET /oauth/start ───────────────────────────────────────────────────
    if (req.method === "GET" && path === "/oauth/start") {
      if (!clientId || !clientSecret || !encKey) {
        return json({
          error: "Gmail OAuth not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_TOKEN_ENC_KEY secrets in the Supabase dashboard.",
          setup_required: true,
        }, 503);
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(supabaseUrl),
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
        access_type: "offline",
        prompt: "consent",
        state: userId, // Use user_id as state
      });

      const consentUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return json({ url: consentUrl });
    }

    // ── POST /send-test ────────────────────────────────────────────────────
    if (req.method === "POST" && path === "/send-test") {
      if (!clientId || !clientSecret || !encKey) {
        return json({ error: "Gmail OAuth not configured." }, 503);
      }

      const { data: conn } = await admin
        .from("gmail_connections")
        .select("gmail_address, refresh_token_enc")
        .eq("user_id", userId)
        .maybeSingle();

      if (!conn) {
        return json({ error: "No Gmail account connected." }, 400);
      }

      const refreshToken = await decrypt(conn.refresh_token_enc, encKey);
      const accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);

      // Compose test email
      const to = conn.gmail_address;
      const subject = "Stockify Gmail Connection Test";
      const body = `Hello,\n\nThis is a test email from your Stockify account to confirm that your Gmail connection is working correctly.\n\nYou can now use this account to send class invitations and announcements.\n\nBest regards,\nThe Stockify Team`;

      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body,
      ];
      const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join("\r\n"))))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: rawEmail }),
        }
      );

      if (!sendResp.ok) {
        const err = await sendResp.json();
        return json({ error: "Failed to send email", details: err }, 500);
      }

      return json({ success: true, sent_to: to });
    }

    // ── POST /disconnect ───────────────────────────────────────────────────
    if (req.method === "POST" && path === "/disconnect") {
      await admin.from("gmail_connections").delete().eq("user_id", userId);
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
