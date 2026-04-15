"use client";

import { useState, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Save, X, Plus, AlertCircle,
  Eye, EyeOff, FileText, Upload, Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createProduct, updateProduct } from "@/lib/services/productService";
import { getCategories } from "@/lib/services/categoryService";
import type { ProductWithDetails, ProductFormData, ProductStatus, DbCategory, StudioProductColorKey } from "@/types";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";
import { uploadProductImage } from "@/lib/uploadProductImage";

interface Props {
  /** Pass an existing product to enable edit mode */
  product?: ProductWithDetails;
}

const STATUSES: { value: ProductStatus; label: string; desc: string }[] = [
  { value: "active",       label: "פעיל",        desc: "גלוי ללקוחות" },
  { value: "hidden",       label: "מוסתר",       desc: "נסתר מהחנות" },
  { value: "draft",        label: "טיוטה",       desc: "בעבודה, לא פורסם" },
  { value: "out_of_stock", label: "אזל המלאי",   desc: "מוצג כאזל" },
];

const STUDIO_COLOR_OPTIONS: { key: StudioProductColorKey; label: string }[] = [
  { key: "gold", label: "זהב" },
  { key: "silver", label: "כסף" },
  { key: "rose", label: "רוז גולד" },
  { key: "black", label: "שחור" },
];
const CUSTOMER_UPLOAD_TAG = "allow_customer_image_upload";

