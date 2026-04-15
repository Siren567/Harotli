/**
 * Dashboard aggregates — orders, products, customers from Supabase or mock data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbOrder, DbProduct, DbProductImage, DbInventory, DbMarketingSiteEvent } from "@/types/database";
import type { DashboardStats, OrderStatus } from "@/types";
import { mockCustomers, mockOrders, mockProducts } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";
import { getMergedMockDbOrderRows } from "@/lib/services/orderService";
import { readStudioDemoOrderJsonList } from "@/lib/studio-demo-storage";

type SB = SupabaseClient<Database>;

const TZ = "Asia/Jerusalem";

function jerusalemYMD(d: Date): { y: number; m: number; day: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = f.formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, day };
}

function jerusalemYMDFromIso(iso: string): { y: number; m: number; day: number } {
  return jerusalemYMD(new Date(iso));
}

function sameJerusalemMonth(iso: string, ref: Date): boolean {
  const a = jerusalemYMDFromIso(iso);
  const b = jerusalemYMD(ref);
  return a.y === b.y && a.m === b.m;
}

function sameJerusalemDay(iso: string, ref: Date): boolean {
  const a = jerusalemYMDFromIso(iso);
  const b = jerusalemYMD(ref);
  return a.y === b.y && a.m === b.m && a.day === b.day;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** מסדי נתונים ישנים / שונים — עמודות שם מוצר בשורת הזמנה */
const ORDER_ITEM_NAME_KEYS = [
  "product_name",
  "title",
  "name",
  "product_title",
  "item_name",
  "line_title",
] as const;

function parseOrderItemRow(row: Record<string, unknown>): {
  order_id: string;
  label: string;
  quantity: number;
  total_price: number;
} | null {
  const order_id = typeof row.order_id === "string" ? row.order_id : null;
  if (!order_id) return null;
  let label = "";
  for (const k of ORDER_ITEM_NAME_KEYS) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) {
      label = v.trim();
      break;
    }
  }
  if (!label) label = "פריט בהזמנה";
  const qtyRaw = row.quantity ?? row.qty ?? 1;
  const qty = typeof qtyRaw === "number" ? qtyRaw : Number(qtyRaw);
  const totalRaw =
    row.total_price ?? row.line_total ?? row.line_price ?? row.price ?? row.subtotal ?? 0;
  const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
  return {
    order_id,
    label,
    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    total_price: Number.isFinite(total) ? total : 0,
  };
}

function revenueCounts(status: OrderStatus): boolean {
  return status !== "cancelled" && status !== "refunded";
}

function pendingStatuses(): OrderStatus[] {
  return ["new", "pending", "processing"];
}

export interface StockAlertRow {
  id: string;
  name: string;
  primaryImage: string | null;
  quantity: number;
  lowStockThreshold: number;
  kind: "out" | "low";
}

export type MarketingEventRow = DbMarketingSiteEvent;

export interface MarketingAttributionBlock {
  periodLabel: string;
  totalEvents: number;
  distinctSessions: number;
  pageViews: number;
  productViews: number;
  /** אירועים עם fbclid (מודדים תנועה ממודעות מטא) */
  withFbclid: number;
  /** אירועים עם utm_source או utm_campaign */
  withUtm: number;
  topReferrers: { label: string; count: number }[];
  topUtmCampaigns: { campaign: string; source: string; medium: string; count: number }[];
  topProductViews: { productName: string; productId: string | null; views: number }[];
  recentEvents: MarketingEventRow[];
}

export interface DashboardSnapshot {
  stats: DashboardStats;
  recentOrders: DbOrder[];
  stockAlerts: StockAlertRow[];
  /** Month-over-month revenue change %; null if not meaningful */
  revenueTrendPercent: number | null;
  chartMonthLabel: string;
  marketing: MarketingAttributionBlock;
}

const MARKETING_WINDOW_MS = 7 * 86400000;

function emptyMarketingBlock(): MarketingAttributionBlock {
  return {
    periodLabel: "7 ימים אחרונים",
    totalEvents: 0,
    distinctSessions: 0,
    pageViews: 0,
    productViews: 0,
    withFbclid: 0,
    withUtm: 0,
    topReferrers: [],
    topUtmCampaigns: [],
    topProductViews: [],
    recentEvents: [],
  };
}

