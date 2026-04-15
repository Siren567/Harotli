import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEV_SESSION_COOKIE, validateDevToken, isSupabaseConfigured } from "@/lib/auth";
import { ADMIN_IP_ALLOWLIST } from "@/config/admin-ip-allowlist";

function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (!v) return false;
  if (v === "::1" || v === "127.0.0.1" || v === "::ffff:127.0.0.1") return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("::ffff:192.168.")) return true;
  if (v.startsWith("172.")) {
    const parts = v.replace("::ffff:", "").split(".");
    const second = Number(parts[1]);
    return Number.isFinite(second) && second >= 16 && second <= 31;
  }
  return false;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) >>> 0) + ((nums[1] << 16) >>> 0) + ((nums[2] << 8) >>> 0) + (nums[3] >>> 0);
}

function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase().replace(/^::ffff:/, "");
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [baseRaw, maskRaw] = cidr.split("/");
  const maskBits = Number(maskRaw);
  if (!baseRaw || !Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) return false;
  const ipInt = ipv4ToInt(normalizeIp(ip));
  const baseInt = ipv4ToInt(normalizeIp(baseRaw));
  if (ipInt == null || baseInt == null) return false;
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isAllowedByConfig(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  for (const rule of ADMIN_IP_ALLOWLIST) {
    const r = normalizeIp(rule);
    if (!r) continue;
    if (r.includes("/")) {
      if (ipMatchesCidr(normalized, r)) return true;
    } else if (normalized === r) {
      return true;
    }
  }
  return false;
}

function requestClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim();
  if (first) return first;
  const real = request.headers.get("x-real-ip") ?? "";
  if (real) return real.trim();
  return "";
}

function isTrustedLocalRequest(request: NextRequest): boolean {
  const host = request.nextUrl.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  const ip = requestClientIp(request);
  return isPrivateIp(ip) || isAllowedByConfig(ip);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";

  // ── Always allow static assets and auth endpoints ──────────────────────
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/") ||
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

  // ── Local network IP bypass (requested) ───────────────────────────────
  if (isTrustedLocalRequest(request)) {
    return NextResponse.next();
  }

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
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
