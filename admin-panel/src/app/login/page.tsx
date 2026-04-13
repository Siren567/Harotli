"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Gem, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאת התחברות");
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("שגיאת חיבור — נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    background: "var(--input)",
    border: `1px solid ${hasError ? "var(--destructive)" : "var(--border)"}`,
    borderRadius: "10px",
    padding: "11px 40px 11px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    direction: "ltr",
    textAlign: "right" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  });

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Subtle gradient background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            radial-gradient(ellipse at 20% 20%, rgba(201,169,110,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(201,169,110,0.04) 0%, transparent 50%)
          `,
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, var(--primary), #9a7035)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(201,169,110,0.25)",
            }}
          >
            <Gem size={26} color="#09090b" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", marginBottom: "4px" }}>
            חרוטלי
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>פאנל ניהול</p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "36px 32px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          }}
        >
          <h2 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px" }}>כניסה לניהול</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "28px" }}>
            הזן את פרטי הגישה שלך
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "7px" }}>
                אימייל
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", display: "flex" }}>
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@harotli.co.il"
                  required
                  autoFocus
                  style={inputStyle(!!error)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "7px" }}>
                סיסמה
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", display: "flex" }}>
                  <Lock size={15} />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle(!!error), paddingLeft: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    display: "flex",
                    padding: "2px",
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "var(--destructive)",
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "rgba(201,169,110,0.5)" : "var(--primary)",
                color: "#09090b",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: "15px",
                      height: "15px",
                      border: "2px solid rgba(0,0,0,0.25)",
                      borderTopColor: "#09090b",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  מתחבר...
                </>
              ) : (
                "כניסה"
              )}
            </button>
          </form>

          {/* Dev hint — shown only when Supabase not configured */}
          <div
            style={{
              marginTop: "20px",
              padding: "10px 12px",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "rgba(147,197,253,0.8)",
              lineHeight: 1.5,
            }}
          >
            <strong>מצב פיתוח:</strong> admin@harotli.co.il / harotli2024
          </div>
        </div>

        <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "11px", marginTop: "20px" }}>
          חרוטלי © {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(201,169,110,0.12);
        }
      `}</style>
    </div>
  );
}

// Wrap in Suspense — useSearchParams requires it in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