function referrerLabel(ref: string | null): string {
  if (!ref) return "(ישיר / ללא הפניה)";
  try {
    return new URL(ref).hostname || ref.slice(0, 64);
  } catch {
    return ref.slice(0, 80);
  }
}

function aggregateMarketingRows(rows: DbMarketingSiteEvent[], periodLabel: string): MarketingAttributionBlock {
  if (!rows.length) return { ...emptyMarketingBlock(), periodLabel };

  const totalEvents = rows.length;
  const distinctSessions = new Set(rows.map((r) => r.session_id)).size;
  const pageViews = rows.filter((r) => r.event_type === "page_view").length;
  const productViews = rows.filter((r) => r.event_type === "product_view").length;
  const withFbclid = rows.filter((r) => r.fbclid).length;
  const withUtm = rows.filter((r) => r.utm_source || r.utm_campaign).length;

  const refMap = new Map<string, number>();
  for (const r of rows) {
    const k = referrerLabel(r.referrer);
    refMap.set(k, (refMap.get(k) ?? 0) + 1);
  }
  const topReferrers = [...refMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const campMap = new Map<string, { campaign: string; source: string; medium: string; count: number }>();
  for (const r of rows) {
    if (!r.utm_campaign && !r.utm_source) continue;
    const key = `${r.utm_campaign || "—"}|${r.utm_source || "—"}|${r.utm_medium || "—"}`;
    const cur = campMap.get(key) ?? {
      campaign: r.utm_campaign || "—",
      source: r.utm_source || "—",
      medium: r.utm_medium || "—",
      count: 0,
    };
    cur.count += 1;
    campMap.set(key, cur);
  }
  const topUtmCampaigns = [...campMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const pvMap = new Map<string, { productName: string; productId: string | null; views: number }>();
  for (const r of rows) {
    if (r.event_type !== "product_view") continue;
    const name = r.product_name || r.product_id || "לא ידוע";
    const key = r.product_id || name;
    const cur = pvMap.get(key) ?? { productName: name, productId: r.product_id, views: 0 };
    cur.views += 1;
    pvMap.set(key, cur);
  }
  const topProductViews = [...pvMap.values()].sort((a, b) => b.views - a.views).slice(0, 12);

  const recentEvents = [...rows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 100);

  return {
    periodLabel,
    totalEvents,
    distinctSessions,
    pageViews,
    productViews,
    withFbclid,
    withUtm,
    topReferrers,
    topUtmCampaigns,
    topProductViews,
    recentEvents,
  };
}

function buildMockMarketingRows(): DbMarketingSiteEvent[] {
  const now = Date.now();
  const mk = (i: number, partial: Partial<DbMarketingSiteEvent>): DbMarketingSiteEvent => ({
    id: `mock-mkt-${i}`,
    created_at: new Date(now - i * 3600000).toISOString(),
    event_type: "page_view",
    page_path: "/",
    referrer: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    fbclid: null,
    gclid: null,
    product_id: null,
    product_name: null,
    session_id: "mock-session-a",
    user_agent: "Mozilla/5.0 (דוגמה)",
    language: "he-IL",
    screen_w: 390,
    screen_h: 844,
    meta: null,
    ...partial,
  });

  return [
    mk(0, {
      event_type: "page_view",
      page_path: "/?utm_source=facebook&utm_medium=cpc&utm_campaign=spring_sale",
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "spring_sale",
      referrer: "https://www.facebook.com/",
      fbclid: "IwAR0demo",
      session_id: "s-1",
    }),
    mk(1, {
      event_type: "product_view",
      page_path: "/design.html",
      product_id: "p-demo-1",
      product_name: "שרשרת לב (דוגמה)",
      utm_source: "facebook",
      utm_campaign: "spring_sale",
      session_id: "s-1",
    }),
    mk(2, {
      event_type: "page_view",
      page_path: "/design.html",
      referrer: "https://www.google.com/",
      session_id: "s-2",
    }),
    mk(3, {
      event_type: "product_view",
      product_id: "p-demo-2",
      product_name: "צמיד שמות (דוגמה)",
      session_id: "s-2",
    }),
    mk(4, {
      event_type: "page_view",
      page_path: "/?utm_source=instagram&utm_medium=social&utm_campaign=reels_01",
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels_01",
      session_id: "s-3",
    }),
    mk(5, { event_type: "page_view", session_id: "s-4", referrer: null }),
    mk(6, {
      event_type: "product_view",
      product_id: "p-demo-1",
      product_name: "שרשרת לב (דוגמה)",
      utm_campaign: "spring_sale",
      utm_source: "facebook",
      session_id: "s-5",
      fbclid: "IwAR1demo",
    }),
  ];
}

async function fetchMarketingAttributionBlock(sb: SB): Promise<MarketingAttributionBlock> {
  const since = new Date(Date.now() - MARKETING_WINDOW_MS).toISOString();
  const { data, error } = await sb
    .from("marketing_site_events")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(4000);

  if (error) {
    const msg = error.message || "";
    if (msg.includes("does not exist") || msg.includes("schema cache") || (error as { code?: string }).code === "42P01") {
      return emptyMarketingBlock();
    }
    console.warn("[dashboard] marketing_site_events:", msg);
    return emptyMarketingBlock();
  }

  return aggregateMarketingRows((data ?? []) as DbMarketingSiteEvent[], "7 ימים אחרונים");
}

function buildMockSnapshot(): DashboardSnapshot {
  const now = new Date();
  const studioTimes = readStudioDemoOrderJsonList().map((o) => new Date(o.createdAt).getTime());
  const mockTimes = mockOrders.map((o) => new Date(o.createdAt).getTime());
  const latestMs = Math.max(0, ...studioTimes, ...mockTimes);
  /** Mock + סטודיו: עוגן לתאריך ההזמנה האחרונה כדי שהגרפים יתמלאו */
  const anchor = latestMs > 0 ? new Date(latestMs) : now;

  const orders = getMergedMockDbOrderRows();

  const revenueOrders = orders.filter((o) => revenueCounts(o.status));
  let monthRevenue = 0;
  let prevMonthRevenue = 0;
  let todayRevenue = 0;
  let weekRevenue = 0;

  const { y: cy, m: cm } = jerusalemYMD(anchor);
  const prevRef = new Date(anchor);
  prevRef.setMonth(prevRef.getMonth() - 1);
  const { y: py, m: pm } = jerusalemYMD(prevRef);

  const dayMs = 86400000;
  const weekAgo = new Date(anchor.getTime() - 7 * dayMs);

  for (const o of revenueOrders) {
    const t = new Date(o.created_at);
    if (sameJerusalemMonth(o.created_at, anchor)) monthRevenue += Number(o.total);
    const om = jerusalemYMDFromIso(o.created_at);
    if (om.y === py && om.m === pm) prevMonthRevenue += Number(o.total);
    if (sameJerusalemDay(o.created_at, anchor)) todayRevenue += Number(o.total);
    if (t >= weekAgo) weekRevenue += Number(o.total);
  }

  const days = daysInMonth(cy, cm);
  const revenueByDay = new Map<number, { revenue: number; orders: number }>();
  for (let d = 1; d <= days; d++) revenueByDay.set(d, { revenue: 0, orders: 0 });

  for (const o of revenueOrders) {
    if (!sameJerusalemMonth(o.created_at, anchor)) continue;
    const { day } = jerusalemYMDFromIso(o.created_at);
    const cur = revenueByDay.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.total);
    cur.orders += 1;
    revenueByDay.set(day, cur);
  }

  const revenueChart: DashboardStats["revenueChart"] = [];
  for (let d = 1; d <= days; d++) {
    const row = revenueByDay.get(d) ?? { revenue: 0, orders: 0 };
    revenueChart.push({
      date: `${d}/${cm}`,
      revenue: row.revenue,
      orders: row.orders,
    });
  }

  const productAgg = new Map<string, { sales: number; revenue: number }>();
  for (const o of readStudioDemoOrderJsonList()) {
    if (!revenueCounts(o.status)) continue;
    for (const it of o.items ?? []) {
      const key = it.productName;
      const cur = productAgg.get(key) ?? { sales: 0, revenue: 0 };
      cur.sales += it.quantity;
      cur.revenue += it.price * it.quantity;
      productAgg.set(key, cur);
    }
  }
  for (const o of mockOrders) {
    if (!revenueCounts(o.status as OrderStatus)) continue;
    for (const it of o.items) {
      const key = it.productName;
      const cur = productAgg.get(key) ?? { sales: 0, revenue: 0 };
      cur.sales += it.quantity;
      cur.revenue += it.price * it.quantity;
      productAgg.set(key, cur);
    }
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, sales: v.sales, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.status === "new").length;
  const pendingOrders = orders.filter((o) => pendingStatuses().includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled" || o.status === "refunded").length;

  const hiddenProducts = mockProducts.filter((p) => p.status === "hidden").length;
  const stockAlerts: StockAlertRow[] = [];
  for (const p of mockProducts) {
    const inv = p.inventory;
    const th = p.lowStockThreshold;
    if (inv === 0) {
      stockAlerts.push({
        id: p.id,
        name: p.name,
        primaryImage: p.images[0] ?? null,
        quantity: 0,
        lowStockThreshold: th,
        kind: "out",
      });
    } else if (inv > 0 && inv <= th) {
      stockAlerts.push({
        id: p.id,
        name: p.name,
        primaryImage: p.images[0] ?? null,
        quantity: inv,
        lowStockThreshold: th,
        kind: "low",
      });
    }
  }
  const activeProductCount = mockProducts.filter((p) => p.status === "active").length;

  let revenueTrendPercent: number | null = null;
  if (prevMonthRevenue > 0) {
    revenueTrendPercent = Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
  } else if (monthRevenue > 0) {
    revenueTrendPercent = 100;
  }

  const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);

  const stats: DashboardStats = {
    totalRevenue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    totalOrders,
    newOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalProducts: activeProductCount,
    lowStockProducts: stockAlerts.length,
    hiddenProducts,
    totalCustomers: mockCustomers.length,
    revenueChart,
    topProducts,
  };

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) as DbOrder[];

  const chartMonthLabel = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, month: "long", year: "numeric" }).format(anchor);

  const marketing = aggregateMarketingRows(
    buildMockMarketingRows(),
    "7 ימים אחרונים (דוגמה לתצוגה)"
  );

  return {
    stats,
    recentOrders,
    stockAlerts,
    revenueTrendPercent,
    chartMonthLabel,
    marketing,
  };
}

