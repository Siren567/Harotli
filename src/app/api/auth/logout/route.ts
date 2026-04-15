import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, DEV_SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  if (isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.signOut();
    return response;
  }

  // Dev fallback: just clear the dev cookie
  const response = NextResponse.json({ success: true });
  response.cookies.delete(DEV_SESSION_COOKIE);
  return response;
}
