import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getFeaturedProductIds } from "@/lib/services/homepageService";

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
    const { productIds } = await getFeaturedProductIds(sb);
    if (!productIds.length) {
      return NextResponse.json({ items: [] }, { headers: CORS_HEADERS });
    }

    const { data: products, error: pErr } = await sb
      .from("products")
      .select("id,name,slug,price,short_description,status")
      .in("id", productIds)
      .eq("status", "active");

    if (pErr) throw pErr;

    const { data: images } = await sb
      .from("product_images")
      .select("product_id,url,sort_order,is_primary")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    const { data: inv } = await sb
      .from("inventory")
      .select("product_id,quantity")
      .in("product_id", productIds);

    const qty = new Map((inv ?? []).map((r) => [r.product_id, Number(r.quantity ?? 0)]));
    const imgByProduct = new Map<string, string | null>();
    for (const im of images ?? []) {
      if (!imgByProduct.has(im.product_id)) {
        imgByProduct.set(im.product_id, im.url);
      }
    }
    for (const im of images ?? []) {
      if (im.is_primary) imgByProduct.set(im.product_id, im.url);
    }

    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    const items = productIds
      .map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        if ((qty.get(id) ?? 0) <= 0) return null;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          description: p.short_description,
          image: imgByProduct.get(p.id) ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ items }, { headers: CORS_HEADERS });
  } catch (e) {
    console.error("public/featured GET failed:", e);
    return NextResponse.json({ items: [] }, { headers: CORS_HEADERS });
  }
}
