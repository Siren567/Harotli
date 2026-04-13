"use client";

import Link from "next/link";
import {
  TrendingUp, ShoppingBag, Package, Users, AlertTriangle,
  ArrowUpRight, Plus, Tag, Boxes, Eye, Clock, CheckCircle, XCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { mockDashboardStats, mockOrders, mockProducts } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";

function KpiCard({
  label, value, sub, icon: Icon, iconColor, trend, href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: number;
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
        {trend !== undefined && (
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

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const lowStock = mockProducts.filter((p) => p.inventory > 0 && p.inventory <= p.lowStockThreshold);
  const outOfStock = mockProducts.filter((p) => p.inventory === 0);
  const recentOrders = mockOrders.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
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

      {/* KPI Row 1 - Revenue */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <KpiCard
          label="הכנסה חודשית"
          value={formatCurrency(stats.monthRevenue)}
          sub={`היום: ${formatCurrency(stats.todayRevenue)}`}
          icon={TrendingUp}
          iconColor="var(--primary)"
          trend={12}
        />
        <KpiCard
          label="סה״כ הזמנות"
          value={String(stats.totalOrders)}
          sub={`${stats.newOrders} חדשות`}
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

      {/* KPI Row 2 - Order statuses */}
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
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{lowStock.length + outOfStock.length}</div>
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

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Revenue chart */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>הכנסות - חודש מרץ</h3>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              סה״כ: {formatCurrency(stats.monthRevenue)}
            </span>
          </div>
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
        </div>

        {/* Top products */}
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
        </div>
      </div>

      {/* Bottom: recent orders + stock alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Recent orders */}
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
              {recentOrders.map((order, i) => (
                <tr
                  key={order.id}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
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
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--foreground)" }}>{order.customerName}</td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600 }}>{formatCurrency(order.total)}</td>
                  <td style={{ padding: "12px 20px" }}><OrderStatusBadge status={order.status} /></td>
                  <td style={{ padding: "12px 20px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock alerts */}
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
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--warning)" }}>{p.inventory} יחידות נותרו</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px 24px",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>פעולות מהירות</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { label: "הוסף מוצר", icon: Plus, href: "/admin/products/new", color: "var(--primary)" },
            { label: "צור קטגוריה", icon: Tag, href: "/admin/categories", color: "var(--info)" },
            { label: "ניהול מלאי", icon: Boxes, href: "/admin/inventory", color: "var(--warning)" },
            { label: "הזמנות", icon: ShoppingBag, href: "/admin/orders", color: "var(--success)" },
            { label: "הנחה חדשה", icon: Eye, href: "/admin/discounts", color: "var(--destructive)" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "9px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--foreground-secondary)",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = action.color;
                (e.currentTarget as HTMLElement).style.color = action.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--foreground-secondary)";
              }}
            >
              <action.icon size={15} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
