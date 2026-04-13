"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, Package, AlertTriangle, TrendingDown, XCircle,
  Check, X, Plus, RefreshCw, ChevronDown,
} from "lucide-react";
import { mockProducts, mockCategories } from "@/lib/mock-data";
import type { ProductWithDetails, DbProductImage, DbInventory } from "@/types";
import { isSupabaseConfigured } from "@/lib/auth";
import { slugify, formatDate } from "@/lib/utils";
import { ProductStatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getProducts, updateProduct } from "@/lib/services/productService";

// ─── Convert mock camelCase products → ProductWithDetails ─────────────────────
function mockToProductWithDetails(): ProductWithDetails[] {
  return mockProducts.map((m) => {
    const cat = mockCategories.find((c) => c.id === m.categoryId);
    const images: DbProductImage[] = m.images.map((url, i) => ({
      id: `img-${m.id}-${i}`,
      product_id: m.id,
      url,
      alt_text: m.name,
      sort_order: i,
      is_primary: i === 0,
      created_at: m.createdAt,
    }));
    const inventory: DbInventory = {
      id: `inv-${m.id}`,
      product_id: m.id,
      quantity: m.inventory,
      low_stock_threshold: m.lowStockThreshold,
      updated_at: m.updatedAt,
    };
    return {
      id: m.id,
      name: m.name,
      slug: slugify(m.name),
      short_description: m.shortDescription,
      description: m.description,
      sku: m.sku,
      price: m.price,
      compare_price: m.comparePrice ?? null,
      category_id: m.categoryId,
      subcategory_id: m.subcategoryId ?? null,
      status: m.status,
      is_featured: m.featured,
      tags: m.tags,
      seo_title: m.seoTitle ?? null,
      seo_description: m.seoDescription ?? null,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
      primary_image: m.images[0] ?? null,
      images,
      inventory,
      category_name: cat?.name ?? null,
    };
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: number;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", flex: "1 1 160px" }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Inline stock editor ──────────────────────────────────────────────────────
function InlineStockEditor({ product, onSave }: {
  product: ProductWithDetails;
  onSave: (id: string, quantity: number) => void;
}) {
  const qty = product.inventory?.quantity ?? 0;
  const threshold = product.inventory?.low_stock_threshold ?? 5;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(qty));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);
  useEffect(() => { if (!editing) setVal(String(qty)); }, [qty, editing]);

  function commit() {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0 && n !== qty) onSave(product.id, n);
    setEditing(false);
  }

  function cancel() { setVal(String(qty)); setEditing(false); }

  const color = qty === 0 ? "var(--destructive)" : qty <= threshold ? "var(--warning)" : "var(--success)";

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          ref={inputRef}
          type="number" min={0} value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
          style={{ width: "70px", background: "var(--input)", border: "1px solid var(--primary)", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", color: "var(--foreground)", outline: "none", textAlign: "center" }}
        />
        <button onClick={commit} style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={13} color="var(--success)" /></button>
        <button onClick={cancel} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} color="var(--destructive)" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="לחץ לעריכה"
      style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: "6px", transition: "background 0.1s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--input)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ fontSize: "15px", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
      <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>יח׳</span>
    </button>
  );
}

