import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { computeCouponDiscount, getCouponByCode } from "@/lib/services/couponService";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; subtotal?: unknown };
    const code = String(body?.code ?? "").trim();
    const subtotal = Number(body?.subtotal);
    if (!code) {
      return NextResponse.json({ ok: false, error: "חסר קוד קופון" }, { status: 400, headers: CORS_HEADERS });
    }
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ ok: false, error: "סכום לא תקין" }, { status: 400, headers: CORS_HEADERS });
    }

    const sb = isSupabaseConfigured() ? createServiceClient() : null;
    const coupon = await getCouponByCode(sb, code);
    if (!coupon) {
      return NextResponse.json({ ok: false, error: "קוד קופון לא נמצא" }, { headers: CORS_HEADERS });
    }

    const r = computeCouponDiscount(coupon, subtotal);
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.message }, { headers: CORS_HEADERS });
    }

    return NextResponse.json(
      {
        ok: true,
        discount_amount: r.discount,
        coupon_id: coupon.id,
        coupon_code: coupon.code,
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    console.error("[validate-coupon]", e);
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500, headers: CORS_HEADERS });
  }
}
