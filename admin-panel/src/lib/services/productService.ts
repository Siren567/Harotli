/**
 * productService — all product-related Supabase queries.
 *
 * All functions accept a Supabase client instance so they work in both:
 *   - Server Components / Route Handlers (createServerSupabaseClient)
 *   - Client Components (createClient from @/lib/supabase/client)
 *
 * When Supabase is not yet configured the functions fall back to
 * mock data so the UI remains fully functional in dev.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbProduct, DbProductImage, DbInventory } from "@/types/database";
import type { ProductWithDetails, ProductFormData, ProductStatus } from "@/types";
import { mockProducts, mockCategories } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";
import { slugify } from "@/lib/utils";

type SB = SupabaseClient<Database>;
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

const STUDIO_COLORS_MIGRATION_HINT =
  "הוסיפו את העמודה studio_colors: הריצו את הקובץ admin-panel/supabase/migrations/002_product_studio_and_categories.sql ב־Supabase → SQL Editor.";

function isMissingStudioColorsColumnError(message: string | undefined): boolean {
  return !!message && message.includes("studio_colors");
}

function isMissingCategoryAssignmentsTableError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("product_category_assignments") &&
    (message.includes("schema cache") || message.includes("relation") || message.includes("does not exist"))
  );
}

/** Insert product; retries without studio_colors if the column does not exist on the remote DB yet. */
async function insertProductRow(sb: SB, row: ProductInsert) {
  let res = await sb.from("products").insert(row).select("id").single();
  if (res.error && isMissingStudioColorsColumnError(res.error.message) && row.studio_colors !== undefined) {
    const { studio_colors: _removed, ...rest } = row;
    res = await sb.from("products").insert(rest).select("id").single();
    if (!res.error) console.warn(`[productService] ${STUDIO_COLORS_MIGRATION_HINT}`);
  }
  return res;
}

/** Update product; retries without studio_colors if the column is missing. */
async function updateProductRow(sb: SB, id: string, updates: ProductUpdate) {
  let res = await sb.from("products").update(updates).eq("id", id);
  if (res.error && isMissingStudioColorsColumnError(res.error.message) && updates.studio_colors !== undefined) {
    const { studio_colors: _removed, ...rest } = updates;
    if (Object.keys(rest).length === 0) {
      return {
        error: {
          message: `לא ניתן לשמור צבעי סטודיו: העמודה studio_colors לא קיימת במסד. ${STUDIO_COLORS_MIGRATION_HINT}`,
        },
      };
    }
    res = await sb.from("products").update(rest).eq("id", id);
    if (!res.error) console.warn(`[productService] ${STUDIO_COLORS_MIGRATION_HINT}`);
  }
  return res;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map DB rows → ProductWithDetails */
function assembleProduct(
  p: DbProduct,
  images: DbProductImage[],
  inventory: DbInventory | null,
  categoryName: string | null,
  categoryAssignmentIds: string[] = []
): ProductWithDetails {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return {
    ...p,
    primary_image: sorted.find(i => i.is_primary)?.url ?? sorted[0]?.url ?? null,
    images: sorted,
    inventory,
    category_name: categoryName,
    category_assignment_ids: categoryAssignmentIds,
  };
}

/** Convert mock product to ProductWithDetails (used in dev fallback) */
function mockToDetails(m: (typeof mockProducts)[0]): ProductWithDetails {
  const cat = mockCategories.find(c => c.id === m.categoryId);
  const images: DbProductImage[] = m.images.map((url, i) => ({
    id: `img-${m.id}-${i}`,
    product_id: m.id,
    url,
    alt_text: m.name,
    sort_order: i,
    is_primary: i === 0,
    created_at: m.createdAt,
  }));
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
    studio_colors: ["gold", "silver", "rose", "black"],
    seo_title: m.seoTitle ?? null,
    seo_description: m.seoDescription ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    primary_image: m.images[0] ?? null,
    images,
    inventory: {
      id: `inv-${m.id}`,
      product_id: m.id,
      quantity: m.inventory,
      low_stock_threshold: m.lowStockThreshold,
      updated_at: m.updatedAt,
    },
    category_name: cat?.name ?? null,
    category_assignment_ids: m.subcategoryId ? [m.subcategoryId] : m.categoryId ? [m.categoryId] : [],
  };
}

// ─── READ ────────────────────────────────────────────────────────────────────

