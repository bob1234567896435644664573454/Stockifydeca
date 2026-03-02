import { z } from "https://esm.sh/zod@3.23.8";
import { json } from "./http.ts";

export { z };

export function parseJsonBody<T>(schema: z.ZodType<T>, raw: unknown):
  | { ok: true; data: T }
  | { ok: false; response: Response } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        400,
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
