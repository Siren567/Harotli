import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { incrementCouponUse } from "@/lib/services/couponService";

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
    const body = (await request.json()) as { coupon_id?: string };
    const id = String(body?.coupon_id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "חסר מזהה קופון" }, { status: 400, headers: CORS_HEADERS });
    }

    const sb = isSupabaseConfigured() ? createServiceClient() : null;
    await incrementCouponUse(sb, id);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("[redeem-coupon]", e);
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500, headers: CORS_HEADERS });
  }
}