const EMPTY_FORM: ProductFormData = {
  name: "", slug: "", short_description: "", description: "",
  sku: "", price: "", compare_price: "",
  category_id: "", subcategory_id: "",
  category_assignment_ids: [],
  studio_colors: ["gold", "silver", "rose", "black"],
  status: "active", is_featured: false,
  tags: [], seo_title: "", seo_description: "",
  images: ["", "", "", "", ""],
  inventory_quantity: "0", low_stock_threshold: "5",
};

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const sb     = createClient();
  const toast  = useToast();
  const isEdit = !!product;

  const [form, setForm]       = useState<ProductFormData>(EMPTY_FORM);
  const [errors, setErrors]   = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [saving, setSaving]   = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Load categories (auto-seeded from site defaults when empty)
  useEffect(() => {
    getCategories(sb)
      .then((data) => setCategories(data))
      .catch((err) => {
        console.error("categories load:", err);
        toast("שגיאה בטעינת קטגוריות", "error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (!product) return;
    const imageUrls = product.images.map(i => i.url);
    while (imageUrls.length < 5) imageUrls.push("");
    const assignments =
      product.category_assignment_ids?.length
        ? product.category_assignment_ids
        : product.subcategory_id
          ? [product.subcategory_id]
          : product.category_id
            ? [product.category_id]
            : [];
    const colors = (product.studio_colors as StudioProductColorKey[] | undefined)?.filter(Boolean);
    setForm({
      name: product.name,
      slug: product.slug,
      short_description: product.short_description ?? "",
      description: product.description ?? "",
      sku: product.sku,
      price: product.price,
      compare_price: product.compare_price ?? "",
      category_id: product.category_id ?? "",
      subcategory_id: product.subcategory_id ?? "",
      category_assignment_ids: assignments,
      studio_colors: colors?.length ? colors : ["gold", "silver", "rose", "black"],
      status: product.status,
      is_featured: product.is_featured,
      tags: product.tags,
      seo_title: product.seo_title ?? "",
      seo_description: product.seo_description ?? "",
      images: imageUrls,
      inventory_quantity: product.inventory?.quantity ?? 0,
      low_stock_threshold: product.inventory?.low_stock_threshold ?? 5,
    });
    setSlugManual(true);
  }, [product]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual && form.name) {
      setForm(f => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugManual]);

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  // ── Tags ────────────────────────────────────────────────────────────────
  function addTag() {
    const tag = tagInput.trim();
    if (tag === CUSTOMER_UPLOAD_TAG) {
      setTagInput("");
      return;
    }
    if (!tag || form.tags.includes(tag)) { setTagInput(""); return; }
    set("tags", [...form.tags, tag]);
    setTagInput("");
  }
  function removeTag(t: string) { set("tags", form.tags.filter(x => x !== t)); }
  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  }

  function toggleCategoryAssignment(id: string) {
    const next = new Set(form.category_assignment_ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm((f) => ({ ...f, category_assignment_ids: [...next] }));
    if (errors.category_assignment_ids) setErrors((er) => ({ ...er, category_assignment_ids: undefined }));
  }

  async function onPickImageFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadProductImage(sb, file);
      const imgs = [...form.images];
      imgs[idx] = url;
      set("images", imgs);
      toast("התמונה הועלתה", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "העלאה נכשלה", "error");
    } finally {
      setUploadingIdx(null);
    }
  }

  function toggleStudioColor(key: StudioProductColorKey) {
    const next = new Set(form.studio_colors);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setForm((f) => ({ ...f, studio_colors: [...next] as StudioProductColorKey[] }));
    if (errors.studio_colors) setErrors((er) => ({ ...er, studio_colors: undefined }));
  }

  function toggleCustomerUpload(enabled: boolean) {
    const next = new Set(form.tags);
    if (enabled) next.add(CUSTOMER_UPLOAD_TAG);
    else next.delete(CUSTOMER_UPLOAD_TAG);
    set("tags", [...next]);
  }

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim())           e.name  = "שם המוצר הוא שדה חובה";
    if (!form.sku.trim())            e.sku   = "SKU הוא שדה חובה";
    if (!form.price || Number(form.price) <= 0) e.price = "מחיר חייב להיות גדול מ-0";
    if (!form.category_assignment_ids.length) e.category_assignment_ids = "יש לבחור לפחות קטגוריה אחת";
    if (!form.studio_colors.length)  e.studio_colors = "יש לבחור לפחות צבע תצוגה";
    if (!form.images[0]?.trim())     e.images = "יש להוסיף לפחות תמונה ראשית";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && product) {
        await updateProduct(sb, product.id, form);
        toast("המוצר עודכן בהצלחה", "success");
        router.refresh();
      } else {
        const { id } = await createProduct(sb, form);
        toast("המוצר נוצר בהצלחה", "success");
        router.push(`/admin/products/${id}`);
      }
    } catch (err) {
      console.error(err);
      toast("שגיאה בשמירת המוצר", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────
  const preferredRootOrder = ["necklaces", "bracelets", "keychains", "other"];
  const rootCandidates = categories.filter((c) => !c.parent_id);
  const parentCats = preferredRootOrder
    .map((slug) => rootCandidates.find((c) => c.slug === slug))
    .filter(Boolean) as DbCategory[];
  const fallbackRootCats = rootCandidates.filter((c) => !parentCats.some((p) => p.id === c.id));
  const dedupedFallback = fallbackRootCats.filter(
    (c, i, arr) => arr.findIndex((x) => x.name.trim() === c.name.trim()) === i
  );
  const visibleParentCats = [...parentCats, ...dedupedFallback];
  const hasChildren = (id: string) => categories.some((c) => c.parent_id === id);
  const leafCategories = categories.filter((c) => !hasChildren(c.id));
  const groupedLeaves = visibleParentCats.map((parent) => ({
    parent,
    leaves: leafCategories.filter((l) => l.parent_id === parent.id),
  })).filter((g) => g.leaves.length > 0);
  const rootLeaves = leafCategories.filter((l) => !l.parent_id);
  const salePercent = form.compare_price && form.price
    ? Math.round((1 - Number(form.price) / Number(form.compare_price)) * 100)
    : 0;
  const visibleTags = form.tags.filter((t) => t !== CUSTOMER_UPLOAD_TAG);

  // ── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "12px", padding: "24px", marginBottom: "16px",
  };
  const label: React.CSSProperties = {
    fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
    display: "block", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.04em",
  };
  const inp = (hasErr?: boolean): React.CSSProperties => ({
    width: "100%", background: "var(--input)",
    border: `1px solid ${hasErr ? "var(--destructive)" : "var(--border)"}`,
    borderRadius: "8px", padding: "9px 12px",
    fontSize: "13px", color: "var(--foreground)", outline: "none",
  });
  const errMsg: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", color: "var(--destructive)", marginTop: "5px",
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/admin/products"
            style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted-foreground)", textDecoration: "none", fontSize: "13px" }}
          >
            <ArrowRight size={16} /> חזרה למוצרים
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          <h1 style={{ fontSize: "18px", fontWeight: 700 }}>
            {isEdit ? `עריכה: ${product!.name}` : "מוצר חדש"}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/admin/products"
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "9px", padding: "8px 16px", fontSize: "13px", color: "var(--foreground-secondary)", textDecoration: "none" }}
          >
            <X size={14} /> ביטול
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: saving ? "rgba(201,169,110,0.5)" : "var(--primary)", border: "none", borderRadius: "9px", padding: "8px 20px", fontSize: "13px", fontWeight: 700, color: "#09090b", cursor: saving ? "not-allowed" : "pointer" }}
          >
            <Save size={14} />
            {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור מוצר"}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>

        {/* ── LEFT: main content ─────────────────────────────────────────── */}
        <div>
          {/* General info */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "18px" }}>פרטים כלליים</h2>

            <div style={{ marginBottom: "14px" }}>
              <label style={label}>שם המוצר *</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="לדוגמה: שרשרת לב עם חריטה"
                style={inp(!!errors.name)}
              />
              {errors.name && <div style={errMsg}><AlertCircle size={11} />{errors.name}</div>}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={label}>Slug (URL)</label>
              <input
                value={form.slug}
                onChange={e => { setSlugManual(true); set("slug", e.target.value); }}
                placeholder="necklace-heart-engraving"
                style={{ ...inp(), direction: "ltr", textAlign: "left" }}
              />
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                /products/{form.slug || "..."}
              </p>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={label}>תיאור קצר</label>
              <textarea
                value={form.short_description}
                onChange={e => set("short_description", e.target.value)}
                placeholder="משפט קצר שמופיע מתחת לשם המוצר..."
                rows={2}
                style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={label}>תיאור מלא</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="תיאור מפורט של המוצר, חומרים, מידות, אפשרויות..."
                rows={5}
                style={{ ...inp(), resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          </div>

          {/* Images */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>תמונות</h2>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "18px" }}>
              התמונה הראשונה תוצג כתמונה ראשית. אפשר להדביק קישור או להעלות קובץ מהמחשב (עד 5MB).
            </p>

            {form.images.map((url, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start" }}>
                {/* Preview */}
                <div
                  style={{
                    width: "64px", height: "64px", borderRadius: "8px",
                    background: "var(--input)", border: "1px solid var(--border)",
                    flexShrink: 0, overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <FileText size={20} color="var(--muted-foreground)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={url}
                    onChange={e => {
                      const imgs = [...form.images];
                      imgs[idx] = e.target.value;
                      set("images", imgs);
                    }}
                    placeholder={idx === 0 ? "כתובת URL של התמונה הראשית *" : `תמונה ${idx + 1} (אופציונלי)`}
                    style={inp(idx === 0 && !!errors.images)}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: uploadingIdx === idx ? "var(--muted)" : "var(--card)",
                        cursor: uploadingIdx === idx ? "wait" : "pointer",
                        opacity: uploadingIdx === idx ? 0.85 : 1,
                      }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        hidden
                        disabled={uploadingIdx === idx}
                        onChange={(e) => onPickImageFile(idx, e)}
                      />
                      {uploadingIdx === idx ? (
                        <Loader2 size={14} className="animate-spin" style={{ flexShrink: 0 }} />
                      ) : (
                        <Upload size={14} style={{ flexShrink: 0 }} />
                      )}
                      {uploadingIdx === idx ? "מעלה…" : "העלאה מהמחשב"}
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>או הדבקת קישור למעלה</span>
                  </div>
                  {idx === 0 && errors.images && <div style={errMsg}><AlertCircle size={11} />{errors.images}</div>}
                  {idx === 0 && <p style={{ fontSize: "10px", color: "var(--primary)", marginTop: "3px" }}>תמונה ראשית</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "18px" }}>תמחור</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={label}>מחיר (₪) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => set("price", e.target.value)}
                  placeholder="0"
                  style={{ ...inp(!!errors.price), direction: "ltr", textAlign: "left" }}
                />
                {errors.price && <div style={errMsg}><AlertCircle size={11} />{errors.price}</div>}
              </div>
              <div>
                <label style={label}>מחיר מקורי (לפני הנחה)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compare_price}
                  onChange={e => set("compare_price", e.target.value)}
                  placeholder="0"
                  style={{ ...inp(), direction: "ltr", textAlign: "left" }}
                />
              </div>
            </div>
            {salePercent > 0 && (
              <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "6px", padding: "5px 12px", fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>
                הנחה של {salePercent}%
              </div>
            )}
          </div>

          {/* Inventory */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "18px" }}>מלאי</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              <div>
                <label style={label}>SKU *</label>
                <input
                  value={form.sku}
                  onChange={e => set("sku", e.target.value)}
                  placeholder="NL-001"
                  style={{ ...inp(!!errors.sku), direction: "ltr", textAlign: "left" }}
                />
                {errors.sku && <div style={errMsg}><AlertCircle size={11} />{errors.sku}</div>}
              </div>
              <div>
                <label style={label}>כמות במלאי</label>
                <input
                  type="number"
                  min="0"
                  value={form.inventory_quantity}
                  onChange={e => set("inventory_quantity", e.target.value)}
                  style={{ ...inp(), direction: "ltr", textAlign: "left" }}
                />
              </div>
              <div>
                <label style={label}>סף מלאי נמוך</label>
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={e => set("low_stock_threshold", e.target.value)}
                  style={{ ...inp(), direction: "ltr", textAlign: "left" }}
                />
              </div>
            </div>
          </div>

          {/* SEO */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>SEO</h2>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "18px" }}>
              מיטוב לחיפוש גוגל
            </p>
            <div style={{ marginBottom: "14px" }}>
              <label style={label}>כותרת SEO</label>
              <input
                value={form.seo_title}
                onChange={e => set("seo_title", e.target.value)}
                placeholder={form.name || "כותרת לגוגל"}
                style={inp()}
                maxLength={60}
              />
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "3px", textAlign: "left", direction: "ltr" }}>
                {form.seo_title.length}/60
              </p>
            </div>
            <div>
              <label style={label}>תיאור SEO</label>
              <textarea
                value={form.seo_description}
                onChange={e => set("seo_description", e.target.value)}
                placeholder="תיאור קצר לגוגל (עד 160 תווים)..."
                rows={3}
                style={{ ...inp(), resize: "vertical" }}
                maxLength={160}
              />
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "3px", textAlign: "left", direction: "ltr" }}>
                {form.seo_description.length}/160
              </p>
            </div>

            {/* Preview */}
            {(form.seo_title || form.name) && (
              <div style={{ marginTop: "16px", padding: "14px", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: "6px" }}>תצוגה מקדימה בגוגל</p>
                <p style={{ fontSize: "14px", color: "#8ab4f8", fontWeight: 500, marginBottom: "2px" }}>
                  {form.seo_title || form.name}
                </p>
                <p style={{ fontSize: "11px", color: "#3c8537", marginBottom: "4px", direction: "ltr", textAlign: "left" }}>
                  harotli.co.il/products/{form.slug || "..."}
                </p>
                <p style={{ fontSize: "12px", color: "#bdc1c6", lineHeight: 1.4 }}>
                  {form.seo_description || form.short_description || "אין תיאור זמין"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: sidebar ─────────────────────────────────────────────── */}
        <div>
          {/* Status */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>סטטוס</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {STATUSES.map(s => (
                <label
                  key={s.value}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "8px",
                    border: `1px solid ${form.status === s.value ? "rgba(201,169,110,0.4)" : "var(--border)"}`,
                    background: form.status === s.value ? "rgba(201,169,110,0.08)" : "var(--input)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s.value}
                    checked={form.status === s.value}
                    onChange={() => set("status", s.value)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{s.desc}</div>
                  </div>
                  {s.value === "active" ? <Eye size={14} color="var(--success)" style={{ marginRight: "auto" }} />
                    : s.value === "hidden" ? <EyeOff size={14} color="var(--muted-foreground)" style={{ marginRight: "auto" }} />
                    : null}
                </label>
              ))}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={e => set("is_featured", e.target.checked)}
                style={{ accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "13px" }}>מוצר מומלץ (featured)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.tags.includes(CUSTOMER_UPLOAD_TAG)}
                onChange={(e) => toggleCustomerUpload(e.target.checked)}
                style={{ accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "13px" }}>לאפשר ללקוח העלאת תמונה בהזמנה</span>
            </label>
          </div>

          {/* Categories (multi) + studio display colors */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>קטגוריות בחנות</h2>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "14px", lineHeight: 1.45 }}>
              סמנו את כל הקטגוריות שבהן המוצר יופיע בסטודיו (אפשר יותר מאחת).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "280px", overflowY: "auto", paddingInlineEnd: "4px" }}>
              {groupedLeaves.map(({ parent, leaves }) => (
                <div key={parent.id}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", color: "var(--foreground)" }}>{parent.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {leaves.map((leaf) => (
                      <label
                        key={leaf.id}
                        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}
                      >
                        <input
                          type="checkbox"
                          checked={form.category_assignment_ids.includes(leaf.id)}
                          onChange={() => toggleCategoryAssignment(leaf.id)}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        {leaf.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {rootLeaves.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>כללי</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {rootLeaves.map((leaf) => (
                      <label key={leaf.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                        <input
                          type="checkbox"
                          checked={form.category_assignment_ids.includes(leaf.id)}
                          onChange={() => toggleCategoryAssignment(leaf.id)}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        {leaf.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.category_assignment_ids && (
              <div style={{ ...errMsg, marginTop: "10px" }}>
                <AlertCircle size={12} />
                {errors.category_assignment_ids}
              </div>
            )}

            <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <label style={label}>צבעי תצוגה בסטודיו</label>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "10px" }}>
                אילו גוונים יופיעו לבחירת הלקוח בכרטיס המוצר.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {STUDIO_COLOR_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: `1px solid ${form.studio_colors.includes(opt.key) ? "rgba(201,169,110,0.45)" : "var(--border)"}`,
                      background: form.studio_colors.includes(opt.key) ? "rgba(201,169,110,0.08)" : "var(--input)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.studio_colors.includes(opt.key)}
                      onChange={() => toggleStudioColor(opt.key)}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {errors.studio_colors && (
                <div style={{ ...errMsg, marginTop: "8px" }}>
                  <AlertCircle size={12} />
                  {errors.studio_colors}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div style={card}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>תגיות</h2>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={onTagKey}
                placeholder="הוסף תגית..."
                style={{ ...inp(), flex: 1 }}
              />
              <button
                type="button"
                onClick={addTag}
                style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center" }}
              >
                <Plus size={14} />
              </button>
            </div>
            {visibleTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                {visibleTags.map(t => (
                  <span
                    key={t}
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", color: "var(--primary)" }}
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", padding: 0 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