async function fetchSupabaseSnapshot(sb: SB): Promise<DashboardSnapshot> {
  const now = new Date();

  const [
    { data: orderRows, error: ordErr },
    { data: itemRows, error: itemErr },
    { count: customerCount, error: custErr },
    { data: productRows, error: prodErr },
  ] = await Promise.all([
    sb.from("orders").select("*"),
    sb.from("order_items").select("*"),
    sb.from("customers").select("id", { count: "exact", head: true }),
    sb
      .from("products")
      .select("id, name, status, product_images(url, is_primary, sort_order), inventory(quantity, low_stock_threshold)"),
  ]);

  if (ordErr) throw new Error(`dashboard orders: ${ordErr.message}`);
  if (itemErr) throw new Error(`dashboard order_items: ${itemErr.message}`);
  if (custErr) throw new Error(`dashboard customers: ${custErr.message}`);
  if (prodErr) throw new Error(`dashboard products: ${prodErr.message}`);

  const orders = (orderRows ?? []) as DbOrder[];
  const statusById = new Map(orders.map((o) => [o.id, o.status as OrderStatus]));

  const revenueOrders = orders.filter((o) => revenueCounts(o.status as OrderStatus));
  let monthRevenue = 0;
  let prevMonthRevenue = 0;
  let todayRevenue = 0;
  let weekRevenue = 0;

  const prevRef = new Date(now);
  prevRef.setMonth(prevRef.getMonth() - 1);
  const { y: py, m: pm } = jerusalemYMD(prevRef);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  for (const o of revenueOrders) {
    const om = jerusalemYMDFromIso(o.created_at);
    if (sameJerusalemMonth(o.created_at, now)) monthRevenue += Number(o.total);
    if (om.y === py && om.m === pm) prevMonthRevenue += Number(o.total);
    if (sameJerusalemDay(o.created_at, now)) todayRevenue += Number(o.total);
    if (new Date(o.created_at) >= weekAgo) weekRevenue += Number(o.total);
  }

  const { y: cy, m: cm } = jerusalemYMD(now);
  const days = daysInMonth(cy, cm);
  const revenueByDay = new Map<number, { revenue: number; orders: number }>();
  for (let d = 1; d <= days; d++) revenueByDay.set(d, { revenue: 0, orders: 0 });

  for (const o of revenueOrders) {
    if (!sameJerusalemMonth(o.created_at, now)) continue;
    const { day } = jerusalemYMDFromIso(o.created_at);
    const cur = revenueByDay.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.total);
    cur.orders += 1;
    revenueByDay.set(day, cur);
  }

  const revenueChart: DashboardStats["revenueChart"] = [];
  for (let d = 1; d <= days; d++) {
    const row = revenueByDay.get(d) ?? { revenue: 0, orders: 0 };
    revenueChart.push({
      date: `${d}/${cm}`,
      revenue: row.revenue,
      orders: row.orders,
    });
  }

  const productAgg = new Map<string, { sales: number; revenue: number }>();
  for (const raw of itemRows ?? []) {
    const it = parseOrderItemRow(raw as Record<string, unknown>);
    if (!it) continue;
    const st = statusById.get(it.order_id);
    if (!st || !revenueCounts(st)) continue;
    const name = it.label;
    const cur = productAgg.get(name) ?? { sales: 0, revenue: 0 };
    cur.sales += it.quantity;
    cur.revenue += it.total_price;
    productAgg.set(name, cur);
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, sales: v.sales, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.status === "new").length;
  const pendingOrders = orders.filter((o) => pendingStatuses().includes(o.status as OrderStatus)).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const cancelledOrders = orders.filter(
    (o) => o.status === "cancelled" || o.status === "refunded"
  ).length;

  type ProdRow = DbProduct & {
    product_images: DbProductImage[] | null;
    inventory: DbInventory | null;
  };

  let activeCount = 0;
  let hiddenCount = 0;
  const stockAlerts: StockAlertRow[] = [];

  for (const raw of (productRows ?? []) as ProdRow[]) {
    if (raw.status === "active") activeCount += 1;
    if (raw.status === "hidden") hiddenCount += 1;
    const invRaw = raw.inventory;
    const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;
    const imgs = [...(raw.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const primary =
      imgs.find((i) => i.is_primary)?.url ?? imgs[0]?.url ?? null;
    const q = inv?.quantity ?? 0;
    const th = inv?.low_stock_threshold ?? 0;
    if (q === 0 && raw.status === "active") {
      stockAlerts.push({
        id: raw.id,
        name: raw.name,
        primaryImage: primary,
        quantity: 0,
        lowStockThreshold: th,
        kind: "out",
      });
    } else if (q > 0 && q <= th && raw.status !== "draft") {
      stockAlerts.push({
        id: raw.id,
        name: raw.name,
        primaryImage: primary,
        quantity: q,
        lowStockThreshold: th,
        kind: "low",
      });
    }
  }

  let revenueTrendPercent: number | null = null;
  if (prevMonthRevenue > 0) {
    revenueTrendPercent = Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
  } else if (monthRevenue > 0) {
    revenueTrendPercent = 100;
  }

  const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);

  const stats: DashboardStats = {
    totalRevenue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    totalOrders,
    newOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalProducts: activeCount,
    lowStockProducts: stockAlerts.length,
    hiddenProducts: hiddenCount,
    totalCustomers: customerCount ?? 0,
    revenueChart,
    topProducts,
  };

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const chartMonthLabel = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, month: "long", year: "numeric" }).format(now);

  const marketing = await fetchMarketingAttributionBlock(sb);

  return {
    stats,
    recentOrders,
    stockAlerts,
    revenueTrendPercent,
    chartMonthLabel,
    marketing,
  };
}

export async function getDashboardSnapshot(sb: SB): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return buildMockSnapshot();
  }
  return fetchSupabaseSnapshot(sb);
}
