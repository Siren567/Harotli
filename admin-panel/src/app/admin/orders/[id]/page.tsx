"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Printer, ChevronDown, User, MapPin, CreditCard,
  Package, Clock, MessageSquare, CheckCircle, Truck, XCircle,
  RefreshCw, AlertCircle, Circle,
} from "lucide-react";
import type { OrderStatus, PaymentStatus, OrderWithDetails } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getOrderById, updateOrderStatus, updateOrderNote } from "@/lib/services/orderService";

// ─── Order status config ──────────────────────────────────────────────────────
const ORDER_STATUSES: { value: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: "new",        label: "חדשה",  icon: Circle,       color: "var(--info)"           },
  { value: "pending",    label: "ממתין",  icon: AlertCircle,  color: "var(--warning)"        },
  { value: "processing", label: "בעיבוד", icon: RefreshCw,    color: "var(--primary)"        },
  { value: "shipped",    label: "נשלח",   icon: Truck,        color: "var(--info)"           },
  { value: "completed",  label: "הושלם",  icon: CheckCircle,  color: "var(--success)"        },
  { value: "cancelled",  label: "בוטל",   icon: XCircle,      color: "var(--destructive)"    },
  { value: "refunded",   label: "הוחזר",  icon: RefreshCw,    color: "var(--muted-foreground)" },
];

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "paid",     label: "שולם"    },
  { value: "unpaid",   label: "לא שולם" },
  { value: "partial",  label: "חלקי"    },
  { value: "refunded", label: "הוחזר"   },
];
void PAYMENT_STATUSES; // used only for future payment status selector

