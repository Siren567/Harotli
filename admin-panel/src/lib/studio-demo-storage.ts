/**
 * הזמנות שנשמרו מדף הסטודיו (דמו) ב-localStorage — למיזוג בפאנל כש־Supabase לא מחובר,
 * או כגיבוי כשאין שרת. המפתח מסונכרן עם `studio-demo-sync.js` בשורש הריפו.
 */
import type { DbOrder, DbOrderItem, DbOrderTimeline } from "@/types/database";
import type { OrderWithDetails, OrderStatus, PaymentStatus } from "@/types";

export const STUDIO_DEMO_ORDERS_KEY = "harotli_studio_demo_orders_v2";

export type StudioDemoOrderJson = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingMethod: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: { street: string; city: string; zip: string };
  items: Array<{
    productId: string;
    productName: string;
    productImage: string;
    sku: string;
    quantity: number;
    price: number;
    customization?: string;
  }>;
  notes?: string;
  timeline: Array<{ status: string; timestamp: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
  /** אופציונלי — מסונכרן עם `coupon_id` / `coupon_code` ב־DB */
  couponId?: string;
  couponCode?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readStudioDemoOrderJsonList(): StudioDemoOrderJson[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STUDIO_DEMO_ORDERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as StudioDemoOrderJson[]) : [];
  } catch {
    return [];
  }
}

export function clearStudioDemoOrders(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STUDIO_DEMO_ORDERS_KEY);
  } catch {
    // Ignore storage cleanup errors to keep UI stable.
  }
}

function rowToDbOrder(o: StudioDemoOrderJson): DbOrder {
  const addr = o.shippingAddress ?? { street: "", city: "", zip: "" };
  return {
    id: o.id,
    order_number: o.orderNumber,
    customer_id: o.customerId || null,
    customer_name: o.customerName,
    customer_email: o.customerEmail ?? null,
    customer_phone: o.customerPhone ?? null,
    status: o.status,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    shipping_method: o.shippingMethod,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    discount_amount: o.discount,
    total: o.total,
    shipping_street: addr.street || null,
    shipping_city: addr.city || null,
    shipping_zip: addr.zip || null,
    customer_note: o.notes ?? null,
    admin_note: null,
    coupon_id: o.couponId ?? null,
    coupon_code: o.couponCode ?? null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

export function readStudioDemoDbOrders(): DbOrder[] {
  return readStudioDemoOrderJsonList().map(rowToDbOrder);
}

export function readStudioDemoOrdersWithDetails(): OrderWithDetails[] {
  return readStudioDemoOrderJsonList().map((o) => {
    const base = rowToDbOrder(o);
    const items: DbOrderItem[] = (o.items ?? []).map((it, idx) => ({
      id: `item-${o.id}-${idx}`,
      order_id: o.id,
      product_id: it.productId || null,
      product_name: it.productName,
      product_image: it.productImage || null,
      sku: it.sku || null,
      customization: it.customization ?? null,
      quantity: it.quantity,
      unit_price: it.price,
      total_price: it.price * it.quantity,
    }));
    const timeline: DbOrderTimeline[] = (o.timeline ?? []).map((t, idx) => ({
      id: `tl-${o.id}-${idx}`,
      order_id: o.id,
      status: t.status,
      note: t.note ?? null,
      created_at: t.timestamp,
    }));
    return {
      ...base,
      items,
      timeline,
      customer: null,
    };
  });
}

/** mock DB orders + הזמנות סטודיו, ללא כפילות id */
export function mergeDemoDbOrders(staticOrders: DbOrder[]): DbOrder[] {
  const studio = readStudioDemoDbOrders();
  const seen = new Set(staticOrders.map((x) => x.id));
  const extra = studio.filter((s) => !seen.has(s.id));
  const merged = [...extra, ...staticOrders];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export function mergeDemoOrdersWithDetails(staticList: OrderWithDetails[]): OrderWithDetails[] {
  const studio = readStudioDemoOrdersWithDetails();
  const seen = new Set(staticList.map((x) => x.id));
  const extra = studio.filter((s) => !seen.has(s.id));
  const merged = [...extra, ...staticList];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}
