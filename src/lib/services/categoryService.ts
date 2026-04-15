/**
 * categoryService — all category-related Supabase queries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbCategory } from "@/types/database";
import { mockCategories } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";

type SB = SupabaseClient<Database>;

const DEFAULT_SITE_CATEGORIES = [
  {
    name: "שרשראות",
    slug: "necklaces",
    sort_order: 1,
    children: [
      { name: "שרשראות לגבר", slug: "necklaces-men", sort_order: 1 },
      { name: "שרשראות לאישה", slug: "necklaces-women", sort_order: 2 },
      { name: "זוגות", slug: "necklaces-couples", sort_order: 3 },
    ],
  },
  {
    name: "צמידים",
    slug: "bracelets",
    sort_order: 2,
    children: [
      { name: "צמידים לגבר", slug: "bracelets-men", sort_order: 1 },
      { name: "צמידים לאישה", slug: "bracelets-women", sort_order: 2 },
      { name: "זוגות", slug: "bracelets-couples", sort_order: 3 },
    ],
  },
  {
    name: "מחזיקי מפתחות",
    slug: "keychains",
    sort_order: 3,
    children: [],
  },
  {
    name: "אחר",
    slug: "other",
    sort_order: 4,
    children: [],
  },
] as const;

// ─── Mock adapter ─────────────────────────────────────────────────────────────

function mockToDb(): DbCategory[] {
  return mockCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    image_url: c.image ?? null,
    parent_id: c.parentId ?? null,
    sort_order: c.order,
    created_at: c.createdAt,
    updated_at: c.createdAt,
  }));
}

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getCategories(sb: SB): Promise<DbCategory[]> {
  if (!isSupabaseConfigured()) return mockToDb();

  await seedDefaultSiteCategories(sb);

  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`getCategories: ${error.message}`);
  return data ?? [];
}

async function seedDefaultSiteCategories(sb: SB): Promise<void> {
  const { data: existing, error: existingErr } = await sb
    .from("categories")
    .select("id,slug,parent_id");
  if (existingErr) throw new Error(`seedDefaultSiteCategories (existing): ${existingErr.message}`);

  const existingBySlug = new Map((existing ?? []).map((c) => [c.slug, c]));

  // 1) Ensure root categories exist (by slug)
  for (const parent of DEFAULT_SITE_CATEGORIES) {
    const existingParent = existingBySlug.get(parent.slug);
    if (!existingParent) {
      const { data: inserted, error } = await sb
        .from("categories")
        .insert({
          name: parent.name,
          slug: parent.slug,
          parent_id: null,
          sort_order: parent.sort_order,
        })
        .select("id,slug,parent_id")
        .single();
      if (error) throw new Error(`seedDefaultSiteCategories (insert parent): ${error.message}`);
      if (inserted) existingBySlug.set(inserted.slug, inserted);
    } else {
      const { error } = await sb
        .from("categories")
        .update({
          name: parent.name,
          parent_id: null,
          sort_order: parent.sort_order,
        })
        .eq("id", existingParent.id);
      if (error) throw new Error(`seedDefaultSiteCategories (update parent): ${error.message}`);
    }
  }

  // Refresh parent IDs after inserts
  const { data: parents, error: parentsErr } = await sb
    .from("categories")
    .select("id,slug,parent_id")
    .in("slug", DEFAULT_SITE_CATEGORIES.map((p) => p.slug));
  if (parentsErr) throw new Error(`seedDefaultSiteCategories (fetch parents): ${parentsErr.message}`);

  const parentIdBySlug = new Map((parents ?? []).map((p) => [p.slug, p.id]));

  // 2) Ensure child categories exist (by slug)
  for (const parent of DEFAULT_SITE_CATEGORIES) {
    const parentId = parentIdBySlug.get(parent.slug);
    if (!parentId) continue;
    for (const child of parent.children) {
      const existingChild = existingBySlug.get(child.slug);
      if (!existingChild) {
        const { data: insertedChild, error } = await sb
          .from("categories")
          .insert({
            name: child.name,
            slug: child.slug,
            parent_id: parentId,
            sort_order: child.sort_order,
          })
          .select("id,slug,parent_id")
          .single();
        if (error) throw new Error(`seedDefaultSiteCategories (insert child): ${error.message}`);
        if (insertedChild) existingBySlug.set(insertedChild.slug, insertedChild);
      } else {
        const { error } = await sb
          .from("categories")
          .update({
            name: child.name,
            parent_id: parentId,
            sort_order: child.sort_order,
          })
          .eq("id", existingChild.id);
        if (error) throw new Error(`seedDefaultSiteCategories (update child): ${error.message}`);
      }
    }
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string;
  sort_order: number;
}

export async function createCategory(
  sb: SB,
  form: CategoryFormData
): Promise<DbCategory> {
  if (!isSupabaseConfigured()) {
    return {
      id: `mock-cat-${Date.now()}`,
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      image_url: form.image_url || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { data, error } = await sb
    .from("categories")
    .insert({
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      image_url: form.image_url || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`createCategory: ${error?.message}`);
  return data;
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateCategory(
  sb: SB,
  id: string,
  form: CategoryFormData
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await sb
    .from("categories")
    .update({
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      image_url: form.image_url || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
    })
    .eq("id", id);

  if (error) throw new Error(`updateCategory: ${error.message}`);
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function deleteCategory(sb: SB, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await sb
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`deleteCategory: ${error.message}`);
}
