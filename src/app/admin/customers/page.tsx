"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Users, TrendingUp, Award, ArrowUpDown,
  Eye, MessageSquare, ChevronUp, ChevronDown,
} from "lucide-react";
import type { CustomerWithStats } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getCustomers } from "@/lib/services/customerService";

type SortKey = "name" | "orders_count" | "total_spent" | "last_order_at";
type SortDir = "asc" | "desc";

function SortButton({
  label, sortKey, currentKey, dir, onClick,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onClick: () => void;
}) {
  const active = sortKey === currentKey;
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        background: "none", border: "none", cursor: "pointer",
        color: active ? "var(--primary)" : "var(--muted-foreground)",
        fontSize: "11px", fontWeight: 600, padding: 0,
      }}
    >
      {label}
      {active
        ? (dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
        : <ArrowUpDown size={10} style={{ opacity: 0.5 }} />}
    </button>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const toast  = useToast();

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("total_spent");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");

  const sb = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers(sb);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...customers];
    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
      );
    }
    list.sort((a, b) => {
      const va: string | number =
        sortKey === "name"         ? a.name :
        sortKey === "orders_count" ? a.orders_count :
        sortKey === "total_spent"  ? a.total_spent :
        (a.last_order_at ?? "");
      const vb: string | number =
        sortKey === "name"         ? b.name :
        sortKey === "orders_count" ? b.orders_count :
        sortKey === "total_spent"  ? b.total_spent :
        (b.last_order_at ?? "");
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [customers, search, sortKey, sortDir]);

  // Stats
  const totalCustomers = customers.length;
  const now = new Date();
  const thisMonth = customers.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const topSpender = [...customers].sort((a, b) => b.total_spent - a.total_spent)[0];

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "right", fontSize: "11px",
    fontWeight: 600, color: "var(--muted-foreground)", whiteSpace: "nowrap",
    background: "var(--surface)", borderBottom: "1px solid var(--border)",
  };
  const tdStyle: React.CSSProperties = { padding: "13px 14px", fontSize: "13px", verticalAlign: "middle" };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .customer-row:hover { background: var(--card-hover) !important; }
        .action-btn:hover { background: var(--surface) !important; border-color: var(--primary) !important; color: var(--primary) !important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.2s ease" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>לקוחות</h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "3px" }}>
            {totalCustomers} לקוחות רשומים
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={18} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{totalCustomers}</p>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>סה״כ לקוחות</p>
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TrendingUp size={18} color="var(--success)" />
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{thisMonth}</p>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>חדשים החודש</p>
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Award size={18} color="var(--warning)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {topSpender?.name ?? "—"}
              </p>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>
                {topSpender ? formatCurrency(topSpender.total_spent) : ""} · הרוכש הגדול ביותר
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 36px 8px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}><SortButton label="שם לקוח" sortKey="name" currentKey={sortKey} dir={sortDir} onClick={() => handleSort("name")} /></th>
                  <th style={thStyle}>טלפון</th>
                  <th style={thStyle}>עיר</th>
                  <th style={thStyle}><SortButton label="הזמנות" sortKey="orders_count" currentKey={sortKey} dir={sortDir} onClick={() => handleSort("orders_count")} /></th>
                  <th style={thStyle}><SortButton label="סה״כ רכישות" sortKey="total_spent" currentKey={sortKey} dir={sortDir} onClick={() => handleSort("total_spent")} /></th>
                  <th style={thStyle}><SortButton label="הזמנה אחרונה" sortKey="last_order_at" currentKey={sortKey} dir={sortDir} onClick={() => handleSort("last_order_at")} /></th>
                  <th style={{ ...thStyle, textAlign: "center" }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "60px 24px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "54px", height: "54px", background: "var(--input)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Users size={24} color="var(--muted-foreground)" />
                        </div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>לא נמצאו לקוחות</p>
                        <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>נסה לשנות את החיפוש</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((customer, i) => (
                    <tr
                      key={customer.id}
                      className="customer-row"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", transition: "background 0.1s", background: "transparent" }}
                    >
                      {/* Name + email */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", marginBottom: "1px" }}>{customer.name}</p>
                            <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{customer.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ ...tdStyle, color: "var(--foreground-secondary)", direction: "ltr", textAlign: "right" }}>
                        {customer.phone ?? "—"}
                      </td>

                      {/* City */}
                      <td style={{ ...tdStyle, color: "var(--foreground-secondary)" }}>
                        {customer.city ?? "—"}
                      </td>

                      {/* Orders count */}
                      <td style={tdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>
                          {customer.orders_count}
                        </span>
                      </td>

                      {/* Total spent */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                          {formatCurrency(customer.total_spent)}
                        </span>
                      </td>

                      {/* Last order */}
                      <td style={{ ...tdStyle, color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {customer.last_order_at ? formatDate(customer.last_order_at) : "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            className="action-btn"
                            onClick={() => router.push(`/admin/customers/${customer.id}`)}
                            title="צפה בלקוח"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "var(--muted-foreground)", transition: "all 0.15s" }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => { toast(`פתיחת הערות עבור ${customer.name}`, "info"); }}
                            title="הערות"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "var(--muted-foreground)", transition: "all 0.15s" }}
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                מציג {filtered.length} מתוך {totalCustomers} לקוחות
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