// ─── Adjust stock modal ───────────────────────────────────────────────────────
function AdjustModal({
  product, onClose, onSave,
}: {
  product: ProductWithDetails;
  onClose: () => void;
  onSave: (id: string, delta: number, reason: string) => void;
}) {
  const [mode, setMode]     = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const currentQty = product.inventory?.quantity ?? 0;

  function preview() {
    const n = parseInt(amount, 10) || 0;
    if (mode === "add")    return currentQty + n;
    if (mode === "remove") return Math.max(0, currentQty - n);
    return n;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (isNaN(n) || n < 0) return;
    const delta = mode === "add" ? n : mode === "remove" ? -Math.min(n, currentQty) : n - currentQty;
    onSave(product.id, delta, reason || "manual_adjustment");
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", width: "100%", maxWidth: "440px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", animation: "slideUp 0.2s ease" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>עדכון מלאי</h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>{product.name} · מלאי נוכחי: {currentQty}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Mode */}
            <div style={{ display: "flex", gap: "6px" }}>
              {([["add", "הוסף"], ["remove", "הפחת"], ["set", "קבע"]] as [typeof mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${mode === m ? "var(--primary)" : "var(--border)"}`, background: mode === m ? "rgba(201,169,110,0.1)" : "var(--input)", color: mode === m ? "var(--primary)" : "var(--muted-foreground)", fontSize: "13px", fontWeight: mode === m ? 700 : 400, cursor: "pointer", transition: "all 0.1s" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
                {mode === "set" ? "כמות חדשה" : "כמות"}
              </label>
              <input type="number" min={0} style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>

            {/* Preview */}
            {amount && !isNaN(parseInt(amount)) && (
              <div style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>מלאי לאחר עדכון: </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>{preview()} יח׳</span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>סיבה (אופציונלי)</label>
              <input type="text" style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="למשל: הזמנה חדשה ממוריה" />
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 500, color: "var(--foreground-secondary)", cursor: "pointer" }}>ביטול</button>
            <button type="submit" style={{ background: "var(--primary)", border: "none", borderRadius: "8px", padding: "9px 20px", fontSize: "13px", fontWeight: 700, color: "#09090b", cursor: "pointer" }}>עדכן מלאי</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type SortKey    = "name" | "quantity" | "updated_at";

export default function InventoryPage() {
  const toast = useToast();
  const sb    = createClient();

  const [products, setProducts]     = useState<ProductWithDetails[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey]       = useState<SortKey>("name");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [adjustTarget, setAdjustTarget] = useState<ProductWithDetails | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setProducts(mockToProductWithDetails());
      } else {
        const { products: p } = await getProducts(sb, { perPage: 999 });
        setProducts(p);
      }
    } catch (err) {
      console.error(err);
      toast("שגיאה בטעינת המלאי", "error");
    } finally {
      setLoading(false);
    }
  }, [sb, toast]);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──
  const totalIn  = products.filter((p) => (p.inventory?.quantity ?? 0) > (p.inventory?.low_stock_threshold ?? 5)).length;
  const totalLow = products.filter((p) => { const q = p.inventory?.quantity ?? 0; const t = p.inventory?.low_stock_threshold ?? 5; return q > 0 && q <= t; }).length;
  const totalOut = products.filter((p) => (p.inventory?.quantity ?? 0) === 0).length;

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...products];
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    if (stockFilter === "in_stock")    list = list.filter((p) => (p.inventory?.quantity ?? 0) > (p.inventory?.low_stock_threshold ?? 5));
    if (stockFilter === "low_stock")   list = list.filter((p) => { const q2 = p.inventory?.quantity ?? 0; const t = p.inventory?.low_stock_threshold ?? 5; return q2 > 0 && q2 <= t; });
    if (stockFilter === "out_of_stock") list = list.filter((p) => (p.inventory?.quantity ?? 0) === 0);
    list.sort((a, b) => {
      const va: string | number =
        sortKey === "quantity"   ? (a.inventory?.quantity ?? 0) :
        sortKey === "updated_at" ? (a.inventory?.updated_at ?? a.updated_at) :
        a.name;
      const vb: string | number =
        sortKey === "quantity"   ? (b.inventory?.quantity ?? 0) :
        sortKey === "updated_at" ? (b.inventory?.updated_at ?? b.updated_at) :
        b.name;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [products, search, stockFilter, sortKey, sortDir]);

  // ── Inline save ──
  async function handleInlineSave(id: string, quantity: number) {
    setProducts((prev) => prev.map((p) =>
      p.id === id && p.inventory
        ? { ...p, inventory: { ...p.inventory, quantity, updated_at: new Date().toISOString() } }
        : p
    ));
    if (isSupabaseConfigured()) {
      try {
        await updateProduct(sb, id, { inventory_quantity: quantity });
      } catch (err) {
        console.error(err);
        toast("שגיאה בשמירת המלאי", "error");
      }
    }
    toast("המלאי עודכן", "success");
  }

  // ── Adjust save ──
  async function handleAdjustSave(id: string, delta: number, _reason: string) {
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id || !p.inventory) return p;
      const newQty = Math.max(0, p.inventory.quantity + delta);
      return { ...p, inventory: { ...p.inventory, quantity: newQty, updated_at: new Date().toISOString() } };
    }));
    if (isSupabaseConfigured()) {
      const p = products.find((x) => x.id === id);
      const currentQty = p?.inventory?.quantity ?? 0;
      try {
        await updateProduct(sb, id, { inventory_quantity: currentQty + delta });
      } catch (err) {
        console.error(err);
        toast("שגיאה בעדכון מלאי", "error");
      }
    }
    toast("המלאי עודכן בהצלחה", "success");
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "right", fontSize: "11px", fontWeight: 600,
    color: "var(--muted-foreground)", whiteSpace: "nowrap",
    background: "var(--surface)", borderBottom: "1px solid var(--border)", cursor: "pointer",
  };
  const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: "13px", verticalAlign: "middle" };

  function SortTh({ label, sk }: { label: string; sk: SortKey }) {
    const active = sortKey === sk;
    return (
      <th
        style={{ ...thStyle, color: active ? "var(--primary)" : "var(--muted-foreground)" }}
        onClick={() => { if (sk === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(sk); setSortDir("asc"); } }}
      >
        {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>מלאי</h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "3px" }}>{products.length} מוצרים</p>
          </div>
          <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", cursor: "pointer" }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            רענן
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard label="במלאי"       value={totalIn}  icon={Package}        color="var(--success)"     bg="rgba(34,197,94,0.1)" />
          <StatCard label="מלאי נמוך"   value={totalLow} icon={AlertTriangle}   color="var(--warning)"     bg="rgba(245,158,11,0.1)" />
          <StatCard label="אזל מהמלאי"  value={totalOut} icon={XCircle}         color="var(--destructive)" bg="rgba(239,68,68,0.1)" />
          <StatCard label="סה״כ מוצרים" value={products.length} icon={TrendingDown} color="var(--primary)"  bg="rgba(201,169,110,0.1)" />
        </div>

        {/* Filters */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input type="text" placeholder="חיפוש לפי שם או SKU..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 36px 8px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {([["all", "הכל"], ["in_stock", "במלאי"], ["low_stock", "נמוך"], ["out_of_stock", "אזל"]] as [StockFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStockFilter(val)}
                style={{ padding: "7px 12px", borderRadius: "7px", border: `1px solid ${stockFilter === val ? "var(--primary)" : "var(--border)"}`, background: stockFilter === val ? "rgba(201,169,110,0.1)" : "var(--input)", color: stockFilter === val ? "var(--primary)" : "var(--muted-foreground)", fontSize: "12px", fontWeight: stockFilter === val ? 700 : 400, cursor: "pointer", transition: "all 0.1s" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "28px", height: "28px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>מוצר</th>
                    <SortTh label="מלאי" sk="quantity" />
                    <th style={thStyle}>סף מינימום</th>
                    <th style={thStyle}>סטטוס</th>
                    <th style={thStyle}>קטגוריה</th>
                    <SortTh label="עדכון אחרון" sk="updated_at" />
                    <th style={{ ...thStyle, textAlign: "center" }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "60px 24px", textAlign: "center" }}>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>לא נמצאו מוצרים</p>
                        <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>נסה לשנות את הסינון</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((product, i) => {
                      const qty = product.inventory?.quantity ?? 0;
                      const threshold = product.inventory?.low_stock_threshold ?? 5;
                      const stockStatus = qty === 0 ? "out" : qty <= threshold ? "low" : "ok";
                      return (
                        <tr
                          key={product.id}
                          style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}
                        >
                          {/* Product */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "38px", height: "38px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "var(--input)" }}>
                                {product.primary_image
                                  ? <img src={product.primary_image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={14} color="var(--muted-foreground)" /></div>}
                              </div>
                              <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{product.name}</p>
                                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", direction: "ltr", textAlign: "right" }}>{product.sku}</p>
                              </div>
                            </div>
                          </td>

                          {/* Stock */}
                          <td style={tdStyle}>
                            <InlineStockEditor product={product} onSave={handleInlineSave} />
                          </td>

                          {/* Threshold */}
                          <td style={{ ...tdStyle, color: "var(--muted-foreground)", fontSize: "12px" }}>{threshold}</td>

                          {/* Status indicator */}
                          <td style={tdStyle}>
                            {stockStatus === "out" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--destructive)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "5px", padding: "3px 8px" }}>
                                <XCircle size={11} /> אזל
                              </span>
                            )}
                            {stockStatus === "low" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--warning)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "5px", padding: "3px 8px" }}>
                                <AlertTriangle size={11} /> נמוך
                              </span>
                            )}
                            {stockStatus === "ok" && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--success)", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "5px", padding: "3px 8px" }}>
                                במלאי
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td style={{ ...tdStyle, fontSize: "12px", color: "var(--foreground-secondary)" }}>
                            {product.category_name ?? "—"}
                          </td>

                          {/* Last updated */}
                          <td style={{ ...tdStyle, fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                            {product.inventory?.updated_at ? formatDate(product.inventory.updated_at) : "—"}
                          </td>

                          {/* Actions */}
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <button
                              onClick={() => setAdjustTarget(product)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", padding: "6px 12px", fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              <Plus size={12} /> עדכן מלאי
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Adjust modal */}
      {adjustTarget && (
        <AdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={handleAdjustSave}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
