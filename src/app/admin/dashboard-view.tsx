"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TrendingUp, ShoppingBag, Package, Users, AlertTriangle,
  ArrowUpRight, Plus, Clock, CheckCircle, XCircle, Megaphone,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import type { DashboardSnapshot, MarketingAttributionBlock } from "@/lib/services/dashboardService";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";
import type { DbOrder } from "@/types/database";
import { readStudioDemoDbOrders } from "@/lib/studio-demo-storage";

const EMPTY_MSG = "אין כרגע נתונים";

function KpiCard({
  label, value, sub, icon: Icon, iconColor, trend, href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: number | null;
  href?: string;
}) {
  const card = (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "border-color 0.15s, transform 0.15s",
        cursor: href ? "pointer" : "default",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (href) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            background: `${iconColor}18`,
            border: `1px solid ${iconColor}30`,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
          }}
        >
          <Icon size={18} />
        </div>
        {trend !== undefined && trend !== null && !Number.isNaN(trend) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "11px",
              fontWeight: 600,
              color: trend >= 0 ? "var(--success)" : "var(--destructive)",
            }}
          >
            <ArrowUpRight size={12} style={{ transform: trend < 0 ? "rotate(90deg)" : "none" }} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "4px" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "3px" }}>{sub}</div>}
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{card}</Link>;
  return card;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "var(--muted-foreground)", marginBottom: "4px" }}>{label}</p>
      <p style={{ color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(payload[0].value)}</p>
      {payload[1] && <p style={{ color: "var(--info)" }}>{payload[1].value} הזמנות</p>}
    </div>
  );
};