export interface GetProductsOptions {
  search?: string;
  status?: ProductStatus | "all";
  categoryId?: string;
  sortBy?: "name" | "price" | "inventory" | "updated_at";
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface GetProductsResult {
  products: ProductWithDetails[];
  total: number;
}

export async function getProducts(
  sb: SB,
  opts: GetProductsOptions = {}
): Promise<GetProductsResult> {
  const {
    search = "",
    status = "all",
    categoryId,
    sortBy = "updated_at",
    sortDir = "desc",
    page = 1,
    perPage = 10,
  } = opts;

  // ── dev fallback ───────────────────────────────────────────────────────
  if (!isSupabaseConfigured()) {
    let list = mockProducts.map(mockToDetails);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    if (status && status !== "all") list = list.filter(p => p.status === status);
    if (categoryId) list = list.filter(p => p.category_id === categoryId);

    const total = list.length;

    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "he");
      if (sortBy === "price") return (a.price - b.price) * (sortDir === "asc" ? 1 : -1);
      if (sortBy === "inventory") {
        return ((a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0)) * (sortDir === "asc" ? 1 : -1);
      }
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * (sortDir === "asc" ? 1 : -1);
    });
    if (sortBy === "name") {
      if (sortDir === "desc") list.reverse();
    }

    const from = (page - 1) * perPage;
    return { products: list.slice(from, from + perPage), total };
  }

  // ── Supabase ────────────────────────────────────────────────────────────
  let query = sb
    .from("products")
    // categories!category_id(...) disambiguates the two FKs (category_id vs subcategory_id)
    .select("*, product_images(*), inventory(*), categories!category_id(name)", { count: "exact" });

  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (categoryId) query = query.eq("category_id", categoryId);

  const dbSortBy = sortBy === "inventory" ? "updated_at" : sortBy; // inventory sort handled post-fetch
  query = query.order(dbSortBy, { ascending: sortDir === "asc" });

  const rangeFrom = (page - 1) * perPage;
  query = query.range(rangeFrom, rangeFrom + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`getProducts: ${error.message}`);

  const products = (data ?? []).map((row: DbProduct & {
    product_images: DbProductImage[];
    inventory: DbInventory | null;
    categories: { name: string } | null;
  }) =>
    assembleProduct(row, row.product_images ?? [], row.inventory, row.categories?.name ?? null, [])
  );

  return { products, total: count ?? 0 };
}

