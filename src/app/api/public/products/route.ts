import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function isMissingAssignmentsTableError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("product_category_assignments") &&
    (message.includes("schema cache") || message.includes("relation") || message.includes("does not exist"))
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function studioCategoryFromSlug(slug: string, name: string): string {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes("bracelet") || n.includes("צמיד")) return "bracelets";
  if (s.includes("key") || n.includes("מחזיק")) return "keychains";
  if (s.includes("necklace") || n.includes("שרשר")) return "necklaces";
  return "other";
}

export async function GET() {
  try {
    const sb = createServiceClient();

    const { data: products, error: productsError } = await sb
      .from("products")
      .select(
        "id,name,short_description,price,category_id,subcategory_id,status,updated_at,studio_colors,tags"
      )
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (productsError) throw productsError;

    const productIds = (products ?? []).map((p) => p.id);
    const baseCategoryIds = [
      ...new Set(
        (products ?? [])
          .flatMap((p) => [p.category_id, p.subcategory_id])
          .filter(Boolean)
      ),
    ] as string[];

    const [
      { data: images, error: imagesError },
      { data: baseCategories, error: baseCategoriesError },
      { data: inventories, error: inventoryError },
      { data: assignmentRows, error: assignmentError },
    ] = await Promise.all([
      productIds.length
        ? sb
            .from("product_images")
            .select("product_id,url,sort_order,is_primary")
            .in("product_id", productIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      baseCategoryIds.length
        ? sb.from("categories").select("id,name,slug,parent_id").in("id", baseCategoryIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? sb.from("inventory").select("product_id,quantity").in("product_id", productIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? sb.from("product_category_assignments").select("product_id,category_id").in("product_id", productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (imagesError) throw imagesError;
    if (baseCategoriesError) throw baseCategoriesError;
    if (inventoryError) throw inventoryError;
    if (assignmentError && !isMissingAssignmentsTableError(assignmentError.message)) throw assignmentError;

    const safeAssignmentRows = assignmentRows ?? [];

    const assignmentCategoryIds = [
      ...new Set((assignmentRows ?? []).map((r) => r.category_id)),
    ] as string[];

    const extraCatIds = assignmentCategoryIds.filter((id) => !baseCategoryIds.includes(id));
    const { data: extraCats } = extraCatIds.length
      ? await sb.from("categories").select("id,name,slug,parent_id").in("id", extraCatIds)
      : { data: [] as { id: string; name: string; slug: string; parent_id: string | null }[] };

    const parentIdsNeeded = [
      ...new Set(
        (extraCats ?? [])
          .map((c) => c.parent_id)
          .filter(Boolean)
      ),
    ] as string[];

    const { data: parentCats } = parentIdsNeeded.length
      ? await sb.from("categories").select("id,name,slug,parent_id").in("id", parentIdsNeeded)
      : { data: [] as { id: string; name: string; slug: string; parent_id: string | null }[] };

    const categoryById = new Map<string, { name: string; slug: string; parent_id: string | null }>();
    for (const c of [...(baseCategories ?? []), ...(extraCats ?? []), ...(parentCats ?? [])]) {
      categoryById.set(c.id, { name: c.name, slug: c.slug, parent_id: c.parent_id });
    }

    const imagesByProduct = new Map<string, { url: string; sort_order: number; is_primary: boolean }[]>();
    for (const img of images ?? []) {
      const list = imagesByProduct.get(img.product_id) ?? [];
      list.push(img);
      imagesByProduct.set(img.product_id, list);
    }

    const inventoryByProductId = new Map<string, number>();
    for (const inv of inventories ?? []) {
      inventoryByProductId.set(inv.product_id, Number(inv.quantity ?? 0));
    }

    const assignmentsByProduct = new Map<string, string[]>();
    for (const row of safeAssignmentRows) {
      const list = assignmentsByProduct.get(row.product_id) ?? [];
      list.push(row.category_id);
      assignmentsByProduct.set(row.product_id, list);
    }

    function placementsForProduct(p: {
      id: string;
      category_id: string | null;
      subcategory_id: string | null;
    }): { studioCategory: string; subcategory: string | null }[] {
      const assignIds = assignmentsByProduct.get(p.id);
      if (assignIds?.length) {
        const out: { studioCategory: string; subcategory: string | null }[] = [];
        for (const cid of assignIds) {
          const c = categoryById.get(cid);
          if (!c) continue;
          if (c.parent_id) {
            const parent = categoryById.get(c.parent_id);
            const studioCategory = studioCategoryFromSlug(parent?.slug ?? "", parent?.name ?? "");
            out.push({ studioCategory, subcategory: c.name });
          } else {
            out.push({
              studioCategory: studioCategoryFromSlug(c.slug, c.name),
              subcategory: null,
            });
          }
        }
        return out;
      }

      const cMain = p.category_id ? categoryById.get(p.category_id) : null;
      const cSub = p.subcategory_id ? categoryById.get(p.subcategory_id) : null;
      if (cSub?.parent_id && cMain) {
        return [
          {
            studioCategory: studioCategoryFromSlug(cMain.slug, cMain.name),
            subcategory: cSub.name,
          },
        ];
      }
      if (cMain) {
        return [
          {
            studioCategory: studioCategoryFromSlug(cMain.slug, cMain.name),
            subcategory: cSub?.name ?? null,
          },
        ];
      }
      return [{ studioCategory: "other", subcategory: null }];
    }

    const payload = (products ?? []).flatMap((p) => {
        const imgs = imagesByProduct.get(p.id) ?? [];
        const imageUrls = imgs.map((i) => i.url).filter(Boolean);
        const primary = imgs.find((i) => i.is_primary)?.url ?? imgs[0]?.url ?? null;
        const placements = placementsForProduct(p);
        const studioColors = Array.isArray((p as { studio_colors?: string[] }).studio_colors)
          ? ((p as { studio_colors?: string[] }).studio_colors ?? []).filter(Boolean)
          : [];

        const base = {
          id: p.id,
          name: p.name,
          description: p.short_description,
          price: Number(p.price),
          image: primary,
          images: imageUrls.length ? imageUrls : primary ? [primary] : [],
          studioColors,
          categoryName: p.category_id ? categoryById.get(p.category_id)?.name ?? null : null,
          categorySlug: p.category_id ? categoryById.get(p.category_id)?.slug ?? null : null,
          subcategoryName: p.subcategory_id ? categoryById.get(p.subcategory_id)?.name ?? null : null,
          subcategorySlug: p.subcategory_id ? categoryById.get(p.subcategory_id)?.slug ?? null : null,
          allowCustomerImageUpload: Array.isArray((p as { tags?: string[] }).tags)
            ? ((p as { tags?: string[] }).tags ?? []).includes("allow_customer_image_upload")
            : false,
        };

        return placements.map((pl) => ({
          ...base,
          studioCategory: pl.studioCategory,
          subcategoryLabel: pl.subcategory,
        }));
      });

    return NextResponse.json({ products: payload }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("public/products GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
