import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("store_settings")
      .select("store_name,whatsapp_number")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const wa = String(data?.whatsapp_number ?? "").trim() || "972559433968";
    return NextResponse.json(
      {
        storeName: data?.store_name ?? "חרוטלי",
        whatsapp: wa,
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    console.error("public/site GET failed:", e);
    return NextResponse.json(
      { storeName: "חרוטלי", whatsapp: "972559433968" },
      { headers: CORS_HEADERS }
    );
  }
}
