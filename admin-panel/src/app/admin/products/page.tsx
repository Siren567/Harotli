"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Package, MoreVertical, Edit, Copy,
  Eye, EyeOff, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, ArrowUpDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getProducts, setProductStatus, setProductsStatus,
  deleteProduct, deleteProducts, duplicateProduct,
} from "@/lib/services/productService";
import type { ProductWithDetails, ProductStatus } from "@/types";
import { mockCategories } from "@/lib/mock-data";
import { ProductStatusBadge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";

const PER_PAGE = 10;

const STATUS_OPTS = [
  { value: "all",          label: "כל הסטטוסים" },
  { value: "active",       label: "פעיל" },
  { value: "hidden",       label: "מוסתר" },
  { value: "draft",        label: "טיוטה" },
  { value: "out_of_stock", label: "אזל המלאי" },
];

const SORT_OPTS = [
  { value: "updated_at-desc", label: "עדכון אחרון ↓" },
  { value: "updated_at-asc",  label: "עדכון אחרון ↑" },
  { value: "name-asc",        label: "שם א-ת" },
  { value: "name-desc",       label: "שם ת-א" },
  { value: "price-asc",       label: "מחיר נמוך ↑" },
  { value: "price-desc",      label: "מחיר גבוה ↓" },
  { value: "inventory-asc",   label: "מלאי נמוך ↑" },
  { value: "inventory-desc",  label: "מלאי גבוה ↓" },
];

const inputStyle: React.CSSProperties = {
  background: "var(--input)", border: "1px solid var(--border)",
  borderRadius: "8px", padding: "8px 12px",
  fontSize: "13px", color: "var(--foreground)", outline: "none",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "6px",
  background: "var(--primary)", color: "#09090b",
  borderRadius: "9px", padding: "9px 16px",
  fontSize: "13px", fontWeight: 700, textDecoration: "none",
  border: "none", cursor: "pointer",
};

const menuItemBase: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "8px",
  padding: "9px 14px", fontSize: "13px",
  color: "var(--foreground-secondary)",
};

