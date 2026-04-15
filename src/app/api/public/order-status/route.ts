import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type OrderStatusRow = {
  id: string;
  order_number?: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  shipping_method?: string | null;
  subtotal?: number;
  shipping_cost?: number;
  discount_amount?: number;
  updated_at: string;
  created_at: string;
  total: number;
  customer_note?: string | null;
  shipping_street?: string | null;
  shipping_city?: string | null;
  shipping_zip?: string | null;
};

async function findOrderByNumber(rawOrderNumber: string): Promise<OrderStatusRow | null> {
  const sb = createServiceClient();
  const orderNumber = String(rawOrderNumber || "").trim();
  if (!orderNumber) return null;

  const probe = await sb
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (probe.error) throw probe.error;
  const rows = (probe.data ?? []) as OrderStatusRow[];
  const normalized = orderNumber.toLowerCase();
  const direct =
    rows.find((r) => String(r.order_number || "").toLowerCase() === normalized) ??
    rows.find((r) => String(r.order_number || "").endsWith(orderNumber)) ??
    null;
  if (direct) return direct;

  const compactInput = orderNumber.replace(/-/g, "").toLowerCase();
  if (compactInput.length >= 8) {
    const byIdPrefix =
      rows.find((r) => String(r.id || "").replace(/-/g, "").toLowerCase().startsWith(compactInput)) ??
      null;
    if (byIdPrefix) return byIdPrefix;
  }

  if (/^\d{5}$/.test(orderNumber)) {
    const byIdSuffix = rows.find((r) => String(r.id || "").replace(/-/g, "").slice(-5) === orderNumber) ?? null;
    if (byIdSuffix) return byIdSuffix;
  }

  return null;
}

function normalizeOrderForPublic(row: OrderStatusRow) {
  const total = Number(row.total ?? 0);
  const shipping = Number(row.shipping_cost ?? 0);
  const discount = Number(row.discount_amount ?? 0);
  const subtotalRaw = Number(row.subtotal ?? NaN);
  const subtotal = Number.isFinite(subtotalRaw) ? subtotalRaw : Math.max(0, total + discount - shipping);
  return {
    id: row.id,
    order_number: String(row.order_number || row.id.slice(0, 8)),
    customer_name: String(row.customer_name || row.customer_email || row.customer_phone || "לקוח"),
    customer_email: row.customer_email ?? null,
    customer_phone: row.customer_phone ?? null,
    status: row.status || "new",
    payment_status: row.payment_status || "paid",
    payment_method: row.payment_method ?? null,
    shipping_method: row.shipping_method ?? null,
    subtotal,
    shipping_cost: shipping,
    discount_amount: discount,
    total,
    customer_note: row.customer_note ?? null,
    shipping_street: row.shipping_street ?? null,
    shipping_city: row.shipping_city ?? null,
    shipping_zip: row.shipping_zip ?? null,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

async function fetchOrderItemsAndTimeline(orderId: string) {
  const sb = createServiceClient();

  const [itemsRes, timelineRes] = await Promise.all([
    sb.from("order_items").select("*").eq("order_id", orderId),
    sb.from("order_timeline").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (timelineRes.error) throw timelineRes.error;

  const items = (itemsRes.data ?? []).map((row) => {
    const qty = Number((row as { quantity?: number }).quantity ?? 1) || 1;
    const unit = Number((row as { unit_price?: number; price?: number }).unit_price ?? (row as { price?: number }).price ?? 0);
    const total = Number((row as { total_price?: number }).total_price ?? unit * qty);
    return {
      id: row.id,
      product_name: (row as { product_name?: string }).product_name || (row as { sku?: string }).sku || "פריט בהזמנה",
      quantity: qty,
      unit_price: unit,
      total_price: total,
      customization: (row as { customization?: string | null }).customization ?? null,
    };
  });

  const timeline = (timelineRes.data ?? []).map((row) => ({
    id: row.id,
    status: (row as { status?: string }).status || "new",
    note: (row as { note?: string | null }).note ?? null,
    created_at: row.created_at,
  }));

  return { items, timeline };
}

export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get("order_number") || "";
    if (!orderNumber.trim()) {
      return NextResponse.json({ error: "order_number is required" }, { status: 400, headers: CORS_HEADERS });
    }

    const rawOrder = await findOrderByNumber(orderNumber);
    if (!rawOrder) {
      return NextResponse.json({ order: null }, { status: 404, headers: CORS_HEADERS });
    }

    const order = normalizeOrderForPublic(rawOrder);
    const { items, timeline } = await fetchOrderItemsAndTimeline(order.id);

    return NextResponse.json(
      {
        order: {
          ...order,
          items,
          timeline,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("public/order-status GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch order status" }, { status: 500, headers: CORS_HEADERS });
  }
}
