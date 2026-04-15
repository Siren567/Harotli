import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  DEV_CREDENTIALS,
  DEV_SESSION_COOKIE,
  createDevToken,
} from "@/lib/auth";

function normalizeCredentialInput(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();
    const identifier = normalizeCredentialInput(username ?? email ?? "");
    const passwordInput = normalizeCredentialInput(password);

    if (!identifier || !passwordInput) {
      return NextResponse.json({ error: "נדרשים שם משתמש וסיסמה" }, { status: 400 });
    }

    // ── Local admin credentials (always available) ───────────────────────────
    const localUsername = normalizeCredentialInput(DEV_CREDENTIALS.username).toLowerCase();
    const localPassword = normalizeCredentialInput(DEV_CREDENTIALS.password);
    const identifierLc = identifier.toLowerCase();

    if (
      (identifierLc === localUsername || identifierLc === "admin@harotli.co.il") &&
      passwordInput === localPassword
    ) {
      const token = createDevToken();
      const response = NextResponse.json({ success: true, mode: "local" });
      response.cookies.set(DEV_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      return response;
    }

    // ── Supabase Auth mode ───────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      if (!identifier.includes("@")) {
        return NextResponse.json({ error: "שם משתמש או סיסמה שגויים" }, { status: 401 });
      }
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

      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password: passwordInput });

      if (error) {
        return NextResponse.json(
          { error: "שם משתמש או סיסמה שגויים" },
          { status: 401 }
        );
      }

      return response;
    }

    // ── Dev fallback mode ────────────────────────────────────────────────────
    if (identifierLc !== localUsername || passwordInput !== localPassword) {
      return NextResponse.json({ error: "שם משתמש או סיסמה שגויים" }, { status: 401 });
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
