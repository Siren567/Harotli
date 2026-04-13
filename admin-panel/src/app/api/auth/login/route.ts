import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  DEV_CREDENTIALS,
  DEV_SESSION_COOKIE,
  createDevToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "נדרשים אימייל וסיסמה" }, { status: 400 });
    }

    // ── Supabase Auth mode ───────────────────────────────────────────────────
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

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return NextResponse.json(
          { error: "אימייל או סיסמה שגויים" },
          { status: 401 }
        );
      }

      return response;
    }

    // ── Dev fallback mode ────────────────────────────────────────────────────
    if (email !== DEV_CREDENTIALS.email || password !== DEV_CREDENTIALS.password) {
      return NextResponse.json({ error: "אימייל או סיסמה שגויים" }, { status: 401 });
    }

    const token = createDevToken();
    const response = NextResponse.json({ success: true, mode: "dev" });

    response.cookies.set(DEV_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
