import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEV_SESSION_COOKIE, validateDevToken, isSupabaseConfigured } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";

  // ── Always allow static assets and auth endpoints ──────────────────────
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/admin/login" ||
    pathname === "/login" ||
    pathname.includes("favicon")
  ) {
    return NextResponse.next();
  }

  // ── Root on admin app should send users back to the main site ─────────
  if (pathname === "/") {
    return NextResponse.redirect(siteUrl);
  }

  // ── Protect admin routes ───────────────────────────────────────────────
  const isAdminPath = pathname.startsWith("/admin");

  if (!isAdminPath) return NextResponse.next();

  // ── Authentication check ──────────────────────────────────────────────
  let authenticated = false;

  // ── Local admin override cookie (works even when Supabase is configured) ──
  const localToken = request.cookies.get(DEV_SESSION_COOKIE)?.value;
  if (localToken && validateDevToken(localToken)) {
    authenticated = true;
  }

  if (authenticated) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (isSupabaseConfigured()) {
    // ── Supabase Auth mode ────────────────────────────────────────────
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Forward cookies to both request and response
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    authenticated = !!session;

    if (authenticated) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return response;
    }
  } else {
    // ── Dev fallback mode ─────────────────────────────────────────────
    const token = request.cookies.get(DEV_SESSION_COOKIE)?.value;
    authenticated = !!token && validateDevToken(token);

    if (authenticated) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }
  }

  // ── Not authenticated → redirect to login ────────────────────────────
  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
