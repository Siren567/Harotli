/**
 * Auth helper layer.
 *
 * Current mode: Supabase Auth (email/password).
 * The admin user must exist in Supabase Auth — create them via:
 *   Supabase Dashboard → Authentication → Users → Invite user
 *   OR run: supabase auth admin createuser --email admin@harotli.co.il --password ...
 *
 * Fallback: if NEXT_PUBLIC_SUPABASE_URL is not yet configured, the mock
 * credentials below are used so the UI is fully functional during dev.
 */

export const SESSION_COOKIE = "sb-session"; // Supabase SSR sets this automatically

// ─── Panel credentials (hardcoded by request) ───────────────────────────────
export const DEV_CREDENTIALS = {
  username: "admin",
  password: "Harotli@2026",
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.length > 0 && !url.includes("your-project-ref");
}

// ─── Dev-mode token (used only when Supabase is not configured) ──────────────
const DEV_TOKEN_PREFIX = "dev_admin_";

export function createDevToken(): string {
  return (
    DEV_TOKEN_PREFIX +
    Buffer.from(
      JSON.stringify({ user: "admin", exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
    ).toString("base64")
  );
}

export function validateDevToken(token: string): boolean {
  if (!token.startsWith(DEV_TOKEN_PREFIX)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(DEV_TOKEN_PREFIX.length), "base64").toString()
    );
    return payload.user === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const DEV_SESSION_COOKIE = "harotli_dev_session";
