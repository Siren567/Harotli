/**
 * orderService — all order-related Supabase queries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbOrder, DbOrderItem, DbOrderTimeline } from "@/types/database";
import type { OrderWithDetails, OrderStatus } from "@/types";
import { mockOrders } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";
import { mergeDemoDbOrders, mergeDemoOrdersWithDetails } from "@/lib/studio-demo-storage";

type SB = SupabaseClient<Database>;

function normalizeOrderRow(row: Partial<DbOrder> & { id: string }): DbOrder {
  const orderNumber = String((row as { order_number?: string }).order_number ?? "").trim();
  const customerName = String((row as { customer_name?: string }).customer_name ?? "").trim();
  const total = Number(row.total ?? 0);
  const shipping = Number((row as { shipping_cost?: number }).shipping_cost ?? 0);
  const discount = Number((row as { discount_amount?: number }).discount_amount ?? 0);
  const subtotalRaw = Number((row as { subtotal?: number }).subtotal ?? NaN);
  const subtotal = Number.isFinite(subtotalRaw) ? subtotalRaw : Math.max(0, total + discount - shipping);

  return {
    ...(row as DbOrder),
    order_number: orderNumber || row.id.slice(0, 8),
    customer_name: customerName || row.customer_email || row.customer_phone || "לקוח",
    payment_status: (row.payment_status ?? "paid") as DbOrder["payment_status"],
    subtotal,
    shipping_cost: shipping,
    discount_amount: discount,
    total,
  };
}

function normalizeOrderItemRow(row: Partial<DbOrderItem> & { id: string; order_id: string }): DbOrderItem {
  const qty = Number(row.quantity ?? 1) || 1;
  const unitRaw = Number((row as { unit_price?: number; price?: number }).unit_price ?? (row as { price?: number }).price ?? 0);
  const totalRaw = Number(row.total_price ?? unitRaw * qty);
  return {
    ...(row as DbOrderItem),
    product_name: row.product_name || "פריט בהזמנה",
    unit_price: unitRaw,
    total_price: totalRaw,
    quantity: qty,
  };
}

// ─── Mock adapter ─────────────────────────────────────────────────────────────

/** הזמנות mock + הזמנות שנשמרו מסטודיו (localStorage) — לשימוש בלוח בקרה וב־getOrders */
export function getMergedMockDbOrderRows(): DbOrder[] {
  return mergeDemoDbOrders(mockToDbOrders());
}

function mockToDbOrders(): DbOrder[] {
  return mockOrders.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    customer_id: o.customerId,
    customer_name: o.customerName,
    customer_email: o.customerEmail,
    customer_phone: o.customerPhone,
    status: o.status,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    shipping_method: o.shippingMethod,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    discount_amount: o.discount,
    total: o.total,
    shipping_street: o.shippingAddress?.street ?? null,
    shipping_city: o.shippingAddress?.city ?? null,
    shipping_zip: o.shippingAddress?.zip ?? null,
    customer_note: o.notes ?? null,
    admin_note: o.adminNotes ?? null,
    coupon_id: null,
    coupon_code: null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  }));
}

function mockToOrderWithDetails(): OrderWithDetails[] {
  return mockOrders.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    customer_id: o.customerId,
    customer_name: o.customerName,
    customer_email: o.customerEmail,
    customer_phone: o.customerPhone,
    status: o.status,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    shipping_method: o.shippingMethod,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    discount_amount: o.discount,
    total: o.total,
    shipping_street: o.shippingAddress?.street ?? null,
    shipping_city: o.shippingAddress?.city ?? null,
    shipping_zip: o.shippingAddress?.zip ?? null,
    customer_note: o.notes ?? null,
    admin_note: o.adminNotes ?? null,
    coupon_id: null,
    coupon_code: null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    items: o.items.map((item, idx) => ({
      id: `item-${o.id}-${idx}`,
      order_id: o.id,
      product_id: item.productId,
      product_name: item.productName,
      product_image: item.productImage,
      sku: item.sku,
      customization: item.customization ?? null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    })),
    timeline: o.timeline.map((t, idx) => ({
      id: `tl-${o.id}-${idx}`,
      order_id: o.id,
      status: t.status,
      note: t.note ?? null,
      created_at: t.timestamp,
    })),
    customer: null,
  }));
}

