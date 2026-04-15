"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Ticket, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import type { DbCoupon } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type CouponFormData,
} from "@/lib/services/couponService";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const EMPTY_FORM: CouponFormData = {
  code: "",
  type: "percentage",
  value: 10,
  min_order_value: null,
  max_uses: null,
  expires_at: null,
  is_active: true,
};

function CouponModal({
  coupon,
  onClose,
  onSave,
}: {
  coupon: DbCoupon | null;
  onClose: () => void;
  onSave: (form: CouponFormData, id?: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CouponFormData>(() =>
    coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          min_order_value: coupon.min_order_value != null ? Number(coupon.min_order_value) : null,
          max_uses: coupon.max_uses ?? null,
          expires_at: coupon.expires_at,
          is_active: coupon.is_active,
        }
      : { ...EMPTY_FORM }
  );
  const [expiresLocal, setExpiresLocal] = useState(() => toDatetimeLocalValue(coupon?.expires_at));
  const [errors, setErrors] = useState<Partial<Record<keyof CouponFormData | "general", string>>>({});

  function set<K extends keyof CouponFormData>(k: K, v: CouponFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.code.trim()) errs.code = "קוד חובה";
    if (form.value <= 0) errs.value = "ערך חייב להיות חיובי";
    if (form.type === "percentage" && form.value > 100) errs.value = "אחוז מקסימלי 100";
    const minV = form.min_order_value;
    if (minV != null && minV < 0) errs.min_order_value = "לא תקין";
    const maxU = form.max_uses;
    if (maxU != null && (!Number.isInteger(maxU) || maxU < 1)) errs.max_uses = "מספר שלם חיובי או ריק ללא הגבלה";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const expiresIso = fromDatetimeLocalValue(expiresLocal);
    onSave({ ...form, code: form.code.trim().toUpperCase(), expires_at: expiresIso }, coupon?.id);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--input)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    color: "var(--foreground)",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--muted-foreground)",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>
            {coupon ? "עריכת קופון" : "קופון חדש"}
          </h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {errors.general && (
              <p style={{ fontSize: "12px", color: "var(--destructive)" }}>{errors.general}</p>
            )}
            <div>
              <label style={labelStyle}>קוד קופון *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.code ? "var(--destructive)" : "var(--border)" }}
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="SUMMER2025"
                dir="ltr"
                disabled={!!coupon}
              />
              {coupon && (
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                  לא ניתן לשנות קוד קיים (מזהה ייחודי במערכת)
                </p>
              )}
              {errors.code && <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "4px" }}>{errors.code}</p>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>סוג הנחה</label>
                <select style={inputStyle} value={form.type} onChange={(e) => set("type", e.target.value as CouponFormData["type"])}>
                  <option value="percentage">אחוזים (%)</option>
                  <option value="fixed">סכום קבוע (₪)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{form.type === "percentage" ? "אחוז *" : "סכום (₪) *"}</label>
                <input
                  type="number"
                  step={form.type === "percentage" ? "1" : "0.01"}
                  min={0}
                  style={{ ...inputStyle, borderColor: errors.value ? "var(--destructive)" : "var(--border)" }}
                  value={form.value}
                  onChange={(e) => set("value", Number(e.target.value))}
                />
                {errors.value && <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "4px" }}>{errors.value}</p>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>מינימום לסל (₪) — אופציונלי</label>
              <input
                type="number"
                step="0.01"
                min={0}
                style={inputStyle}
                value={form.min_order_value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("min_order_value", v === "" ? null : Number(v));
                }}
                placeholder="ללא הגבלה"
              />
              {errors.min_order_value && (
                <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "4px" }}>{errors.min_order_value}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>מקסימום שימושים — ריק = ללא הגבלה</label>
              <input
                type="number"
                min={1}
                step={1}
                style={inputStyle}
                value={form.max_uses ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("max_uses", v === "" ? null : parseInt(v, 10));
                }}
                placeholder="ללא הגבלה"
              />
              {errors.max_uses && <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "4px" }}>{errors.max_uses}</p>}
            </div>
            <div>
              <label style={labelStyle}>תאריך ושעת תפוגה — אופציונלי</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={expiresLocal}
                onChange={(e) => setExpiresLocal(e.target.value)}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                style={{ width: "16px", height: "16px" }}
              />
              קופון פעיל
            </label>
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--foreground-secondary)",
                cursor: "pointer",
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                background: "var(--primary)",
                border: "none",
                borderRadius: "8px",
                padding: "9px 20px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#09090b",
                cursor: "pointer",
              }}
            >
              {coupon ? "שמור" : "צור קופון"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function usesLabel(c: DbCoupon): string {
  const max = c.max_uses;
  if (max == null) return `${c.used_count} / ∞`;
  return `${c.used_count} / ${max}`;
}

function isExpired(c: DbCoupon): boolean {
  if (!c.expires_at) return false;
  return new Date(c.expires_at).getTime() < Date.now();
}

function isExhausted(c: DbCoupon): boolean {
  if (c.max_uses == null) return false;
  return c.used_count >= c.max_uses;
}

export default function DiscountsPage() {
  const toast = useToast();
  const sb = useMemo(() => createClient(), []);

  const [coupons, setCoupons] = useState<DbCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<DbCoupon | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCoupons(sb);
      setCoupons(data);
    } catch (err) {
      console.error(err);
      toast("שגיאה בטעינת הקופונים", "error");
    } finally {
      setLoading(false);
    }
  }, [sb, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: CouponFormData, id?: string) {
    try {
      if (id) {
        await updateCoupon(sb, id, form);
        toast("הקופון עודכן", "success");
      } else {
        await createCoupon(sb, form);
        toast("הקופון נוצר", "success");
      }
      setModal(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בשמירה";
      const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
      const dup = code === "23505" || /duplicate|unique/i.test(msg);
      toast(dup ? "קוד הקופון כבר קיים במערכת" : msg, "error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteCoupon(sb, deleteId);
      toast("הקופון נמחק", "success");
      setDeleteId(null);
      await load();
    } catch (err) {
      console.error(err);
      toast("שגיאה במחיקה", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>הנחות וקופונים</h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
            ניהול קודי הנחה, מגבלת שימושים, תוקף והפעלה
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: "var(--primary)",
            border: "none",
            borderRadius: "9px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#09090b",
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> קופון חדש
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>
            טוען…
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <Ticket size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: "14px", marginBottom: "12px" }}>אין קופונים עדיין</p>
            <button
              type="button"
              onClick={() => setModal("new")}
              style={{
                background: "var(--primary)",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#09090b",
                cursor: "pointer",
              }}
            >
              צור קופון ראשון
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  {["קוד", "הנחה", "מינ׳ סל", "שימושים", "תפוגה", "סטטוס", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((c, i) => {
                  const expired = isExpired(c);
                  const exhausted = isExhausted(c);
                  const inactive = !c.is_active;
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                        opacity: inactive ? 0.65 : 1,
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 700, direction: "ltr", textAlign: "right" }}>{c.code}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {c.type === "percentage" ? `${Number(c.value)}%` : formatCurrency(Number(c.value))}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                        {c.min_order_value != null ? formatCurrency(Number(c.min_order_value)) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px" }}>{usesLabel(c)}</td>
                      <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                        {c.expires_at ? formatDateTime(c.expires_at) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }}>
                          <span style={{ color: c.is_active ? "var(--success)" : "var(--muted-foreground)" }}>
                            {c.is_active ? "פעיל" : "כבוי"}
                          </span>
                          {expired && <span style={{ color: "var(--destructive)" }}>פג תוקף</span>}
                          {exhausted && !expired && <span style={{ color: "var(--warning)" }}>מיצה שימושים</span>}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            title="עריכה"
                            onClick={() => setModal(c)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              background: "var(--input)",
                              cursor: "pointer",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="מחיקה"
                            onClick={() => setDeleteId(c.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              background: "var(--input)",
                              cursor: "pointer",
                              color: "var(--destructive)",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <CouponModal
          key={modal === "new" ? "new" : modal.id}
          coupon={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "380px",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={18} color="var(--destructive)" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>מחיקת קופון</h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px", lineHeight: 1.6 }}>
              למחוק את הקופון &quot;{coupons.find((x) => x.id === deleteId)?.code}&quot;? לא ניתן לבטל.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                style={{
                  background: "var(--input)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  background: "var(--destructive)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