function statusLabel(s: OrderStatus) {
  return ORDER_STATUSES.find((x) => x.value === s)?.label ?? s;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function SideCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon size={14} color="var(--muted-foreground)" />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
      </div>
      <div style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Timeline item ────────────────────────────────────────────────────────────
function TimelineItem({ status, note, created_at, isLast }: { status: string; note: string | null; created_at: string; isLast: boolean }) {
  const config = ORDER_STATUSES.find((s) => s.value === status);
  const Icon = config?.icon ?? Circle;
  const color = config?.color ?? "var(--muted-foreground)";

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${color}20`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} color={color} />
        </div>
        {!isLast && <div style={{ width: "2px", flex: 1, background: "var(--border)", marginTop: "4px", minHeight: "20px" }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : "16px", flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{config?.label ?? status}</p>
        {note && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>{note}</p>}
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>{formatDateTime(created_at)}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [order, setOrder]               = useState<OrderWithDetails | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("new");
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [adminNotes, setAdminNotes]     = useState("");
  const [notesSaved, setNotesSaved]     = useState(false);
  const [savingNotes, setSavingNotes]   = useState(false);

  const sb = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getOrderById(sb, id);
    if (data) {
      setOrder(data);
      setSelectedStatus(data.status as OrderStatus);
      setAdminNotes(data.admin_note ?? "");
    }
    setLoading(false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px" }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>טוען הזמנה...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "16px" }}>
        <Package size={48} color="var(--muted-foreground)" />
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>הזמנה לא נמצאה</h2>
        <button onClick={() => router.push("/admin/orders")} style={{ background: "var(--primary)", border: "none", borderRadius: "8px", padding: "9px 20px", color: "var(--primary-foreground)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          חזור להזמנות
        </button>
      </div>
    );
  }

  function requestStatusChange(s: OrderStatus) {
    setPendingStatus(s);
    setConfirmOpen(true);
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;
    try {
      await updateOrderStatus(sb, order!.id, pendingStatus);
      setOrder((prev) => prev ? { ...prev, status: pendingStatus } : prev);
      setSelectedStatus(pendingStatus);
      toast(`סטטוס עודכן: ${statusLabel(pendingStatus)}`, "success");
    } catch {
      toast("שגיאה בעדכון סטטוס", "error");
    }
    setConfirmOpen(false);
    setPendingStatus(null);
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateOrderNote(sb, order!.id, adminNotes);
      setNotesSaved(true);
      toast("הערות נשמרו", "success");
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      toast("שגיאה בשמירת הערות", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  const timeline = [...order.timeline].reverse();

  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "8px",
    padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none",
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1200px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={() => router.push("/admin/orders")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: 500, color: "var(--foreground-secondary)", cursor: "pointer" }}
            >
              <ArrowRight size={14} />
              חזרה
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", display: "flex", alignItems: "center", gap: "10px" }}>
                הזמנה {order.order_number}
                <OrderStatusBadge status={order.status as OrderStatus} />
              </h1>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>{formatDateTime(order.created_at)}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => window.print()} style={{ ...btnBase, background: "var(--input)", color: "var(--foreground-secondary)", border: "1px solid var(--border)" }}>
              <Printer size={14} />
              הדפס
            </button>
            <div style={{ position: "relative" }}>
              <select
                value={selectedStatus}
                onChange={(e) => requestStatusChange(e.target.value as OrderStatus)}
                style={{ appearance: "none", WebkitAppearance: "none", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "8px", padding: "8px 36px 8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}
              >
                {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--primary-foreground)", pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

          {/* ── LEFT: main content ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Items table */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>פריטים ({order.items.length})</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["מוצר", "התאמה אישית", "כמות", "מחיר יחידה", "סה״כ"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={item.id ?? i} style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "8px", overflow: "hidden", background: "var(--input)", border: "1px solid var(--border)", flexShrink: 0 }}>
                            {item.product_image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.product_image} alt={item.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={16} color="var(--muted-foreground)" /></div>
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{item.product_name}</p>
                            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }}>{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        {item.customization ? (
                          <span style={{ fontSize: "13px", color: "var(--primary)", background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: "6px", padding: "2px 8px" }}>
                            {item.customization}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textAlign: "center" }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", fontSize: "13px", color: "var(--foreground-secondary)" }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pricing summary */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", marginBottom: "14px" }}>סיכום תשלום</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "סכום ביניים", value: formatCurrency(order.subtotal), color: "var(--foreground-secondary)" },
                  { label: "משלוח", value: order.shipping_cost === 0 ? "חינם" : formatCurrency(order.shipping_cost), color: "var(--foreground-secondary)" },
                  ...((order.discount_amount ?? 0) > 0 ? [{ label: "הנחה", value: `-${formatCurrency(order.discount_amount ?? 0)}`, color: "var(--success)" }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{label}</span>
                    <span style={{ fontSize: "13px", color }}>{value}</span>
                  </div>
                ))}
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)" }}>סה״כ לתשלום</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Customer notes */}
            {order.customer_note && (
              <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                  <MessageSquare size={13} color="var(--warning)" />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--warning)" }}>הערת לקוח</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--foreground-secondary)", lineHeight: 1.5 }}>{order.customer_note}</p>
              </div>
            )}

            {/* Admin notes */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={14} color="var(--muted-foreground)" />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>הערות ניהול</span>
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <textarea
                  value={adminNotes}
                  onChange={(e) => { setAdminNotes(e.target.value); setNotesSaved(false); }}
                  placeholder="הוסף הערות פנימיות..."
                  rows={4}
                  style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    style={{ ...btnBase, background: notesSaved ? "rgba(34,197,94,0.15)" : "var(--primary)", color: notesSaved ? "var(--success)" : "var(--primary-foreground)", border: notesSaved ? "1px solid rgba(34,197,94,0.3)" : "none", transition: "all 0.2s", opacity: savingNotes ? 0.6 : 1 }}
                  >
                    {notesSaved ? <><CheckCircle size={13} /> נשמר</> : "שמור הערות"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Order status */}
            <SideCard title="סטטוס הזמנה" icon={RefreshCw}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <OrderStatusBadge status={order.status as OrderStatus} />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                  style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", cursor: "pointer" }}
                >
                  {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button
                  onClick={() => requestStatusChange(selectedStatus)}
                  disabled={selectedStatus === order.status}
                  style={{ ...btnBase, background: "var(--primary)", color: "var(--primary-foreground)", opacity: selectedStatus === order.status ? 0.5 : 1, cursor: selectedStatus === order.status ? "not-allowed" : "pointer", justifyContent: "center", border: "none" }}
                >
                  עדכן סטטוס
                </button>
              </div>
            </SideCard>

            {/* Payment status */}
            <SideCard title="תשלום" icon={CreditCard}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <PaymentStatusBadge status={order.payment_status as PaymentStatus} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>אמצעי תשלום</span>
                  <span style={{ color: "var(--foreground-secondary)", fontWeight: 500 }}>{order.payment_method ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>סכום</span>
                  <span style={{ color: "var(--foreground)", fontWeight: 700 }}>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </SideCard>

            {/* Customer info */}
            <SideCard title="פרטי לקוח" icon={User}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>{order.customer_name}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px" }}>
                  {order.customer_email && (
                    <a href={`mailto:${order.customer_email}`} style={{ color: "var(--info)", textDecoration: "none" }}>{order.customer_email}</a>
                  )}
                  {order.customer_phone && (
                    <a href={`tel:${order.customer_phone}`} style={{ color: "var(--foreground-secondary)", textDecoration: "none" }}>{order.customer_phone}</a>
                  )}
                </div>
                {order.customer_id && (
                  <button
                    onClick={() => router.push(`/admin/customers/${order.customer_id}`)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", padding: "6px 12px", fontSize: "12px", fontWeight: 500, color: "var(--foreground-secondary)", cursor: "pointer", width: "100%", justifyContent: "center" }}
                  >
                    <User size={12} />
                    פרופיל לקוח
                  </button>
                )}
              </div>
            </SideCard>

            {/* Shipping address */}
            <SideCard title="כתובת משלוח" icon={MapPin}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "13px", color: "var(--foreground-secondary)" }}>{order.shipping_street ?? "—"}</p>
                <p style={{ fontSize: "13px", color: "var(--foreground-secondary)" }}>{order.shipping_city ?? "—"}</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{order.shipping_zip ?? ""}</p>
                {order.shipping_method && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>שיטת משלוח: </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground-secondary)" }}>{order.shipping_method}</span>
                  </div>
                )}
              </div>
            </SideCard>

            {/* Timeline */}
            <SideCard title="היסטוריית הזמנה" icon={Clock}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {timeline.map((entry, i) => (
                  <TimelineItem
                    key={entry.id ?? i}
                    status={entry.status}
                    note={entry.note}
                    created_at={entry.created_at}
                    isLast={i === timeline.length - 1}
                  />
                ))}
              </div>
            </SideCard>

          </div>
        </div>
      </div>

      {/* Status change confirm */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingStatus(null); setSelectedStatus(order.status as OrderStatus); }}
        onConfirm={confirmStatusChange}
        title="שינוי סטטוס הזמנה"
        message={`האם לשנות את סטטוס ההזמנה ${order.order_number} ל"${pendingStatus ? statusLabel(pendingStatus) : ""}"?`}
        confirmLabel="עדכן"
      />
    </>
  );
}
