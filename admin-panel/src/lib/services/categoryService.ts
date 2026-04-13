/**
 * categoryService — all category-related Supabase queries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DbCategory } from "@/types/database";
import { mockCategories } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/auth";

type SB = SupabaseClient<Database>;

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

  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`getCategories: ${error.message}`);
  return data ?? [];
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
