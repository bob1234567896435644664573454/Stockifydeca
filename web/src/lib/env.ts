/**
 * Environment variable validation & runtime guardrails.
 * Import this module early (e.g. in main.tsx) so missing vars surface immediately.
 */

interface EnvConfig {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  OPENAI_API_KEY?: string // optional — AI Mentor degrades gracefully
}

function validate(): EnvConfig {
  const url = import.meta.env.VITE_SB_URL as string | undefined
  const key = import.meta.env.VITE_SB_ANON_KEY as string | undefined
  const openai = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  const missing: string[] = []
  if (!url) missing.push("VITE_SB_URL")
  if (!key) missing.push("VITE_SB_ANON_KEY")

  if (missing.length > 0) {
    const msg = `[Stockify] Missing required env vars: ${missing.join(", ")}. Check .env file.`
    console.error(msg)
    if (import.meta.env.DEV) {
      // In dev, show a visible warning so devs notice immediately
      document.title = "⚠️ ENV ERROR — " + document.title
    }
  }

  return {
    SUPABASE_URL: url ?? "",
    SUPABASE_ANON_KEY: key ?? "",
    OPENAI_API_KEY: openai,
  }
}

export const env = validate()

/**
 * Runtime guardrails — school-safe content checks.
 * Returns true if the input is safe.
 */
const BLOCKED_PATTERNS = [
  /\b(gambl(?:e|ing)|bet(?:ting)?|wager)\b/i,
  /\b(real\s+money|cash\s+out|withdraw)\b/i,
  /\b(nsfw|explicit|porn)\b/i,
]

export function isSchoolSafe(text: string): boolean {
  return !BLOCKED_PATTERNS.some((p) => p.test(text))
}

/**
 * Sanitize user-generated content for display.
 * Strips potential XSS vectors while keeping safe markdown-like content.
 */
export function sanitize(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Rate limiter for client-side API calls.
 * Returns a function that returns true if the call should be allowed.
 */
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const calls: number[] = []
  return function canCall(): boolean {
    const now = Date.now()
    // Remove expired entries
    while (calls.length > 0 && calls[0]! < now - windowMs) calls.shift()
    if (calls.length >= maxCalls) return false
    calls.push(now)
    return true
  }
}