// ─── READ (list) ──────────────────────────────────────────────────────────────

export interface GetOrdersOptions {
  search?: string;
  status?: OrderStatus | "all";
  sortBy?: "created_at" | "total" | "status";
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface GetOrdersResult {
  orders: DbOrder[];
  total: number;
}

export async function getOrders(
  sb: SB,
  opts: GetOrdersOptions = {}
): Promise<GetOrdersResult> {
  const {
    search = "",
    status = "all",
    sortBy = "created_at",
    sortDir = "desc",
    page = 1,
    perPage = 25,
  } = opts;

  if (!isSupabaseConfigured()) {
    let list = getMergedMockDbOrderRows();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.customer_phone ?? "").includes(q)
      );
    }
    if (status !== "all") list = list.filter((o) => o.status === status);
    list.sort((a, b) => {
      const va = sortBy === "total" ? a.total : sortBy === "status" ? a.status : a.created_at;
      const vb = sortBy === "total" ? b.total : sortBy === "status" ? b.status : b.created_at;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    const total = list.length;
    return { orders: list.slice((page - 1) * perPage, page * perPage), total };
  }

  let query = sb
    .from("orders")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
    );
  }
  if (status !== "all") query = query.eq("status", status);
  query = query.order(sortBy, { ascending: sortDir === "asc" });
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`getOrders: ${error.message}`);
  let list = ((data ?? []) as Array<Partial<DbOrder> & { id: string }>).map(normalizeOrderRow);
  // Client-side merge: when admin runs with Supabase, still show local demo checkout orders.
  if (typeof window !== "undefined") {
    list = mergeDemoDbOrders(list);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.customer_phone ?? "").includes(q)
      );
    }
    if (status !== "all") list = list.filter((o) => o.status === status);
    list.sort((a, b) => {
      const va = sortBy === "total" ? a.total : sortBy === "status" ? a.status : a.created_at;
      const vb = sortBy === "total" ? b.total : sortBy === "status" ? b.status : b.created_at;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    const total = list.length;
    return { orders: list.slice((page - 1) * perPage, page * perPage), total };
  }

  return { orders: list, total: count ?? list.length };
}

// ─── READ (single with items + timeline) ─────────────────────────────────────

export async function getOrderById(
  sb: SB,
  id: string
): Promise<OrderWithDetails | null> {
  if (!isSupabaseConfigured()) {
    return mergeDemoOrdersWithDetails(mockToOrderWithDetails()).find((o) => o.id === id) ?? null;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*), order_timeline(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const row = data as DbOrder & {
    order_items: DbOrderItem[];
    order_timeline: DbOrderTimeline[];
  };

  return {
    ...normalizeOrderRow(row),
    items: (row.order_items ?? []).map((it) => normalizeOrderItemRow(it as Partial<DbOrderItem> & { id: string; order_id: string })),
    timeline: (row.order_timeline ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
    customer: null,
  };
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  sb: SB,
  id: string,
  status: OrderStatus,
  note?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await sb
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`updateOrderStatus: ${error.message}`);

  // Append timeline entry
  await sb.from("order_timeline").insert({ order_id: id, status, note: note ?? null });
}

// ─── UPDATE ADMIN NOTE ────────────────────────────────────────────────────────

export async function updateOrderNote(
  sb: SB,
  id: string,
  admin_note: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await sb
    .from("orders")
    .update({ admin_note })
    .eq("id", id);

  if (error) throw new Error(`updateOrderNote: ${error.message}`);
}
