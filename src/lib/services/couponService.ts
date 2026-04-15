/**
 * couponService — CRUD for store coupons (Supabase or mock).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbCoupon } from "@/types/database";
import { mockCoupons } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";

type SB = SupabaseClient<Database>;

function mockToDb(): DbCoupon[] {
  return mockCoupons.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    min_order_value: c.minOrderValue ?? null,
    max_uses: c.maxUses ?? null,
    used_count: c.usedCount,
    is_active: c.active,
    expires_at: c.expiresAt ?? null,
    created_at: c.createdAt,
  }));
}

/** Mutable copy for dev when Supabase is not configured */
let mockCouponStore: DbCoupon[] | null = null;
function getMockCouponStore(): DbCoupon[] {
  if (!mockCouponStore) mockCouponStore = mockToDb();
  return mockCouponStore;
}

export interface CouponFormData {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_value: number | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
}

export async function getCoupons(sb: SB): Promise<DbCoupon[]> {
  if (!isSupabaseConfigured()) return [...getMockCouponStore()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const { data, error } = await sb
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getCoupons: ${error.message}`);
  return (data ?? []) as DbCoupon[];
}

export async function createCoupon(sb: SB, form: CouponFormData): Promise<DbCoupon> {
  const code = form.code.trim().toUpperCase();
  if (!isSupabaseConfigured()) {
    const store = getMockCouponStore();
    if (store.some((c) => c.code === code)) throw new Error("קוד קופון כבר קיים");
    const row: DbCoupon = {
      id: `mock-coupon-${Date.now()}`,
      code,
      type: form.type,
      value: form.value,
      min_order_value: form.min_order_value,
      max_uses: form.max_uses,
      used_count: 0,
      is_active: form.is_active,
      expires_at: form.expires_at,
      created_at: new Date().toISOString(),
    };
    store.unshift(row);
    return row;
  }

  const { data, error } = await sb
    .from("coupons")
    .insert({
      code,
      type: form.type,
      value: form.value,
      min_order_value: form.min_order_value,
      max_uses: form.max_uses,
      used_count: 0,
      is_active: form.is_active,
      expires_at: form.expires_at,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "createCoupon failed");
  return data as DbCoupon;
}

export async function updateCoupon(sb: SB, id: string, form: CouponFormData): Promise<void> {
  const code = form.code.trim().toUpperCase();
  if (!isSupabaseConfigured()) {
    const store = getMockCouponStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("קופון לא נמצא");
    if (store.some((c, i) => c.code === code && i !== idx)) throw new Error("קוד קופון כבר קיים");
    const prev = store[idx]!;
    store[idx] = {
      ...prev,
      code,
      type: form.type,
      value: form.value,
      min_order_value: form.min_order_value,
      max_uses: form.max_uses,
      is_active: form.is_active,
      expires_at: form.expires_at,
    };
    return;
  }

  const { error } = await sb
    .from("coupons")
    .update({
      code,
      type: form.type,
      value: form.value,
      min_order_value: form.min_order_value,
      max_uses: form.max_uses,
      is_active: form.is_active,
      expires_at: form.expires_at,
    })
    .eq("id", id);

  if (error) throw new Error(`updateCoupon: ${error.message}`);
}

export async function deleteCoupon(sb: SB, id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getMockCouponStore();
    const idx = store.findIndex((c) => c.id === id);
    if (idx !== -1) store.splice(idx, 1);
    return;
  }

  const { error } = await sb.from("coupons").delete().eq("id", id);
  if (error) throw new Error(`deleteCoupon: ${error.message}`);
}

/** חישוב הנחה על סכום ביניים (מחיר מוצרים בלבד, לפני משלוח) */
export function computeCouponDiscount(
  c: DbCoupon,
  subtotal: number
): { ok: true; discount: number } | { ok: false; message: string } {
  const st = Number(subtotal);
  if (!Number.isFinite(st) || st <= 0) return { ok: false, message: "סכום לא תקין" };
  if (!c.is_active) return { ok: false, message: "הקופון לא פעיל" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false, message: "פג תוקף הקופון" };
  if (c.min_order_value != null && st < Number(c.min_order_value)) {
    return { ok: false, message: `מינימום הזמנה לקופון: ₪${Number(c.min_order_value)}` };
  }
  if (c.max_uses != null && c.used_count >= c.max_uses) return { ok: false, message: "נוצלו כל השימושים בקופון" };

  let discount = 0;
  if (c.type === "percentage") {
    discount = Math.round(st * (Number(c.value) / 100) * 100) / 100;
  } else {
    discount = Math.min(Number(c.value), st);
  }
  discount = Math.round(discount * 100) / 100;
  if (discount <= 0) return { ok: false, message: "אין הנחה חלה" };
  if (discount > st) discount = st;
  return { ok: true, discount };
}

/** `sb` נדרש רק כשמחובר Supabase */
export async function getCouponByCode(sb: SB | null, code: string): Promise<DbCoupon | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (!isSupabaseConfigured()) {
    return getMockCouponStore().find((c) => c.code === normalized) ?? null;
  }
  if (!sb) return null;
  const { data, error } = await sb.from("coupons").select("*").eq("code", normalized).maybeSingle();
  if (error) throw new Error(`getCouponByCode: ${error.message}`);
  return data as DbCoupon | null;
}

/** לאחר הזמנה מוצלחת — מעלה used_count ב־1 */
export async function incrementCouponUse(sb: SB | null, id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getMockCouponStore();
    const c = store.find((x) => x.id === id);
    if (c) c.used_count += 1;
    return;
  }
  if (!sb) return;
  const { data: row, error: fetchErr } = await sb.from("coupons").select("used_count, max_uses").eq("id", id).maybeSingle();
  if (fetchErr || !row) return;
  const next = (row.used_count ?? 0) + 1;
  if (row.max_uses != null && next > row.max_uses) return;
  await sb.from("coupons").update({ used_count: next }).eq("id", id);
}
