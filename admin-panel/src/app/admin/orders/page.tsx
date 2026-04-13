"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Filter, ChevronLeft, ChevronRight, ShoppingBag,
  Eye, ChevronDown,
} from "lucide-react";
import type { DbOrder, OrderStatus, PaymentStatus } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getOrders, updateOrderStatus } from "@/lib/services/orderService";

// ─── Status change dropdown ───────────────────────────────────────────────────
const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "new",        label: "חדשה"    },
  { value: "pending",    label: "ממתין"   },
  { value: "processing", label: "בעיבוד"  },
  { value: "shipped",    label: "נשלח"    },
  { value: "completed",  label: "הושלם"   },
  { value: "cancelled",  label: "בוטל"    },
  { value: "refunded",   label: "הוחזר"   },
];

function StatusDropdown({
  currentStatus, onChangeStatus,
}: {
  currentStatus: OrderStatus;
  onChangeStatus: (s: OrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px",
          padding: "5px 10px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
          color: "var(--foreground-secondary)", whiteSpace: "nowrap",
        }}
      >
        שנה סטטוס <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 200,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)", padding: "4px", minWidth: "140px",
          animation: "menuIn 0.12s ease",
        }}>
          {ORDER_STATUSES.filter((s) => s.value !== currentStatus).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { onChangeStatus(value); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "8px 12px",
                background: "none", border: "none", borderRadius: "6px",
                cursor: "pointer", fontSize: "13px",
                color: "var(--foreground-secondary)", textAlign: "right", fontWeight: 500,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--input)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type DateRange = "all" | "today" | "week" | "month";
type SortKey  = "created_at" | "total" | "status";

export default function OrdersPage() {
  const router = useRouter();
  const toast  = useToast();

  const [orders, setOrders]               = useState<DbOrder[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [dateRange, setDateRange]         = useState<DateRange>("all");
  const [sortKey, setSortKey]             = useState<SortKey>("created_at");
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc");
  const [page, setPage]                   = useState(1);
  const PER_PAGE = 10;

  const sb = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { orders: data } = await getOrders(sb, { perPage: 999 });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Stats ──
  const stats: { key: OrderStatus; label: string; count: number; color: string }[] = [
    { key: "new",        label: "חדשות", count: orders.filter((o) => o.status === "new").length,        color: "var(--info)"        },
    { key: "pending",    label: "ממתין", count: orders.filter((o) => o.status === "pending").length,    color: "var(--warning)"     },
    { key: "processing", label: "בעיבוד",count: orders.filter((o) => o.status === "processing").length, color: "var(--primary)"     },
    { key: "shipped",    label: "נשלח",  count: orders.filter((o) => o.status === "shipped").length,    color: "var(--info)"        },
    { key: "completed",  label: "הושלם", count: orders.filter((o) => o.status === "completed").length,  color: "var(--success)"     },
    { key: "cancelled",  label: "בוטל",  count: orders.filter((o) => o.status === "cancelled").length,  color: "var(--destructive)" },
  ];

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    const now = new Date();
    let list = [...orders];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((o) =>
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_phone ?? "").includes(q)
    );
    if (statusFilter  !== "all") list = list.filter((o) => o.status         === statusFilter);
    if (paymentFilter !== "all") list = list.filter((o) => o.payment_status === paymentFilter);
    if (dateRange !== "all") {
      const cutoff = new Date(now);
      if      (dateRange === "today") cutoff.setHours(0, 0, 0, 0);
      else if (dateRange === "week")  cutoff.setDate(now.getDate() - 7);
      else if (dateRange === "month") cutoff.setMonth(now.getMonth() - 1);
      list = list.filter((o) => new Date(o.created_at) >= cutoff);
    }
    list.sort((a, b) => {
      const va: string | number = sortKey === "total" ? a.total : sortKey === "status" ? a.status : a.created_at;
      const vb: string | number = sortKey === "total" ? b.total : sortKey === "status" ? b.status : b.created_at;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [orders, search, statusFilter, paymentFilter, dateRange, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    try {
      await updateOrderStatus(sb, orderId, newStatus);
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o
      ));
      const label = ORDER_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
      toast(`סטטוס הזמנה עודכן: ${label}`, "success");
    } catch {
      toast("שגיאה בעדכון סטטוס", "error");
    }
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "right", fontSize: "11px", fontWeight: 600,
    color: "var(--muted-foreground)", whiteSpace: "nowrap",
    background: "var(--surface)", borderBottom: "1px solid var(--border)",
  };
  const tdStyle: React.CSSProperties = { padding: "13px 14px", fontSize: "13px", verticalAlign: "middle" };

  return (
    <>
      <style>{`
        @keyframes menuIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>הזמנות</h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "3px" }}>{orders.length} הזמנות סה״כ</p>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {stats.map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key === statusFilter ? "all" : key); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: statusFilter === key ? "rgba(201,169,110,0.1)" : "var(--card)",
                border: `1px solid ${statusFilter === key ? "rgba(201,169,110,0.4)" : "var(--border)"}`,
                borderRadius: "8px", padding: "7px 12px", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 700, color }}>{count}</span>
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="חיפוש לפי מספר, לקוח, טלפון..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 36px 8px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ width: "1px", height: "28px", background: "var(--border)" }} />
          <Filter size={13} style={{ color: "var(--muted-foreground)" }} />

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | "all"); setPage(1); }} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none", cursor: "pointer" }}>
            <option value="all">כל הסטטוסים</option>
            {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as PaymentStatus | "all"); setPage(1); }} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none", cursor: "pointer" }}>
            <option value="all">כל התשלומים</option>
            <option value="paid">שולם</option>
            <option value="unpaid">לא שולם</option>
            <option value="partial">חלקי</option>
            <option value="refunded">הוחזר</option>
          </select>

          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value as DateRange); setPage(1); }} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none", cursor: "pointer" }}>
            <option value="all">כל הזמנים</option>
            <option value="today">היום</option>
            <option value="week">שבוע אחרון</option>
            <option value="month">חודש אחרון</option>
          </select>

          <select
            value={`${sortKey}_${sortDir}`}
            onChange={(e) => {
              const parts = e.target.value.split("_");
              const dir   = parts.pop() as "asc" | "desc";
              setSortKey(parts.join("_") as SortKey);
              setSortDir(dir);
              setPage(1);
            }}
            style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none", cursor: "pointer" }}
          >
            <option value="created_at_desc">תאריך: חדש לישן</option>
            <option value="created_at_asc">תאריך: ישן לחדש</option>
            <option value="total_desc">סכום: גבוה לנמוך</option>
            <option value="total_asc">סכום: נמוך לגבוה</option>
            <option value="status_asc">סטטוס: א-ת</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>הזמנה</th>
                  <th style={thStyle}>לקוח</th>
                  <th style={thStyle}>סכום</th>
                  <th style={thStyle}>תשלום</th>
                  <th style={thStyle}>סטטוס</th>
                  <th style={thStyle}>משלוח</th>
                  <th style={thStyle}>תאריך</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "60px 24px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "54px", height: "54px", background: "var(--input)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ShoppingBag size={24} color="var(--muted-foreground)" />
                        </div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>לא נמצאו הזמנות</p>
                        <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>נסה לשנות את הסינון</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((order, i) => (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                      style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--card-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {/* Order # */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{order.order_number}</span>
                      </td>

                      {/* Customer */}
                      <td style={tdStyle}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", marginBottom: "1px" }}>{order.customer_name}</p>
                        <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{order.customer_phone ?? "—"}</p>
                      </td>

                      {/* Total */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>{formatCurrency(order.total)}</span>
                      </td>

                      {/* Payment */}
                      <td style={tdStyle}><PaymentStatusBadge status={order.payment_status} /></td>

                      {/* Status */}
                      <td style={tdStyle}><OrderStatusBadge status={order.status} /></td>

                      {/* Shipping */}
                      <td style={{ ...tdStyle, color: "var(--foreground-secondary)", fontSize: "12px" }}>{order.shipping_method ?? "—"}</td>

                      {/* Date */}
                      <td style={{ ...tdStyle, color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>{formatDateTime(order.created_at)}</td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/orders/${order.id}`); }}
                            title="צפה בהזמנה"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "var(--muted-foreground)" }}
                          >
                            <Eye size={14} />
                          </button>
                          <StatusDropdown
                            currentStatus={order.status}
                            onChangeStatus={(s) => handleStatusChange(order.id, s)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PER_PAGE && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                מציג {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} מתוך {filtered.length}
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", color: "var(--muted-foreground)", opacity: page === 1 ? 0.5 : 1 }}
                >
                  <ChevronRight size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => idx + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{ background: n === page ? "var(--primary)" : "var(--input)", border: `1px solid ${n === page ? "var(--primary)" : "var(--border)"}`, borderRadius: "7px", width: "32px", height: "32px", fontSize: "12px", fontWeight: n === page ? 700 : 400, color: n === page ? "var(--primary-foreground)" : "var(--foreground)", cursor: "pointer" }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", color: "var(--muted-foreground)", opacity: page === totalPages ? 0.5 : 1 }}
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