export default function ProductsPage() {
  const sb    = createClient();
  const toast = useToast();

  const [products, setProducts]     = useState<ProductWithDetails[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [status, setStatus]         = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort]             = useState("updated_at-desc");
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null);
  const [deleteBulkOpen, setDeleteBulkOpen] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);

  const totalPages = Math.ceil(total / PER_PAGE);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const [sortBy, sortDir] = sort.split("-") as [
        "name" | "price" | "inventory" | "updated_at", "asc" | "desc"
      ];
      const result = await getProducts(sb, {
        search, status: status as ProductStatus | "all",
        categoryId: categoryId || undefined,
        sortBy, sortDir, page, perPage: PER_PAGE,
      });
      setProducts(result.products);
      setTotal(result.total);
    } catch (e) {
      toast("שגיאה בטעינת מוצרים", "error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, categoryId, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, categoryId, sort]);

  const allSelected = products.length > 0 && selected.size === products.length;
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(products.map(p => p.id))); }
  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  async function handleToggleStatus(p: ProductWithDetails) {
    const next: ProductStatus = p.status === "hidden" ? "active" : "hidden";
    try {
      await setProductStatus(sb, p.id, next);
      toast(next === "active" ? "המוצר פורסם" : "המוצר הוסתר", "success");
      load();
    } catch { toast("שגיאה בעדכון סטטוס", "error"); }
  }

  async function handleDuplicate(id: string) {
    setOpenMenu(null);
    try {
      await duplicateProduct(sb, id);
      toast("המוצר שוכפל כטיוטה", "success");
      load();
    } catch { toast("שגיאה בשכפול", "error"); }
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      await deleteProduct(sb, id);
      toast("המוצר נמחק", "success");
      setDeleteTarget(null);
      load();
    } catch { toast("שגיאה במחיקה", "error"); }
    finally { setActionLoading(false); }
  }

  async function handleBulkStatus(s: ProductStatus) {
    if (!selected.size) return;
    try {
      await setProductsStatus(sb, [...selected], s);
      toast(`${selected.size} מוצרים עודכנו`, "success");
      load();
    } catch { toast("שגיאה בעדכון קבוצתי", "error"); }
  }

  async function handleBulkDelete() {
    setActionLoading(true);
    try {
      await deleteProducts(sb, [...selected]);
      toast(`${selected.size} מוצרים נמחקו`, "success");
      setDeleteBulkOpen(false);
      load();
    } catch { toast("שגיאה במחיקה קבוצתית", "error"); }
    finally { setActionLoading(false); }
  }

  function invColor(p: ProductWithDetails) {
    const qty = p.inventory?.quantity ?? 0;
    const thr = p.inventory?.low_stock_threshold ?? 5;
    if (qty === 0) return "var(--destructive)";
    if (qty <= thr) return "var(--warning)";
    return "var(--success)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700 }}>מוצרים</h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "3px" }}>
            {loading ? "טוען..." : `${total} מוצרים`}
          </p>
        </div>
        <Link href="/admin/products/new" style={primaryBtn}>
          <Plus size={15} /> מוצר חדש
        </Link>
      </div>

      {/* Filters */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", right: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם / SKU..."
            style={{ ...inputStyle, paddingRight: "34px", width: "100%" }}
          />
        </div>

        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">כל הקטגוריות</option>
          {mockCategories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ArrowUpDown size={13} color="var(--muted-foreground)" />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>{selected.size} נבחרו</span>
          <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />
          <button onClick={() => handleBulkStatus("active")} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", color: "var(--success)", cursor: "pointer" }}><Eye size={13} /> פרסם</button>
          <button onClick={() => handleBulkStatus("hidden")} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px solid rgba(113,113,122,0.3)", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", color: "var(--muted-foreground)", cursor: "pointer" }}><EyeOff size={13} /> הסתר</button>
          <button onClick={() => setDeleteBulkOpen(true)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", color: "var(--destructive)", cursor: "pointer" }}><Trash2 size={13} /> מחק</button>
          <button onClick={() => setSelected(new Set())} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px solid var(--border)", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", color: "var(--muted-foreground)", cursor: "pointer", marginRight: "auto" }}>ביטול</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "10px 8px 10px 16px", width: "40px" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
              </th>
              {["", "מוצר", "קטגוריה", "מחיר", "מלאי", "סטטוס", "עדכון", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div className="skeleton" style={{ height: "14px", borderRadius: "4px", width: j === 2 ? "150px" : "60px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "60px 20px" }}>
                <Package size={40} style={{ margin: "0 auto 12px", color: "var(--muted-foreground)", display: "block" }} />
                <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "14px" }}>לא נמצאו מוצרים</p>
                <Link href="/admin/products/new" style={primaryBtn}><Plus size={14} /> הוסף מוצר ראשון</Link>
              </td></tr>
            ) : products.map((p, i) => {
              const qty = p.inventory?.quantity ?? 0;
              const thr = p.inventory?.low_stock_threshold ?? 5;
              return (
                <tr key={p.id}
                  style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined, background: selected.has(p.id) ? "rgba(201,169,110,0.04)" : undefined, transition: "background 0.1s" }}
                  onMouseEnter={e => { if (!selected.has(p.id)) (e.currentTarget as HTMLElement).style.background = "var(--card-hover)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected.has(p.id) ? "rgba(201,169,110,0.04)" : ""; }}
                >
                  <td style={{ padding: "0 4px 0 16px" }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ accentColor: "var(--primary)", cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "8px", overflow: "hidden", background: "var(--input)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {p.primary_image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.primary_image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Package size={16} color="var(--muted-foreground)" />}
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Link href={`/admin/products/${p.id}`} style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--foreground)"}
                    >{p.name}</Link>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{p.sku}</div>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--muted-foreground)" }}>{p.category_name ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{formatCurrency(p.price)}</span>
                    {p.compare_price && <div style={{ fontSize: "11px", color: "var(--muted-foreground)", textDecoration: "line-through" }}>{formatCurrency(p.compare_price)}</div>}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      {qty <= thr && <AlertTriangle size={12} color={qty === 0 ? "var(--destructive)" : "var(--warning)"} />}
                      <span style={{ fontSize: "13px", fontWeight: 600, color: invColor(p) }}>{qty}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}><ProductStatusBadge status={p.status} /></td>
                  <td style={{ padding: "10px 16px", fontSize: "11px", color: "var(--muted-foreground)" }}>{formatDate(p.updated_at)}</td>

                  <td style={{ padding: "10px 8px", position: "relative" }}>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}
                      style={{ background: openMenu === p.id ? "var(--input)" : "transparent", border: "1px solid", borderColor: openMenu === p.id ? "var(--border)" : "transparent", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}
                    ><MoreVertical size={14} /></button>

                    {openMenu === p.id && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpenMenu(null)} />
                        <div style={{ position: "absolute", left: "calc(100% + 4px)", top: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", zIndex: 50, minWidth: "160px", overflow: "hidden", animation: "menuIn 0.12s ease" }}>
                          <Link href={`/admin/products/${p.id}`} onClick={() => setOpenMenu(null)} style={menuItemBase}><Edit size={13} /> עריכה</Link>
                          <button onClick={() => handleDuplicate(p.id)} style={{ ...menuItemBase, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "right" }}><Copy size={13} /> שכפל</button>
                          <button onClick={() => { setOpenMenu(null); handleToggleStatus(p); }} style={{ ...menuItemBase, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "right" }}>
                            {p.status === "hidden" ? <><Eye size={13} /> פרסם</> : <><EyeOff size={13} /> הסתר</>}
                          </button>
                          <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                          <button onClick={() => { setOpenMenu(null); setDeleteTarget(p.id); }} style={{ ...menuItemBase, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "right", color: "var(--destructive)" }}><Trash2 size={13} /> מחק</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>עמוד {page} מתוך {totalPages}</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)", opacity: page === 1 ? 0.5 : 1 }}><ChevronRight size={14} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return <button key={n} onClick={() => setPage(n)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: n === page ? "var(--primary)" : "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", color: n === page ? "#09090b" : "var(--foreground)", fontWeight: n === page ? 700 : 400, fontSize: "12px" }}>{n}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)", opacity: page === totalPages ? 0.5 : 1 }}><ChevronLeft size={14} /></button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} title="מחיקת מוצר" message="פעולה זו אינה ניתנת לביטול. המוצר, תמונותיו ורשומות המלאי שלו יימחקו לצמיתות." confirmLabel="מחק מוצר" danger loading={actionLoading} />
      <ConfirmModal open={deleteBulkOpen} onClose={() => setDeleteBulkOpen(false)} onConfirm={handleBulkDelete} title={`מחיקת ${selected.size} מוצרים`} message={`${selected.size} מוצרים יימחקו לצמיתות. פעולה זו אינה ניתנת לביטול.`} confirmLabel="מחק הכל" danger loading={actionLoading} />

      <style>{`
        @keyframes menuIn { from { opacity:0;transform:scale(0.95); } to { opacity:1;transform:scale(1); } }
      `}</style>
    </div>
  );
}
