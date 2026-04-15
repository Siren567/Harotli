const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function readEnv(filePath) {
  const out = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function pickPrimary(items, preferredSlugs = []) {
  for (const slug of preferredSlugs) {
    const found = items.find((x) => x.slug === slug);
    if (found) return found;
  }
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
}

async function main() {
  const envPath = path.resolve(__dirname, "../admin-panel/.env.local");
  const env = readEnv(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase credentials in admin-panel/.env.local");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: categories, error } = await sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order");
  if (error) throw error;

  const all = categories || [];
  const roots = all.filter((c) => !c.parent_id);
  const children = all.filter((c) => !!c.parent_id);

  const rootPreferredByName = {
    שרשראות: ["necklaces"],
    צמידים: ["bracelets"],
    "מחזיקי מפתחות": ["keychains"],
    אחר: ["other"],
  };

  const rootGroups = new Map();
  for (const r of roots) {
    const keyName = normalizeName(r.name);
    const arr = rootGroups.get(keyName) || [];
    arr.push(r);
    rootGroups.set(keyName, arr);
  }

  const rootMergeMap = new Map(); // from -> to
  for (const [name, group] of rootGroups.entries()) {
    if (group.length < 2) continue;
    const keep = pickPrimary(group, rootPreferredByName[name] || []);
    for (const g of group) {
      if (g.id !== keep.id) rootMergeMap.set(g.id, keep.id);
    }
  }

  // Move products and children away from duplicate roots
  for (const [fromId, toId] of rootMergeMap.entries()) {
    await sb.from("products").update({ category_id: toId }).eq("category_id", fromId);
    await sb.from("products").update({ subcategory_id: toId }).eq("subcategory_id", fromId);
    await sb.from("categories").update({ parent_id: toId }).eq("parent_id", fromId);
  }

  // Refresh categories after root remap
  const { data: refreshed, error: refErr } = await sb
    .from("categories")
    .select("id,name,slug,parent_id,sort_order");
  if (refErr) throw refErr;

  const updatedChildren = (refreshed || []).filter((c) => !!c.parent_id);
  const childGroups = new Map();
  for (const c of updatedChildren) {
    const keyName = `${c.parent_id}::${normalizeName(c.name)}`;
    const arr = childGroups.get(keyName) || [];
    arr.push(c);
    childGroups.set(keyName, arr);
  }

  const childMergeMap = new Map(); // from -> to
  for (const group of childGroups.values()) {
    if (group.length < 2) continue;
    const keep = pickPrimary(group);
    for (const g of group) {
      if (g.id !== keep.id) childMergeMap.set(g.id, keep.id);
    }
  }

  for (const [fromId, toId] of childMergeMap.entries()) {
    await sb.from("products").update({ subcategory_id: toId }).eq("subcategory_id", fromId);
  }

  const deleteIds = [...rootMergeMap.keys(), ...childMergeMap.keys()];
  if (deleteIds.length > 0) {
    const { error: delErr } = await sb.from("categories").delete().in("id", deleteIds);
    if (delErr) throw delErr;
  }

  console.log(
    JSON.stringify(
      {
        rootsMerged: rootMergeMap.size,
        childrenMerged: childMergeMap.size,
        deletedCategories: deleteIds.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
