import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client.
 * Use this in "use client" components and client-side hooks.
 * Safe to call multiple times — SSR package deduplicates internally.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Not configured yet (build time or local dev without .env.local).
    // Pages rely on isSupabaseConfigured() to fall back to mock data,
    // so returning null here is safe.
    return null as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }
  return createBrowserClient<Database>(url, key);
}
