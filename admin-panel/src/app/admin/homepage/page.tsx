"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFeaturedProductIds, saveFeaturedProductIds } from "@/lib/services/homepageService";
import { getProducts } from "@/lib/services/productService";
import { useToast } from "@/components/ui/toast";
import type { ProductWithDetails } from "@/types";
import { Save, LayoutTemplate } from "lucide-react";

export default function HomepageFeaturedPage() {
  const sb = createClient();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionId, setSectionId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ProductWithDetails[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ id, productIds }, { products }] = await Promise.all([
          getFeaturedProductIds(sb),
          getProducts(sb, { status: "active", perPage: 200, page: 1, sortBy: "name", sortDir: "asc" }),
        ]);
        if (cancelled) return;
        setSectionId(id);
        setSelected(productIds);
        setCatalog(products);
      } catch (e) {
        console.error(e);
        toast("שגיאה בטעינת נתונים", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 12) {
        toast("ניתן לבחור עד 12 מוצרים", "error");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function save() {
    if (!sectionId || sectionId === "mock") {
      toast("שמירה אפשרית רק עם חיבור ל-Supabase", "error");
      return;
    }
    setSaving(true);
    try {
      await saveFeaturedProductIds(sb, sectionId, selected);
      toast("נשמר — העמוד הראשי יציג את המוצרים שנבחרו", "success");
    } catch (e) {
      console.error(e);
      toast("שגיאה בשמירה", "error");
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "16px",
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
        טוען…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LayoutTemplate size={22} />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>מוצרים בעמוד הבית</h1>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: saving ? "rgba(201,169,110,0.5)" : "var(--primary)",
            border: "none",
            borderRadius: 9,
            padding: "10px 20px",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            color: "#09090b",
          }}
        >
          <Save size={16} />
          {saving ? "שומר…" : "שמור"}
        </button>
      </div>

      <div style={card}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 0 }}>
          סמנו עד 12 מוצרים פעילים שיוצגו תחת &quot;נבחרים במיוחד&quot; באתר הציבורי.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "62vh", overflowY: "auto" }}>
          {catalog.map((p) => (
            <label
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${selected.includes(p.id) ? "rgba(201,169,110,0.45)" : "var(--border)"}`,
                background: selected.includes(p.id) ? "rgba(201,169,110,0.07)" : "var(--input)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                style={{ accentColor: "var(--primary)" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.primary_image ? (
                <img src={p.primary_image} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 6, background: "var(--border)" }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {"\u20AA"}
                  {Number(p.price).toFixed(2)} · {p.sku}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
