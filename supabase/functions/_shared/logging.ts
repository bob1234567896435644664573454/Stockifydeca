import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function logRequest(
  serviceClient: SupabaseClient,
  params: {
    requestId: string;
    userId: string | null;
    route: string;
    status: number;
    latencyMs: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await serviceClient.rpc("log_function_request", {
      p_request_id: params.requestId,
      p_user_id: params.userId,
      p_route: params.route,
      p_status: params.status,
      p_latency_ms: params.latencyMs,
      p_metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("logRequest failed", err);
  }
}
