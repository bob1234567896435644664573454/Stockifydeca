import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Local `supabase functions serve` refuses env vars prefixed with SUPABASE_.
// Support both SUPABASE_* (deployed) and SB_* (local dev).
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.warn("SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY must be set");
}

export function createAnonClient(authHeader: string | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
