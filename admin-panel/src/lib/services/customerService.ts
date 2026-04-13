/**
 * customerService — all customer-related Supabase queries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CustomerWithStats } from "@/types";
import { mockCustomers } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";

type SB = SupabaseClient<Database>;

// ─── Mock adapter ─────────────────────────────────────────────────────────────

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
  if (!isSupabaseConfigured()) return mockToCustomerWithStats();

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

  return (customerRows ?? []).map((row) => {
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
}