function truncCell(s: string | null | undefined, max = 40) {
  const t = (s ?? "").trim() || "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function MarketingAttributionSection({ m }: { m: MarketingAttributionBlock }) {
  const hasData = m.totalEvents > 0;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--info)",
            flexShrink: 0,
          }}
        >
          <Megaphone size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>
            שיווק ומטא — נתוני גלישה גולמיים
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px", lineHeight: 1.5 }}>
            {m.periodLabel}: כניסות לאתר, מפנה (referrer), פרמטרי UTM (כולל מודעות מטא), קליקים עם{" "}
            <code style={{ fontSize: "11px", color: "var(--primary)" }}>fbclid</code>, וצפיות במוצר בסטודיו.
            מתאים לייצוא רעיונות לקמפיינים ול-CAPI של מטא.
          </p>
        </div>
      </div>

      {!hasData ? (
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", textAlign: "center", padding: "24px 0" }}>
          אין עדיין אירועים מהאתר. ודא שהרצת את מיגרציית <code style={{ fontSize: "11px" }}>marketing_site_events</code> ב-Supabase
          ושהדפים הציבוריים טוענים את <code style={{ fontSize: "11px" }}>marketing-beacon.js</code>.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {[
              { label: "אירועים בסך הכל", v: m.totalEvents },
              { label: "סשנים (מבקרים)", v: m.distinctSessions },
              { label: "צפיות דף", v: m.pageViews },
              { label: "צפיות במוצר", v: m.productViews },
              { label: "עם fbclid (מטא)", v: m.withFbclid },
              { label: "עם UTM", v: m.withUtm },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{k.v}</div>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px", color: "var(--muted-foreground)" }}>
                מפנים (referrer)
              </h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px" }}>
                {m.topReferrers.map((r) => (
                  <li
                    key={r.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>
                      {r.label}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px", color: "var(--muted-foreground)" }}>
                קמפיינים UTM
              </h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px" }}>
                {m.topUtmCampaigns.map((u, i) => (
                  <li
                    key={`${u.campaign}-${u.source}-${i}`}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{u.campaign}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {u.source} · {u.medium}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px" }}>{u.count} אירועים</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px", color: "var(--muted-foreground)" }}>
                מוצרים נצפים בסטודיו
              </h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px" }}>
                {m.topProductViews.map((p) => (
                  <li
                    key={p.productId || p.productName}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.productName}>
                      {p.productName}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{p.views}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px", color: "var(--muted-foreground)" }}>
              יומן גולמי (עד 100 אירועים אחרונים)
            </h4>
            <div style={{ overflowX: "auto", maxHeight: "320px", border: "1px solid var(--border)", borderRadius: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "720px" }}>
                <thead>
                  <tr style={{ background: "var(--surface)", position: "sticky", top: 0 }}>
                    {["זמן", "סוג", "דף", "מפנה", "utm_campaign", "fbclid", "מוצר", "session"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: "var(--muted-foreground)",
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.recentEvents.map((ev) => (
                    <tr key={ev.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatDateTime(ev.created_at)}</td>
                      <td style={{ padding: "8px 10px" }}>{ev.event_type}</td>
                      <td style={{ padding: "8px 10px", maxWidth: "140px" }} title={ev.page_path ?? ""}>
                        {truncCell(ev.page_path, 48)}
                      </td>
                      <td style={{ padding: "8px 10px", maxWidth: "120px" }} title={ev.referrer ?? ""}>
                        {truncCell(ev.referrer, 36)}
                      </td>
                      <td style={{ padding: "8px 10px" }} title={ev.utm_campaign ?? ""}>
                        {truncCell(ev.utm_campaign, 28)}
                      </td>
                      <td style={{ padding: "8px 10px" }} title={ev.fbclid ?? ""}>
                        {truncCell(ev.fbclid, 20)}
                      </td>
                      <td style={{ padding: "8px 10px", maxWidth: "120px" }} title={ev.product_name ?? ""}>
                        {truncCell(ev.product_name, 32)}
                      </td>
                      <td style={{ padding: "8px 10px" }} title={ev.session_id}>
                        {truncCell(ev.session_id, 14)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardView(snapshot: DashboardSnapshot) {
  const { stats, recentOrders, stockAlerts, revenueTrendPercent, chartMonthLabel, marketing } = snapshot;
  const [mergedRecentOrders, setMergedRecentOrders] = useState<DbOrder[]>(recentOrders);

  useEffect(() => {
    const demo = readStudioDemoDbOrders();
    const seen = new Set(recentOrders.map((o) => o.id));
    const extra = demo.filter((d) => !seen.has(d.id));
    const merged = [...extra, ...recentOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    setMergedRecentOrders(merged);
  }, [recentOrders]);
  const hasRevenueChartData = stats.revenueChart.some((d) => d.revenue > 0 || d.orders > 0);
  const hasTopProducts = stats.topProducts.length > 0;
  const outOfStock = stockAlerts.filter((s) => s.kind === "out");
  const lowStock = stockAlerts.filter((s) => s.kind === "low");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>לוח בקרה</h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
            סקירה כללית של החנות
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/admin/products/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "none",
              borderRadius: "9px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Plus size={15} />
            מוצר חדש
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <KpiCard
          label="הכנסה חודשית"
          value={formatCurrency(stats.monthRevenue)}
          sub={`היום: ${formatCurrency(stats.todayRevenue)}`}
          icon={TrendingUp}
          iconColor="var(--primary)"
          trend={revenueTrendPercent}
        />
        <KpiCard
          label="סה״כ הזמנות"
          value={String(stats.totalOrders)}
          sub={stats.totalOrders > 0 ? `${stats.newOrders} חדשות` : undefined}
          icon={ShoppingBag}
          iconColor="var(--info)"
          href="/admin/orders"
        />
        <KpiCard
          label="מוצרים פעילים"
          value={String(stats.totalProducts)}
          sub={`${stats.hiddenProducts} מוסתרים`}
          icon={Package}
          iconColor="var(--success)"
          href="/admin/products"
        />
        <KpiCard
          label="לקוחות"
          value={String(stats.totalCustomers)}
          icon={Users}
          iconColor="var(--warning)"
          href="/admin/customers"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Clock size={20} color="var(--warning)" />
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{stats.pendingOrders}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>ממתינות לטיפול</div>
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <CheckCircle size={20} color="var(--success)" />
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{stats.completedOrders}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>הושלמו</div>
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <AlertTriangle size={20} color="var(--destructive)" />
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{stats.lowStockProducts}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>בעיות מלאי</div>
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <XCircle size={20} color="var(--muted-foreground)" />
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{stats.cancelledOrders}</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>בוטלו</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>
              הכנסות — {chartMonthLabel}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              סה״כ: {formatCurrency(stats.monthRevenue)}
            </span>
          </div>
          {hasRevenueChartData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.revenueChart}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₪${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "48px 0", textAlign: "center" }}>
              {EMPTY_MSG}
            </p>
          )}
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: "20px" }}>
            מוצרים מובילים
          </h3>
          {hasTopProducts ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${v as number} מכירות`, "" as string] as [string, string]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[0, 4, 4, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "48px 0", textAlign: "center" }}>
              {EMPTY_MSG}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>הזמנות אחרונות</h3>
            <Link href="/admin/orders" style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              הכל <ArrowUpRight size={12} />
            </Link>
          </div>
          {mergedRecentOrders.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "32px 24px", textAlign: "center" }}>
              {EMPTY_MSG}
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {["הזמנה", "לקוח", "סכום", "סטטוס", "תאריך"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 20px",
                        textAlign: "right",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergedRecentOrders.map((order, i) => (
                  <OrderRow key={order.id} order={order} index={i} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>התראות מלאי</h3>
            <Link href="/admin/inventory" style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              מלאי <ArrowUpRight size={12} />
            </Link>
          </div>

          <div style={{ padding: "8px" }}>
            {stockAlerts.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "24px 12px", textAlign: "center" }}>
                {EMPTY_MSG}
              </p>
            ) : (
              <>
                {outOfStock.length > 0 && (
                  <>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--destructive)", padding: "8px 10px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      אזל המלאי
                    </p>
                    {outOfStock.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "rgba(239,68,68,0.05)",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "var(--input)",
                          }}
                        >
                          {p.primaryImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.primaryImage} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </p>
                          <p style={{ fontSize: "11px", color: "var(--destructive)" }}>0 יחידות</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {lowStock.length > 0 && (
                  <>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--warning)", padding: "8px 10px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      מלאי נמוך
                    </p>
                    {lowStock.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "rgba(245,158,11,0.05)",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "var(--input)",
                          }}
                        >
                          {p.primaryImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.primaryImage} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </p>
                          <p style={{ fontSize: "11px", color: "var(--warning)" }}>{p.quantity} יחידות נותרו</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <MarketingAttributionSection m={marketing} />
    </div>
  );
}

function OrderRow({ order, index }: { order: DbOrder; index: number }) {
  return (
    <tr
      style={{
        borderTop: index > 0 ? "1px solid var(--border-subtle)" : "none",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--card-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <td style={{ padding: "12px 20px" }}>
        <Link
          href={`/admin/orders/${order.id}`}
          style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
        >
          {order.order_number}
        </Link>
      </td>
      <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--foreground)" }}>{order.customer_name}</td>
      <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600 }}>{formatCurrency(order.total)}</td>
      <td style={{ padding: "12px 20px" }}><OrderStatusBadge status={order.status} /></td>
      <td style={{ padding: "12px 20px", fontSize: "11px", color: "var(--muted-foreground)" }}>
        {formatDateTime(order.created_at)}
      </td>
    </tr>
  );
}