export async function getProductById(
  sb: SB,
  id: string
): Promise<ProductWithDetails | null> {
  if (!isSupabaseConfigured()) {
    const m = mockProducts.find(p => p.id === id);
    return m ? mockToDetails(m) : null;
  }

  const { data, error } = await sb
    .from("products")
    .select("*, product_images(*), inventory(*), categories!category_id(name)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const row = data as DbProduct & {
    product_images: DbProductImage[];
    inventory: DbInventory | null;
    categories: { name: string } | null;
  };

  const { data: links, error: linksError } = await sb
    .from("product_category_assignments")
    .select("category_id")
    .eq("product_id", id);
  if (linksError && !isMissingCategoryAssignmentsTableError(linksError.message)) {
    throw new Error(`getProductById(assignments): ${linksError.message}`);
  }

  const assignmentIds = (links ?? []).map((l) => l.category_id);

  return assembleProduct(
    row,
    row.product_images ?? [],
    row.inventory,
    row.categories?.name ?? null,
    assignmentIds
  );
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createProduct(
  sb: SB,
  form: ProductFormData
): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) {
    // Dev: just return a fake ID — mock data is read-only
    return { id: `mock-${Date.now()}` };
  }

  const slug = form.slug || slugify(form.name);

  const { primaryCategoryId, primarySubcategoryId } = await derivePrimaryCategoriesFromAssignments(
    sb,
    form.category_assignment_ids
  );

  // 1. Insert product
  const insertRow: ProductInsert = {
    name: form.name,
    slug,
    short_description: form.short_description || null,
    description: form.description || null,
    sku: form.sku,
    price: Number(form.price),
    compare_price: form.compare_price ? Number(form.compare_price) : null,
    category_id: primaryCategoryId,
    subcategory_id: primarySubcategoryId,
    status: form.status,
    is_featured: form.is_featured,
    tags: form.tags,
    studio_colors: normalizeStudioColors(form.studio_colors as string[] | undefined),
    seo_title: form.seo_title || null,
    seo_description: form.seo_description || null,
  };

  const { data: product, error } = await insertProductRow(sb, insertRow);

  if (error || !product) throw new Error(`createProduct: ${error?.message}`);

  // 2. Insert images
  if (form.images.length > 0) {
    await insertImages(sb, product.id, form.images);
  }

  // 3. Insert inventory record
  await sb.from("inventory").insert({
    product_id: product.id,
    quantity: Number(form.inventory_quantity) || 0,
    low_stock_threshold: Number(form.low_stock_threshold) || 5,
  });

  await replaceCategoryAssignments(sb, product.id, form.category_assignment_ids);

  return { id: product.id };
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateProduct(
  sb: SB,
  id: string,
  form: Partial<ProductFormData>
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const updates: Database["public"]["Tables"]["products"]["Update"] = {};

  if (form.name !== undefined) { updates.name = form.name; updates.slug = form.slug || slugify(form.name); }
  if (form.short_description !== undefined) updates.short_description = form.short_description || null;
  if (form.description !== undefined)       updates.description = form.description || null;
  if (form.sku !== undefined)               updates.sku = form.sku;
  if (form.price !== undefined)             updates.price = Number(form.price);
  if (form.compare_price !== undefined)     updates.compare_price = form.compare_price ? Number(form.compare_price) : null;
  if (form.category_id !== undefined)       updates.category_id = form.category_id || null;
  if (form.subcategory_id !== undefined)    updates.subcategory_id = form.subcategory_id || null;
  if (form.status !== undefined)            updates.status = form.status;
  if (form.is_featured !== undefined)       updates.is_featured = form.is_featured;
  if (form.tags !== undefined)              updates.tags = form.tags;
  if (form.studio_colors !== undefined) {
    updates.studio_colors = normalizeStudioColors(form.studio_colors as string[] | undefined);
  }
  if (form.seo_title !== undefined)         updates.seo_title = form.seo_title || null;
  if (form.seo_description !== undefined)   updates.seo_description = form.seo_description || null;

  if (form.category_assignment_ids !== undefined) {
    const { primaryCategoryId, primarySubcategoryId } = await derivePrimaryCategoriesFromAssignments(
      sb,
      form.category_assignment_ids
    );
    updates.category_id = primaryCategoryId;
    updates.subcategory_id = primarySubcategoryId;
  }

  const { error } = await updateProductRow(sb, id, updates);
  if (error) throw new Error(`updateProduct: ${error.message}`);

  if (form.category_assignment_ids !== undefined) {
    await replaceCategoryAssignments(sb, id, form.category_assignment_ids);
  }

  // Replace images if provided
  if (form.images !== undefined) {
    await sb.from("product_images").delete().eq("product_id", id);
    if (form.images.length > 0) await insertImages(sb, id, form.images);
  }

  // Update inventory — only touch the columns that were actually passed
  if (form.inventory_quantity !== undefined && form.low_stock_threshold !== undefined) {
    // Full upsert (both values provided — used by ProductForm save)
    await sb.from("inventory").upsert({
      product_id: id,
      quantity: Number(form.inventory_quantity),
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
    }, { onConflict: "product_id" });
  } else if (form.inventory_quantity !== undefined) {
    // Quantity-only update (used by inline stock editor) — do not touch threshold
    const { error: invErr } = await sb
      .from("inventory")
      .update({ quantity: Number(form.inventory_quantity) })
      .eq("product_id", id);
    if (invErr) {
      // Row may not exist yet — insert it
      await sb.from("inventory").insert({
        product_id: id,
        quantity: Number(form.inventory_quantity),
        low_stock_threshold: 5,
      });
    }
  } else if (form.low_stock_threshold !== undefined) {
    // Threshold-only update
    await sb
      .from("inventory")
      .update({ low_stock_threshold: Number(form.low_stock_threshold) || 5 })
      .eq("product_id", id);
  }
}

// ─── STATUS ──────────────────────────────────────────────────────────────────

export async function setProductStatus(
  sb: SB,
  id: string,
  status: ProductStatus
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await sb.from("products").update({ status }).eq("id", id);
  if (error) throw new Error(`setProductStatus: ${error.message}`);
}

