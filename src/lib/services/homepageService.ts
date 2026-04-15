/**
 * Homepage CMS — featured products section (homepage_sections.extra.productIds).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/auth";

type SB = SupabaseClient<Database>;

const FEATURED_TYPE = "featured_products";

export interface FeaturedSectionState {
  id: string;
  productIds: string[];
}

function parseExtra(raw: Json | null): { productIds: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { productIds: [] };
  const o = raw as Record<string, unknown>;
  const ids = o.productIds ?? o.product_ids;
  if (!Array.isArray(ids)) return { productIds: [] };
  return { productIds: ids.filter((x): x is string => typeof x === "string") };
}

export async function getFeaturedProductIds(sb: SB): Promise<FeaturedSectionState> {
  if (!isSupabaseConfigured()) {
    return { id: "mock", productIds: [] };
  }

  const { data, error } = await sb
    .from("homepage_sections")
    .select("id,extra")
    .eq("type", FEATURED_TYPE)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getFeaturedProductIds: ${error.message}`);
  if (!data) {
    const { data: inserted, error: insErr } = await sb
      .from("homepage_sections")
      .insert({
        type: FEATURED_TYPE,
        title: "נבחרים במיוחד",
        is_visible: true,
        sort_order: 2,
        extra: { productIds: [] } as unknown as Json,
      })
      .select("id,extra")
      .single();
    if (insErr || !inserted) throw new Error(`getFeaturedProductIds (seed): ${insErr?.message}`);
    return { id: inserted.id, productIds: parseExtra(inserted.extra).productIds };
  }

  return { id: data.id, productIds: parseExtra(data.extra).productIds };
}

export async function saveFeaturedProductIds(sb: SB, sectionId: string, productIds: string[]): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const unique = [...new Set(productIds.filter(Boolean))].slice(0, 12);
  const { error } = await sb
    .from("homepage_sections")
    .update({ extra: { productIds: unique } as unknown as Json })
    .eq("id", sectionId);

  if (error) throw new Error(`saveFeaturedProductIds: ${error.message}`);
}
