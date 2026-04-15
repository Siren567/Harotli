"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User, ExternalLink, ChevronDown } from "lucide-react";
import { mockNotifications } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";
import { clearStudioDemoOrders, readStudioDemoDbOrders } from "@/lib/studio-demo-storage";
import { isSupabaseConfigured } from "@/lib/auth";

export function Topbar() {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [demoNotifications, setDemoNotifications] = useState<
    Array<{ id: string; message: string; createdAt: string; read: boolean }>
  >([]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";

  useEffect(() => {
    const demo = readStudioDemoDbOrders()
      .slice(0, 5)
      .map((o) => ({
        id: `demo-order-${o.id}`,
        message: `הזמנה חדשה ${o.order_number} ${o.customer_name}`,
        createdAt: o.created_at,
        read: false,
      }));
    setDemoNotifications(demo);
  }, []);

  const baseNotifications = isSupabaseConfigured() ? [] : mockNotifications;
  const notifications = [...demoNotifications, ...baseNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
  const unread = notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleClearDemoNotifications() {
    clearStudioDemoOrders();
    setDemoNotifications([]);
    setNotifOpen(false);
  }

  return (
    <header
      style={{
        height: "var(--topbar-height)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        paddingInline: "24px",
        gap: "12px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ flex: 1 }}>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--input)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "7px 11px",
            color: "var(--foreground-secondary)",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <ExternalLink size={13} />
          חזרה לאתר
        </a>
      </div>

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
          style={{
            position: "relative",
            background: notifOpen ? "var(--input)" : "transparent",
            border: "1px solid",
            borderColor: notifOpen ? "var(--border)" : "transparent",
            borderRadius: "8px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--muted-foreground)",
          }}
        >
          <Bell size={17} />
          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: "4px",
                left: "4px",
                width: "16px",
                height: "16px",
                background: "var(--destructive)",
                borderRadius: "50%",
                fontSize: "9px",
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--surface)",
              }}
            >
              {unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setNotifOpen(false)} />
            <div
              style={{
                position: "absolute",
                top: "44px",
                left: "0",
                width: "340px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                zIndex: 200,
                overflow: "hidden",
                animation: "fadeInDown 0.15s ease",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>התראות</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {demoNotifications.length > 0 && (
                    <button
                      onClick={handleClearDemoNotifications}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        background: "var(--input)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      נקה דמו
                    </button>
                  )}
                  {unread > 0 && (
                    <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 500 }}>
                      {unread} לא נקרא
                    </span>
                  )}
                </div>
              </div>
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                      background: n.read ? "transparent" : "rgba(201,169,110,0.04)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: n.read ? "transparent" : "var(--primary)",
                        marginTop: "5px",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", color: "var(--foreground)", lineHeight: 1.5 }}>{n.message}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

      {/* Profile */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: profileOpen ? "var(--input)" : "transparent",
            border: "1px solid",
            borderColor: profileOpen ? "var(--border)" : "transparent",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
            color: "var(--foreground-secondary)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "linear-gradient(135deg, var(--primary), #a07840)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={14} color="#09090b" />
          </div>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>Admin</span>
          <ChevronDown size={13} style={{ opacity: 0.6 }} />
        </button>

        {profileOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setProfileOpen(false)} />
            <div
              style={{
                position: "absolute",
                top: "44px",
                left: "0",
                width: "200px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                zIndex: 200,
                overflow: "hidden",
                animation: "fadeInDown 0.15s ease",
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>Admin</p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>hello@harotli.co.il</p>
              </div>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "var(--foreground-secondary)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <ExternalLink size={14} />
                פתח חנות
              </a>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "var(--destructive)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "right",
                }}
              >
                <LogOut size={14} />
                יציאה
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
