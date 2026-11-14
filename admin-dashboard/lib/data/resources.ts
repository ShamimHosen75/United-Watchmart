import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getResource, type ResourceDef } from "@/lib/resources";
import type { ResourceRecord } from "@/lib/types";

/** Demo-mode table for a module. Brands and categories share the arrays the rest of the admin uses. */
function demoRows(def: ResourceDef): ResourceRecord[] {
  if (def.table === "brands") return demo.brands as unknown as ResourceRecord[];
  if (def.table === "collections") return demo.collections as unknown as ResourceRecord[];
  return (demo.records[def.table] ??= []);
}

/** Postgres numeric columns arrive as strings from PostgREST. */
function normalise(def: ResourceDef, row: ResourceRecord): ResourceRecord {
  const out = { ...row };
  for (const f of def.fields) {
    if ((f.type === "money" || f.type === "number") && out[f.name] != null) out[f.name] = Number(out[f.name]);
  }
  return out;
}

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export async function listRecords(def: ResourceDef, q?: string, status?: string): Promise<ResourceRecord[]> {
  let rows: ResourceRecord[];
  if (isDemoMode) rows = demoRows(def).map((r) => ({ ...r }));
  else {
    const supabase = await createClient();
    const { data, error } = await supabase.from(def.table).select("*").limit(2000);
    if (error) throw new Error(error.message);
    rows = (data as ResourceRecord[]).map((r) => normalise(def, r));
  }
  const needle = q?.toLowerCase().trim();
  return rows
    .filter((r) => !status || !def.statusField || r[def.statusField] === status)
    .filter((r) => !needle || def.searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(needle)))
    .sort((a, b) => {
      const c = compare(a[def.sort.field], b[def.sort.field]);
      return (def.sort.ascending ? c : -c) || compare(a[def.titleField], b[def.titleField]);
    });
}

export async function getRecord(def: ResourceDef, id: string): Promise<ResourceRecord | null> {
  if (isDemoMode) return demoRows(def).find((r) => r.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from(def.table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalise(def, data as ResourceRecord) : null;
}

const UNIQUE: Record<string, string[]> = {
  brands: ["name", "slug"], collections: ["name", "slug"], coupons: ["code"], tryon_settings: ["product_id"],
};

export async function saveRecord(def: ResourceDef, id: string | null, input: Record<string, unknown>): Promise<string> {
  const unique = UNIQUE[def.table] ?? [];
  if (isDemoMode) {
    const rows = demoRows(def);
    for (const col of unique) {
      const v = String(input[col] ?? "").toLowerCase();
      if (v && rows.some((r) => r.id !== id && String(r[col] ?? "").toLowerCase() === v))
        throw new Error(col === "product_id" ? "This watch already has a try-on set up." : `Another ${def.singular} already uses this ${col.replace("_", " ")}.`);
    }
    const now = new Date().toISOString();
    if (id) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error(`The ${def.singular} was not found.`);
      Object.assign(row, input, "updated_at" in row ? { updated_at: now } : {});
      return id;
    }
    const newId = crypto.randomUUID();
    rows.push({ ...input, id: newId, created_at: now, updated_at: now });
    return newId;
  }
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from(def.table).update(input).eq("id", id).select("id").single()
    : await supabase.from(def.table).insert(input).select("id").single();
  if (error) {
    if (error.code === "23505") throw new Error(`Another ${def.singular} already uses one of these values (${unique.join(", ") || "unique field"}).`);
    if (error.code === "42501") throw new Error("Your role cannot change this.");
    throw new Error(error.message);
  }
  return (data as { id: string }).id;
}

export async function deleteRecord(def: ResourceDef, id: string): Promise<void> {
  if (isDemoMode) {
    if (def.table === "brands" && demo.products.some((p) => p.brand_id === id)) throw new Error("Watches still use this brand. Move them to another brand first.");
    if (def.table === "collections" && demo.products.some((p) => p.collection_id === id)) throw new Error("Watches are still in this category. Move them first.");
    if (def.table === "shipping_zones" && (demo.records.shipping_methods ?? []).some((m) => m.zone_id === id)) throw new Error("Delete this zone's shipping methods first.");
    const rows = demoRows(def);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from(def.table).delete().eq("id", id);
  if (error) {
    if (error.code === "23503" || error.message.includes("Still used")) throw new Error(`Other records still use this ${def.singular}.`);
    if (error.code === "42501") throw new Error("Your role cannot delete this.");
    throw new Error(error.message);
  }
}

/** Options for relation fields: value + label. */
export async function relationOptions(relation: string, key: "id" | "slug" = "id"): Promise<{ value: string; label: string }[]> {
  if (relation === "products") {
    const rows = isDemoMode
      ? demo.products
      : ((await (await createClient()).from("products").select("id,slug,name,ref_number").order("name")).data ?? []) as { id: string; slug: string; name: string; ref_number: string }[];
    return rows.map((p) => ({ value: key === "slug" ? p.slug : p.id, label: `${p.name} · ${p.ref_number}` })).sort((a, b) => a.label.localeCompare(b.label));
  }
  const def = getResource(relation);
  if (!def) return [];
  return (await listRecords(def)).map((r) => ({ value: String(r[key]), label: String(r[def.titleField] ?? "") }));
}

/** Options for every relation field of a module, keyed by field name. */
export async function optionsFor(def: ResourceDef): Promise<Record<string, { value: string; label: string }[]>> {
  const rel = def.fields.filter((f) => f.type === "relation" && f.relation);
  const lists = await Promise.all(rel.map((f) => relationOptions(f.relation!, f.relationKey)));
  return Object.fromEntries(rel.map((f, i) => [f.name, lists[i]]));
}

/** Count of watches per brand or category, and units in stock per brand. */
export async function catalogueCounts(): Promise<{ products: Record<string, number>; inStock: Record<string, number> }> {
  let products: { id: string; brand_id: string | null; collection_id: string | null }[];
  let stock: { product_id: string }[];
  if (isDemoMode) {
    products = demo.products;
    stock = demo.stock.filter((s) => s.status === "in_stock");
  } else {
    const supabase = await createClient();
    const [p, s] = await Promise.all([
      supabase.from("products").select("id,brand_id,collection_id"),
      supabase.from("stock_items").select("product_id").eq("status", "in_stock"),
    ]);
    if (p.error) throw new Error(p.error.message);
    if (s.error) throw new Error(s.error.message);
    products = p.data as typeof products;
    stock = s.data as typeof stock;
  }
  const counts: Record<string, number> = {};
  const inStock: Record<string, number> = {};
  const unitsByProduct = new Map<string, number>();
  for (const s of stock) unitsByProduct.set(s.product_id, (unitsByProduct.get(s.product_id) ?? 0) + 1);
  for (const p of products) {
    for (const k of [p.brand_id, p.collection_id]) if (k) {
      counts[k] = (counts[k] ?? 0) + 1;
      inStock[k] = (inStock[k] ?? 0) + (unitsByProduct.get(p.id) ?? 0);
    }
  }
  return { products: counts, inStock };
}
