/**
 * customerService — all customer-related Supabase queries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbOrder } from "@/types/database";
import type { CustomerWithStats } from "@/types";
import { mockCustomers } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";
import { readStudioDemoDbOrders } from "@/lib/studio-demo-storage";

type SB = SupabaseClient<Database>;

// ─── Mock adapter ─────────────────────────────────────────────────────────────

/** לקוחות שמופיעים רק מהזמנות סטודיו (דמו) ב-localStorage */
function studioDemoCustomersAsStats(): CustomerWithStats[] {
  const orders = readStudioDemoDbOrders();
  const byId = new Map<string, DbOrder[]>();
  for (const o of orders) {
    const cid = o.customer_id;
    if (!cid) continue;
    const arr = byId.get(cid) ?? [];
    arr.push(o);
    byId.set(cid, arr);
  }
  const rows: CustomerWithStats[] = [];
  for (const [id, list] of byId) {
    const sample = list[0]!;
    const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const oldest = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
    rows.push({
      id,
      name: sample.customer_name,
      email: sample.customer_email ?? "",
      phone: sample.customer_phone ?? "",
      city: sample.shipping_city ?? "",
      notes: null,
      created_at: oldest.created_at,
      updated_at: sorted[0]!.updated_at,
      orders_count: list.length,
      total_spent: list.reduce((s, x) => s + Number(x.total), 0),
      last_order_at: sorted[0]!.created_at,
    });
  }
  return rows.sort((a, b) => (b.last_order_at ?? "").localeCompare(a.last_order_at ?? ""));
}

function mockToCustomerWithStats(): CustomerWithStats[] {
  return mockCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.createdAt,
    orders_count: c.ordersCount,
    total_spent: c.totalSpent,
    last_order_at: c.lastOrderAt ?? null,
  }));
}

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getCustomers(sb: SB): Promise<CustomerWithStats[]> {
  if (!isSupabaseConfigured()) {
    const base = mockToCustomerWithStats();
    const extra = studioDemoCustomersAsStats();
    const seen = new Set(base.map((c) => c.id));
    return [...extra.filter((c) => !seen.has(c.id)), ...base];
  }

  // Fetch customers and their orders separately — avoids FK join ambiguity in generated types
  const { data: customerRows, error: custErr } = await sb
    .from("customers")
    .select("*")
    .order("name");

  if (custErr) throw new Error(`getCustomers: ${custErr.message}`);

  const { data: orderRows, error: ordErr } = await sb
    .from("orders")
    .select("customer_id, total, created_at")
    .not("customer_id", "is", null);

  if (ordErr) throw new Error(`getCustomers/orders: ${ordErr.message}`);

  type OrderRow = { customer_id: string | null; total: number; created_at: string };
  const ordersByCustomer = new Map<string, OrderRow[]>();
  for (const o of (orderRows ?? []) as OrderRow[]) {
    if (!o.customer_id) continue;
    const existing = ordersByCustomer.get(o.customer_id) ?? [];
    existing.push(o);
    ordersByCustomer.set(o.customer_id, existing);
  }

  const base = (customerRows ?? []).map((row) => {
    const orders = ordersByCustomer.get(row.id) ?? [];
    const orders_count = orders.length;
    const total_spent = orders.reduce((sum: number, o: OrderRow) => sum + Number(o.total), 0);
    const sorted = [...orders].sort((a: OrderRow, b: OrderRow) =>
      b.created_at.localeCompare(a.created_at)
    );
    const last_order_at = sorted[0]?.created_at ?? null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      orders_count,
      total_spent,
      last_order_at,
    };
  });

  if (typeof window === "undefined") return base;
  const extra = studioDemoCustomersAsStats();
  const seen = new Set(base.map((c) => c.id));
  return [...extra.filter((c) => !seen.has(c.id)), ...base];
}
