"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus, Search, FolderOpen, Edit2, Trash2, ChevronDown,
  ChevronRight, Image as ImageIcon, Tag, AlertCircle,
} from "lucide-react";
import type { DbCategory } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  type CategoryFormData,
} from "@/lib/services/categoryService";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";

// ─── Form defaults ────────────────────────────────────────────────────────────
const EMPTY_FORM: CategoryFormData = {
  name: "", slug: "", description: "", image_url: "", parent_id: "", sort_order: 0,
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function CategoryModal({
  category, parents, onClose, onSave,
}: {
  category: DbCategory | null;
  parents: DbCategory[];
  onClose: () => void;
  onSave: (form: CategoryFormData, id?: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CategoryFormData>(
    category
      ? { name: category.name, slug: category.slug, description: category.description ?? "", image_url: category.image_url ?? "", parent_id: category.parent_id ?? "", sort_order: category.sort_order }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormData, string>>>({});

  function set<K extends keyof CategoryFormData>(k: K, v: CategoryFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof CategoryFormData, string>> = {};
    if (!form.name.trim()) errs.name = "שם חובה";
    if (!form.slug.trim()) errs.slug = "Slug חובה";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form, category?.id);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "9px 12px", fontSize: "13px",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "6px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", width: "100%", maxWidth: "500px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", animation: "slideUp 0.2s ease" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>
            {category ? "עריכת קטגוריה" : "קטגוריה חדשה"}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>שם קטגוריה *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.name ? "var(--destructive)" : "var(--border)" }}
                value={form.name}
                onChange={(e) => { set("name", e.target.value); if (!category) set("slug", slugify(e.target.value)); }}
                placeholder="למשל: שרשראות"
              />
              {errors.name && <p style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "4px" }}>{errors.name}</p>}
            </div>

            <div>
              <label style={labelStyle}>Slug (URL)</label>
              <input
                style={inputStyle}
                value={form.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="necklaces"
                dir="ltr"
              />
            </div>

            <div>
              <label style={labelStyle}>תיאור</label>
              <textarea
                style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="תיאור קצר של הקטגוריה..."
              />
            </div>

            <div>
              <label style={labelStyle}>כתובת תמונה</label>
              <input style={inputStyle} value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." dir="ltr" />
            </div>

            <div>
              <label style={labelStyle}>קטגורית אב</label>
              <select style={inputStyle} value={form.parent_id} onChange={(e) => set("parent_id", e.target.value)}>
                <option value="">— ראשית —</option>
                {parents.filter((p) => p.id !== category?.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>סדר תצוגה</label>
              <input type="number" style={inputStyle} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} min={0} />
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 500, color: "var(--foreground-secondary)", cursor: "pointer" }}>ביטול</button>
            <button type="submit" style={{ background: "var(--primary)", border: "none", borderRadius: "8px", padding: "9px 20px", fontSize: "13px", fontWeight: 700, color: "#09090b", cursor: "pointer" }}>
              {category ? "שמור שינויים" : "צור קטגוריה"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ─── Category row (recursive) ─────────────────────────────────────────────────
function CategoryRow({
  category, children, allCategories, onEdit, onDelete,
}: {
  category: DbCategory;
  children: DbCategory[];
  allCategories: DbCategory[];
  onEdit: (c: DbCategory) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--card-hover)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <button
          onClick={() => hasChildren && setExpanded((v) => !v)}
          style={{ background: "none", border: "none", padding: "2px", cursor: hasChildren ? "pointer" : "default", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}
        >
          {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: "14px" }} />}
        </button>

        <div style={{ width: "36px", height: "36px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "var(--input)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {category.image_url
            ? <img src={category.image_url} alt={category.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ImageIcon size={14} color="var(--muted-foreground)" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>{category.name}</p>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", direction: "ltr", textAlign: "right" }}>/{category.slug}</p>
        </div>

        {hasChildren && (
          <span style={{ fontSize: "11px", background: "rgba(201,169,110,0.1)", color: "var(--primary)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: "5px", padding: "2px 8px", fontWeight: 600 }}>
            {children.length} תתי-קטגוריות
          </span>
        )}

        <span style={{ fontSize: "11px", color: "var(--muted-foreground)", minWidth: "40px", textAlign: "center" }}>#{category.sort_order}</span>

        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => onEdit(category)} title="עריכה" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "var(--muted-foreground)" }}><Edit2 size={13} /></button>
          <button onClick={() => onDelete(category.id)} title="מחיקה" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "7px", width: "30px", height: "30px", cursor: "pointer", color: "var(--destructive)" }}><Trash2 size={13} /></button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div style={{ paddingRight: "32px", borderRight: "2px solid var(--border-subtle)", marginRight: "28px" }}>
          {children.map((child) => (
            <CategoryRow key={child.id} category={child} children={allCategories.filter((c) => c.parent_id === child.id)} allCategories={allCategories} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const sb   = createClient();
  const toast = useToast();

  const [categories, setCategories]     = useState<DbCategory[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [editTarget, setEditTarget]     = useState<DbCategory | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Load from Supabase on mount ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories(sb);
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast("שגיאה בטעינת הקטגוריות", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const roots    = filtered.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const totalSub = categories.filter((c) => !!c.parent_id).length;

  async function handleSave(form: CategoryFormData, id?: string) {
    setSaving(true);
    try {
      if (id) {
        await updateCategory(sb, id, form);
        toast(`הקטגוריה "${form.name}" עודכנה`, "success");
      } else {
        await createCategory(sb, form);
        toast(`הקטגוריה "${form.name}" נוצרה`, "success");
      }
      setEditTarget(null);
      await load(); // refresh from DB
    } catch (err) {
      console.error(err);
      toast("שגיאה בשמירת הקטגוריה", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (categories.some((c) => c.parent_id === id)) {
      toast("לא ניתן למחוק קטגוריה שיש לה תתי-קטגוריות", "error");
      return;
    }
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = categories.find((c) => c.id === deleteTarget)?.name ?? "";
    setSaving(true);
    try {
      await deleteCategory(sb, deleteTarget);
      toast(`הקטגוריה "${name}" נמחקה`, "success");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      toast("שגיאה במחיקת הקטגוריה", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>קטגוריות</h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "3px" }}>{categories.length} קטגוריות · {totalSub} תתי-קטגוריות</p>
          </div>
          <button onClick={() => setEditTarget("new")} style={{ display: "flex", alignItems: "center", gap: "7px", background: "var(--primary)", border: "none", borderRadius: "9px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, color: "#09090b", cursor: "pointer" }}>
            <Plus size={15} /> קטגוריה חדשה
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { count: categories.filter((c) => !c.parent_id).length, label: "קטגוריות ראשיות", icon: <FolderOpen size={18} color="var(--primary)" />, bg: "rgba(201,169,110,0.12)", border: "rgba(201,169,110,0.25)" },
            { count: totalSub, label: "תתי-קטגוריות", icon: <Tag size={18} color="#818cf8" />, bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)" },
            { count: categories.length, label: "סה״כ קטגוריות", icon: <FolderOpen size={18} color="var(--success)" />, bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
          ].map(({ count, label, icon, bg, border }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{count}</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "3px" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
            <input type="text" placeholder="חיפוש קטגוריות..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 36px 8px 12px", fontSize: "13px", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Tree */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          {roots.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "54px", height: "54px", background: "var(--input)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderOpen size={24} color="var(--muted-foreground)" />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>אין קטגוריות עדיין</p>
                <button onClick={() => setEditTarget("new")} style={{ background: "var(--primary)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, color: "#09090b", cursor: "pointer" }}>+ צור קטגוריה ראשונה</button>
              </div>
            </div>
          ) : (
            roots.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                children={filtered.filter((c) => c.parent_id === cat.id).sort((a, b) => a.sort_order - b.sort_order)}
                allCategories={filtered}
                onEdit={(c) => setEditTarget(c)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit/Create modal */}
      {editTarget !== null && (
        <CategoryModal
          category={editTarget === "new" ? null : editTarget}
          parents={categories.filter((c) => !c.parent_id)}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", maxWidth: "360px", width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={18} color="var(--destructive)" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>מחיקת קטגוריה</h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px", lineHeight: 1.6 }}>
              האם למחוק את הקטגוריה &quot;{categories.find((c) => c.id === deleteTarget)?.name}&quot;? פעולה זו אינה הפיכה.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 500, color: "var(--foreground-secondary)", cursor: "pointer" }}>ביטול</button>
              <button onClick={confirmDelete} style={{ background: "var(--destructive)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer" }}>מחק</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
