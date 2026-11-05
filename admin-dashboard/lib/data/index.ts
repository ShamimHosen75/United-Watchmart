import "server-only";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import type {
  Branch, Brand, Collection, Customer, ItemCondition, Order, Product, ProductRow, ProductStatus, Profile, Repair,
  StockMovement, StockRow, StockStatus, StrapType, ViewingRequest,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Session and branch scope                                            */
/* ------------------------------------------------------------------ */

export async function getCurrentUser(): Promise<Profile | null> {
  if (isDemoMode) return demo.staff[0];
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  return (data as Profile | null) ?? null;
}

/** The branch picked in the top bar ("all" or a branch id). */
export async function getBranchScope(): Promise<string> {
  return (await cookies()).get("branch")?.value ?? "all";
}

/** Postgres numeric columns arrive as strings from PostgREST. */
export const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
function normProduct(p: Product): Product {
  return {
    ...p, price: Number(p.price), cost_price: Number(p.cost_price), compare_at_price: num(p.compare_at_price),
    case_mm: num(p.case_mm),
  };
}

export const inScope = (scope: string, branchId: string | null) => scope === "all" || branchId === scope;

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

export async function listBranches(): Promise<Branch[]> {
  if (isDemoMode) return demo.branches;
  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("*").order("name");
  if (error) throw error;
  return data as Branch[];
}

export async function listBrands(): Promise<Brand[]> {
  if (isDemoMode) return demo.brands;
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("id,name,slug").order("name");
  if (error) throw error;
  return data as Brand[];
}

export async function listCollections(): Promise<Collection[]> {
  if (isDemoMode) return demo.collections;
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("id,name,slug").order("name");
  if (error) throw error;
  return data as Collection[];
}

/* ------------------------------------------------------------------ */
/* Watches (products)                                                  */
/* ------------------------------------------------------------------ */

export interface ProductFilters {
  q?: string;
  status?: ProductStatus | "";
  collection?: string;
  strap?: StrapType | "";
}

export function matchesQuery(q: string | undefined, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductRow[]> {
  const scope = await getBranchScope();
  let products: Product[];
  let stock: { product_id: string; branch_id: string; status: StockStatus }[];
  let brands: Brand[];
  let collections: Collection[];

  if (isDemoMode) {
    ({ products, stock, brands, collections } = demo);
  } else {
    const supabase = await createClient();
    let query = supabase.from("products").select("*").order("name");
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.collection) query = query.eq("collection_id", filters.collection);
    if (filters.strap) query = query.eq("strap", filters.strap);
    if (filters.q) {
      const q = filters.q.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${q}%,ref_number.ilike.%${q}%,sku.ilike.%${q}%`);
    }
    const [p, s, b, c] = await Promise.all([
      query,
      supabase.from("stock_items").select("product_id,branch_id,status").in("status", ["in_stock", "reserved"]),
      listBrands(),
      listCollections(),
    ]);
    if (p.error) throw p.error;
    if (s.error) throw s.error;
    products = (p.data as Product[]).map(normProduct);
    stock = s.data as typeof stock;
    brands = b;
    collections = c;
  }

  return products
    .filter((p) => !filters.status || p.status === filters.status)
    .filter((p) => !filters.collection || p.collection_id === filters.collection)
    .filter((p) => !filters.strap || p.strap === filters.strap)
    .filter((p) => matchesQuery(filters.q, p.name, p.ref_number, p.sku))
    .map((p) => {
      const units = stock.filter((s) => s.product_id === p.id && inScope(scope, s.branch_id));
      return {
        ...p,
        brand_name: brands.find((b) => b.id === p.brand_id)?.name ?? null,
        collection_name: collections.find((c) => c.id === p.collection_id)?.name ?? null,
        in_stock: units.filter((s) => s.status === "in_stock").length,
        reserved: units.filter((s) => s.status === "reserved").length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProduct(id: string): Promise<Product | null> {
  if (isDemoMode) return demo.products.find((p) => p.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normProduct(data as Product) : null;
}

export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at">;

export async function saveProduct(id: string | null, input: ProductInput): Promise<string> {
  if (isDemoMode) {
    const clash = demo.products.find((p) => p.id !== id && (p.sku === input.sku || p.slug === input.slug));
    if (clash) throw new Error(clash.sku === input.sku ? "SKU is already used by another watch." : "Slug is already used by another watch.");
    const now = new Date().toISOString();
    if (id) {
      const p = demo.products.find((x) => x.id === id);
      if (!p) throw new Error("Watch not found.");
      Object.assign(p, input, { updated_at: now });
      return id;
    }
    const newId = crypto.randomUUID();
    demo.products.push({ ...input, id: newId, created_at: now, updated_at: now });
    return newId;
  }
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("products").update(input).eq("id", id).select("id").single()
    : await supabase.from("products").insert(input).select("id").single();
  if (error) {
    if (error.code === "23505") throw new Error("SKU or slug is already used by another watch.");
    if (error.code === "42501") throw new Error("Your role cannot edit the catalogue.");
    throw new Error(error.message);
  }
  return (data as { id: string }).id;
}

/* ------------------------------------------------------------------ */
/* Inventory (serialised stock)                                        */
/* ------------------------------------------------------------------ */

export interface StockFilters {
  q?: string;
  status?: StockStatus | "" | "available";
  product?: string;
  branch?: string; // overrides the top-bar scope when set
}

export async function listStock(filters: StockFilters = {}): Promise<StockRow[]> {
  const scope = filters.branch || (await getBranchScope());
  let rows: StockRow[];

  if (isDemoMode) {
    rows = demo.stock.map((s) => {
      const p = demo.products.find((x) => x.id === s.product_id)!;
      return {
        ...s, product_name: p.name, ref_number: p.ref_number, price: p.price,
        branch_name: demo.branches.find((b) => b.id === s.branch_id)?.name ?? "",
      };
    });
  } else {
    const supabase = await createClient();
    let query = supabase
      .from("stock_items")
      .select("*, products!inner(name,ref_number,price), branches!inner(name)")
      .order("received_at", { ascending: false })
      .limit(1000);
    if (scope !== "all") query = query.eq("branch_id", scope);
    if (filters.product) query = query.eq("product_id", filters.product);
    const { data, error } = await query;
    if (error) throw error;
    type Joined = StockRow & { products: { name: string; ref_number: string; price: number }; branches: { name: string } };
    rows = (data as Joined[]).map(({ products, branches, ...s }) => ({
      ...s, cost_price: num(s.cost_price), product_name: products.name, ref_number: products.ref_number,
      price: Number(products.price), branch_name: branches.name,
    }));
  }

  return rows
    .filter((s) => inScope(scope, s.branch_id))
    .filter((s) => !filters.product || s.product_id === filters.product)
    .filter((s) =>
      !filters.status ? true
        : filters.status === "available" ? s.status === "in_stock" || s.status === "reserved"
        : s.status === filters.status)
    .filter((s) => matchesQuery(filters.q, s.serial_number, s.product_name, s.ref_number, s.location_note))
    .sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export async function getStockItem(id: string): Promise<{ item: StockRow; movements: StockMovement[] } | null> {
  if (isDemoMode) {
    const item = (await listStock({ branch: "all" })).find((s) => s.id === id);
    if (!item) return null;
    const movements = demo.movements
      .filter((m) => m.stock_item_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { item, movements };
  }
  const supabase = await createClient();
  const [{ data: rows, error }, { data: moves, error: mErr }] = await Promise.all([
    supabase.from("stock_items").select("*, products!inner(name,ref_number,price), branches!inner(name)").eq("id", id).limit(1),
    supabase.from("stock_movements").select("*").eq("stock_item_id", id).order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  if (mErr) throw mErr;
  const row = rows?.[0] as (StockRow & { products: { name: string; ref_number: string; price: number }; branches: { name: string } }) | undefined;
  if (!row) return null;
  const { products, branches, ...s } = row;
  return {
    item: { ...s, product_name: products.name, ref_number: products.ref_number, price: Number(products.price), branch_name: branches.name },
    movements: moves as StockMovement[],
  };
}

export interface StockInput {
  product_id: string;
  branch_id: string;
  serial_number: string;
  condition: ItemCondition;
  cost_price: number | null;
  has_box: boolean;
  has_papers: boolean;
  location_note: string | null;
  notes: string | null;
}

export async function addStockItem(input: StockInput): Promise<string> {
  if (input.cost_price === null) input = { ...input, cost_price: (await getProduct(input.product_id))?.cost_price ?? null };
  if (isDemoMode) {
    if (demo.stock.some((s) => s.serial_number.toLowerCase() === input.serial_number.toLowerCase()))
      throw new Error("A watch with this serial number already exists.");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    demo.stock.push({ ...input, id, status: "in_stock", received_at: now, sold_at: null });
    demo.movements.push({
      id: crypto.randomUUID(), stock_item_id: id, reason: "adjustment", from_branch_id: null, to_branch_id: input.branch_id,
      from_status: null, to_status: "in_stock", note: "Added manually", created_at: now,
    });
    return id;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("stock_items").insert(input).select("id").single();
  if (error) {
    if (error.code === "23505") throw new Error("A watch with this serial number already exists.");
    throw new Error(error.message);
  }
  return (data as { id: string }).id;
}

export interface StockUpdate {
  status: StockStatus;
  branch_id: string;
  location_note: string | null;
  notes: string | null;
}

export async function updateStockItem(id: string, input: StockUpdate, note?: string): Promise<void> {
  if (isDemoMode) {
    const s = demo.stock.find((x) => x.id === id);
    if (!s) throw new Error("Watch not found.");
    if (s.status !== input.status || s.branch_id !== input.branch_id) {
      demo.movements.push({
        id: crypto.randomUUID(), stock_item_id: id,
        reason: s.branch_id !== input.branch_id ? "transfer_in" : input.status === "sold" ? "sale" : "adjustment",
        from_branch_id: s.branch_id, to_branch_id: input.branch_id, from_status: s.status, to_status: input.status,
        note: note ?? null, created_at: new Date().toISOString(),
      });
    }
    Object.assign(s, input);
    if (input.status === "sold" && !s.sold_at) s.sold_at = new Date().toISOString();
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("stock_items").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  salesToday: number;
  ordersToday: number;
  salesMonth: number;
  salesPrevMonth: number;
  ordersMonth: number;
  avgOrder: number;
  unitsInStock: number;
  stockRetailValue: number;
  stockCostValue: number;
  openViewings: number;
  activeRepairs: number;
  salesByDay: { date: string; total: number; orders: number }[];
  salesByCollection: { name: string; total: number }[];
  recentOrders: (Order & { customer_name: string | null; product_name: string | null })[];
  lowStock: { id: string; name: string; ref_number: string; in_stock: number }[];
  upcomingViewings: (ViewingRequest & { product_name: string | null; branch_name: string | null })[];
  repairsDue: (Repair & { customer_name: string | null })[];
}

const DAY = 86_400_000;
const PAID: Order["status"][] = ["paid", "completed"];

export async function getDashboard(): Promise<DashboardData> {
  const scope = await getBranchScope();
  const since = new Date(Date.now() - 60 * DAY).toISOString();

  let orders: Order[];
  let items: { order_id: string; product_id: string }[];
  let products: Product[];
  let collections: Collection[];
  let stock: { product_id: string; branch_id: string; status: StockStatus; cost_price: number | null }[];
  let customers: Pick<Customer, "id" | "full_name">[];
  let viewings: ViewingRequest[];
  let repairs: Repair[];
  let branches: Branch[];
  let threshold = 1;

  if (isDemoMode) {
    orders = demo.orders.filter((o) => o.placed_at >= since);
    ({ products, collections, stock, customers, viewings, repairs, branches } = demo);
    items = demo.orderItems;
    threshold = demo.settings.low_stock_threshold;
  } else {
    const supabase = await createClient();
    const res = await Promise.all([
      supabase.from("orders").select("*").gte("placed_at", since),
      supabase.from("order_items").select("order_id,product_id, orders!inner(placed_at)").gte("orders.placed_at", since),
      supabase.from("products").select("*"),
      supabase.from("collections").select("id,name,slug"),
      supabase.from("stock_items").select("product_id,branch_id,status,cost_price").in("status", ["in_stock", "reserved"]),
      supabase.from("viewing_requests").select("*").in("status", ["new", "confirmed"]).order("preferred_at"),
      supabase.from("repairs").select("*").not("status", "in", "(collected,cancelled)").order("promised_at"),
      supabase.from("branches").select("*"),
      supabase.from("store_settings").select("low_stock_threshold").eq("id", 1).maybeSingle(),
    ]);
    const failed = res.find((r) => r.error);
    if (failed?.error) throw failed.error;
    orders = (res[0].data as Order[]).map((o) => ({ ...o, total: Number(o.total) }));
    items = res[1].data as typeof items;
    products = (res[2].data as Product[]).map(normProduct);
    collections = res[3].data as Collection[];
    stock = res[4].data as typeof stock;
    viewings = res[5].data as ViewingRequest[];
    repairs = res[6].data as Repair[];
    branches = res[7].data as Branch[];
    threshold = (res[8].data as { low_stock_threshold: number } | null)?.low_stock_threshold ?? 1;
    const ids = [...new Set([...orders.map((o) => o.customer_id), ...repairs.map((r) => r.customer_id)].filter(Boolean))] as string[];
    const { data: cust } = ids.length
      ? await supabase.from("customers").select("id,full_name").in("id", ids)
      : { data: [] };
    customers = (cust ?? []) as typeof customers;
  }

  const scoped = orders.filter((o) => inScope(scope, o.branch_id) && PAID.includes(o.status));
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const now = Date.now();
  const sum = (list: Order[]) => list.reduce((t, o) => t + o.total, 0);
  const between = (from: number, to: number) => scoped.filter((o) => { const t = Date.parse(o.placed_at); return t >= from && t < to; });

  const today = between(startToday.getTime(), now + 1);
  const month = between(now - 30 * DAY, now + 1);
  const prevMonth = between(now - 60 * DAY, now - 30 * DAY);

  const salesByDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(startToday.getTime() - (29 - i) * DAY);
    const list = between(d.getTime(), d.getTime() + DAY);
    return { date: d.toISOString().slice(0, 10), total: sum(list), orders: list.length };
  });

  const productById = new Map(products.map((p) => [p.id, p]));
  const monthIds = new Set(month.map((o) => o.id));
  const byCollection = new Map<string, number>();
  for (const it of items) {
    if (!monthIds.has(it.order_id)) continue;
    const order = month.find((o) => o.id === it.order_id)!;
    const p = productById.get(it.product_id);
    const name = collections.find((c) => c.id === p?.collection_id)?.name ?? "Other";
    byCollection.set(name, (byCollection.get(name) ?? 0) + order.total);
  }

  const scopedStock = stock.filter((s) => inScope(scope, s.branch_id) && s.status === "in_stock");
  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.full_name ?? null;

  const lowStock = products
    .filter((p) => p.status === "active")
    .map((p) => ({ id: p.id, name: p.name, ref_number: p.ref_number, in_stock: scopedStock.filter((s) => s.product_id === p.id).length }))
    .filter((p) => p.in_stock <= threshold)
    .sort((a, b) => a.in_stock - b.in_stock);

  return {
    salesToday: sum(today),
    ordersToday: today.length,
    salesMonth: sum(month),
    salesPrevMonth: sum(prevMonth),
    ordersMonth: month.length,
    avgOrder: month.length ? sum(month) / month.length : 0,
    unitsInStock: scopedStock.length,
    stockRetailValue: scopedStock.reduce((t, s) => t + (productById.get(s.product_id)?.price ?? 0), 0),
    stockCostValue: scopedStock.reduce((t, s) => t + Number(s.cost_price ?? productById.get(s.product_id)?.cost_price ?? 0), 0),
    openViewings: viewings.filter((v) => inScope(scope, v.branch_id) && (v.status === "new" || v.status === "confirmed")).length,
    activeRepairs: repairs.filter((r) => inScope(scope, r.branch_id) && !["collected", "cancelled"].includes(r.status)).length,
    salesByDay,
    salesByCollection: [...byCollection].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    recentOrders: [...scoped]
      .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
      .slice(0, 6)
      .map((o) => {
        const it = items.find((i) => i.order_id === o.id);
        return { ...o, customer_name: customerName(o.customer_id), product_name: it ? productById.get(it.product_id)?.name ?? null : null };
      }),
    lowStock: lowStock.slice(0, 6),
    upcomingViewings: viewings
      .filter((v) => inScope(scope, v.branch_id) && (v.status === "new" || v.status === "confirmed"))
      .sort((a, b) => (a.preferred_at ?? "").localeCompare(b.preferred_at ?? ""))
      .slice(0, 5)
      .map((v) => ({
        ...v,
        product_name: v.product_id ? productById.get(v.product_id)?.name ?? null : null,
        branch_name: branches.find((b) => b.id === v.branch_id)?.name ?? null,
      })),
    repairsDue: repairs
      .filter((r) => inScope(scope, r.branch_id) && !["collected", "cancelled"].includes(r.status))
      .sort((a, b) => (a.promised_at ?? "").localeCompare(b.promised_at ?? ""))
      .slice(0, 5)
      .map((r) => ({ ...r, customer_name: customerName(r.customer_id) })),
  };
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export async function listStaff(): Promise<Profile[]> {
  if (isDemoMode) return demo.staff.filter((s) => s.is_active);
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("is_active", true).order("full_name");
  if (error) throw error;
  return data as Profile[];
}