export async function setProductsStatus(
  sb: SB,
  ids: string[],
  status: ProductStatus
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await sb.from("products").update({ status }).in("id", ids);
  if (error) throw new Error(`setProductsStatus: ${error.message}`);
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function deleteProduct(sb: SB, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // Images and inventory cascade-delete via FK constraints
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw new Error(`deleteProduct: ${error.message}`);
}

export async function deleteProducts(sb: SB, ids: string[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await sb.from("products").delete().in("id", ids);
  if (error) throw new Error(`deleteProducts: ${error.message}`);
}

// ─── DUPLICATE ───────────────────────────────────────────────────────────────

export async function duplicateProduct(sb: SB, id: string): Promise<{ id: string }> {
  if (!isSupabaseConfigured()) return { id: `mock-dup-${Date.now()}` };

  const { data: srcData, error } = await sb
    .from("products")
    .select("*, product_images(*), inventory(*)")
    .eq("id", id)
    .single();

  if (error || !srcData) throw new Error(`duplicateProduct: source not found`);

  // Cast to access joined tables
  const src = srcData as DbProduct & {
    product_images: DbProductImage[];
    inventory: DbInventory | null;
  };

  const newSku  = `${src.sku}-copy-${Date.now().toString(36)}`;
  const newSlug = `${src.slug}-copy`;

  const dupInsert: ProductInsert = {
    name: `${src.name} (עותק)`,
    slug: newSlug,
    short_description: src.short_description,
    description: src.description,
    sku: newSku,
    price: src.price,
    compare_price: src.compare_price,
    category_id: src.category_id,
    subcategory_id: src.subcategory_id,
    status: "draft",
    is_featured: src.is_featured,
    tags: src.tags,
    studio_colors: normalizeStudioColors(
      (src as DbProduct & { studio_colors?: string[] }).studio_colors ?? undefined
    ),
    seo_title: src.seo_title,
    seo_description: src.seo_description,
  };

  const { data: dup, error: dupErr } = await insertProductRow(sb, dupInsert);

  if (dupErr || !dup) throw new Error(`duplicateProduct: ${dupErr?.message ?? "insert failed"}`);

  // Copy images
  const srcImages = src.product_images ?? [];
  if (srcImages.length > 0) await insertImages(sb, dup.id, srcImages.map((i: DbProductImage) => i.url));

  // Copy inventory
  const srcInv = src.inventory;
  if (srcInv) {
    await sb.from("inventory").insert({
      product_id: dup.id,
      quantity: srcInv.quantity,
      low_stock_threshold: srcInv.low_stock_threshold,
    });
  }

  const { data: linkRows, error: linksError } = await sb
    .from("product_category_assignments")
    .select("category_id")
    .eq("product_id", id);
  if (linksError && !isMissingCategoryAssignmentsTableError(linksError.message)) {
    throw new Error(`duplicateProduct(assignments): ${linksError.message}`);
  }
  const linkIds = (linkRows ?? []).map((r) => r.category_id);
  if (linkIds.length) await replaceCategoryAssignments(sb, dup.id, linkIds);

  return { id: dup.id };
}

// ─── Private helpers ─────────────────────────────────────────────────────────

const STUDIO_COLOR_KEYS = new Set(["gold", "silver", "rose", "black"]);

function normalizeStudioColors(keys: string[] | undefined): string[] {
  const filtered = (keys ?? []).filter((k) => STUDIO_COLOR_KEYS.has(k));
  return filtered.length ? filtered : ["gold", "silver", "rose", "black"];
}

async function derivePrimaryCategoriesFromAssignments(
  sb: SB,
  assignmentIds: string[]
): Promise<{ primaryCategoryId: string | null; primarySubcategoryId: string | null }> {
  const uniq = [...new Set(assignmentIds)].filter(Boolean);
  if (!uniq.length) return { primaryCategoryId: null, primarySubcategoryId: null };

  const { data: cats, error } = await sb.from("categories").select("id,parent_id").in("id", uniq);
  if (error) throw new Error(`derivePrimaryCategoriesFromAssignments: ${error.message}`);

  const byId = new Map((cats ?? []).map((c) => [c.id, c]));
  const firstId = uniq[0];
  const cat = byId.get(firstId);
  if (!cat) return { primaryCategoryId: null, primarySubcategoryId: null };

  if (cat.parent_id) {
    return { primaryCategoryId: cat.parent_id, primarySubcategoryId: cat.id };
  }
  return { primaryCategoryId: cat.id, primarySubcategoryId: null };
}

async function replaceCategoryAssignments(sb: SB, productId: string, ids: string[]) {
  const { error: deleteError } = await sb
    .from("product_category_assignments")
    .delete()
    .eq("product_id", productId);
  if (deleteError && isMissingCategoryAssignmentsTableError(deleteError.message)) {
    console.warn("[productService] product_category_assignments table is missing; skipping assignment sync.");
    return;
  }
  if (deleteError) throw new Error(`replaceCategoryAssignments(delete): ${deleteError.message}`);

  const rows = [...new Set(ids)]
    .filter(Boolean)
    .map((category_id) => ({ product_id: productId, category_id }));
  if (!rows.length) return;
  const { error } = await sb.from("product_category_assignments").insert(rows);
  if (error && isMissingCategoryAssignmentsTableError(error.message)) {
    console.warn("[productService] product_category_assignments table is missing; skipping assignment sync.");
    return;
  }
  if (error) throw new Error(`replaceCategoryAssignments: ${error.message}`);
}

async function insertImages(sb: SB, productId: string, urls: string[]) {
  const rows = urls.filter(Boolean).map((url, i) => ({
    product_id: productId,
    url,
    sort_order: i,
    is_primary: i === 0,
  }));
  if (rows.length === 0) return;
  const { error } = await sb.from("product_images").insert(rows);
  if (error) throw new Error(`insertImages: ${error.message}`);
}
