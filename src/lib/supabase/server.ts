import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client.
 * Use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes cookies to maintain the session across requests.
 *
 * Returns null when Supabase env vars are not configured.
 * Callers that pass the result to service functions are safe because every
 * service checks isSupabaseConfigured() before using the client.
 */
export async function createServerSupabaseClient() {
  // Call cookies() unconditionally so Next.js treats this page as dynamic
  // (server-rendered on every request), even when Supabase is not configured.
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie mutations are ignored.
          // Session refresh is handled by the proxy instead.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses Row Level Security.
 * Use ONLY in trusted server contexts (Route Handlers, Server Actions).
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 *
 * Returns null when env vars are not configured.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null as unknown as ReturnType<typeof createServerClient<Database>>;
  }
  return createServerClient<Database>(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false },
  });
}
