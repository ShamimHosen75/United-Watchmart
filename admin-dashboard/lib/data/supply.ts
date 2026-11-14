import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getBranchScope, inScope, listBranches, listProducts, listStock, matchesQuery } from "./index";
import type { ItemCondition, Purchase, PurchaseItem, PurchaseStatus, StockRow, Supplier, Transfer, TransferStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

export interface SupplierRow extends Supplier {
  purchases: number;
  spent: number;
  open_orders: number;
  last_order: string | null;
}

const normPurchase = (p: Purchase): Purchase => ({ ...p, shipping_cost: Number(p.shipping_cost), total: Number(p.total) });

async function allPurchases(): Promise<Purchase[]> {
  if (isDemoMode) return demo.purchases;
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) throw error;
  return (data as Purchase[]).map(normPurchase);
}

export async function listSuppliers(q?: string): Promise<SupplierRow[]> {
  let suppliers: Supplier[];
  if (isDemoMode) suppliers = demo.suppliers;
  else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) throw error;
    suppliers = data as Supplier[];
  }
  const purchases = await allPurchases();
  return suppliers
    .filter((s) => matchesQuery(q, s.name, s.contact_name, s.email, s.country))
    .map((s) => {
      const mine = purchases.filter((p) => p.supplier_id === s.id && p.status !== "cancelled" && p.status !== "draft");
      return {
        ...s,
        purchases: mine.length,
        spent: mine.reduce((t, p) => t + p.total, 0),
        open_orders: mine.filter((p) => p.status === "ordered" || p.status === "partially_received").length,
        last_order: mine.map((p) => p.ordered_at ?? p.created_at).sort().at(-1) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  if (isDemoMode) return demo.suppliers.find((s) => s.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Supplier | null;
}

export type SupplierInput = Omit<Supplier, "id" | "created_at">;

export async function saveSupplier(id: string | null, input: SupplierInput): Promise<string> {
  if (isDemoMode) {
    if (id) {
      const s = demo.suppliers.find((x) => x.id === id);
      if (!s) throw new Error("Supplier not found.");
      Object.assign(s, input);
      return id;
    }
    const newId = crypto.randomUUID();
    demo.suppliers.push({ ...input, id: newId, created_at: new Date().toISOString() });
    return newId;
  }
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("suppliers").update(input).eq("id", id).select("id").single()
    : await supabase.from("suppliers").insert(input).select("id").single();
  if (error) throw new Error(error.code === "42501" ? "Only a manager can edit suppliers." : error.message);
  return (data as { id: string }).id;
}

/* ------------------------------------------------------------------ */
/* Purchases                                                           */
/* ------------------------------------------------------------------ */

export interface PurchaseRow extends Purchase {
  supplier_name: string;
  branch_name: string;
  ordered_qty: number;
  received_qty: number;
}

export interface PurchaseDetail extends PurchaseRow {
  items: (PurchaseItem & { product_name: string; ref_number: string; landed_cost: number })[];
  received: StockRow[];
}

export async function listPurchases(filters: { q?: string; status?: PurchaseStatus | ""; supplier?: string } = {}): Promise<PurchaseRow[]> {
  const scope = await getBranchScope();
  const [purchases, suppliers, branches] = await Promise.all([allPurchases(), listSuppliersRaw(), listBranches()]);
  let items: PurchaseItem[];
  if (isDemoMode) items = demo.purchaseItems;
  else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("purchase_items").select("*");
    if (error) throw error;
    items = data as PurchaseItem[];
  }
  return purchases
    .filter((p) => inScope(scope, p.branch_id))
    .filter((p) => !filters.status || p.status === filters.status)
    .filter((p) => !filters.supplier || p.supplier_id === filters.supplier)
    .map((p) => {
      const mine = items.filter((i) => i.purchase_id === p.id);
      return {
        ...p,
        supplier_name: suppliers.find((s) => s.id === p.supplier_id)?.name ?? "",
        branch_name: branches.find((b) => b.id === p.branch_id)?.name ?? "",
        ordered_qty: mine.reduce((t, i) => t + i.quantity, 0),
        received_qty: mine.reduce((t, i) => t + i.received_qty, 0),
      };
    })
    .filter((p) => matchesQuery(filters.q, p.number, p.supplier_name))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function listSuppliersRaw(): Promise<Supplier[]> {
  if (isDemoMode) return demo.suppliers;
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*");
  return (data ?? []) as Supplier[];
}

export async function getPurchase(id: string): Promise<PurchaseDetail | null> {
  let purchase: Purchase | undefined;
  let items: PurchaseItem[];
  if (isDemoMode) {
    purchase = demo.purchases.find((p) => p.id === id);
    items = demo.purchaseItems.filter((i) => i.purchase_id === id);
  } else {
    const supabase = await createClient();
    const [p, i] = await Promise.all([
      supabase.from("purchases").select("*").eq("id", id).maybeSingle(),
      supabase.from("purchase_items").select("*").eq("purchase_id", id),
    ]);
    if (p.error) throw p.error;
    if (i.error) throw i.error;
    purchase = p.data ? normPurchase(p.data as Purchase) : undefined;
    items = (i.data as PurchaseItem[]).map((x) => ({ ...x, unit_cost: Number(x.unit_cost) }));
  }
  if (!purchase) return null;
  const [products, suppliers, branches, stock] = await Promise.all([
    listProducts(), listSuppliersRaw(), listBranches(), listStock({ branch: "all" }),
  ]);
  const goods = items.reduce((t, i) => t + i.quantity * i.unit_cost, 0);
  return {
    ...purchase,
    supplier_name: suppliers.find((s) => s.id === purchase.supplier_id)?.name ?? "",
    branch_name: branches.find((b) => b.id === purchase.branch_id)?.name ?? "",
    ordered_qty: items.reduce((t, i) => t + i.quantity, 0),
    received_qty: items.reduce((t, i) => t + i.received_qty, 0),
    items: items.map((i) => {
      const p = products.find((x) => x.id === i.product_id);
      const share = goods > 0 ? Math.round((purchase.shipping_cost * i.unit_cost / goods) * 100) / 100 : 0;
      return { ...i, product_name: p?.name ?? "", ref_number: p?.ref_number ?? "", landed_cost: i.unit_cost + share };
    }),
    received: isDemoMode
      ? stock.filter((s) => demoPurchaseOf.get(s.id) === id)
      : await stockForPurchase(id),
  };
}

async function stockForPurchase(id: string): Promise<StockRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("stock_items").select("id").eq("purchase_id", id);
  const ids = new Set(((data ?? []) as { id: string }[]).map((x) => x.id));
  return (await listStock({ branch: "all" })).filter((s) => ids.has(s.id));
}

/** Demo only: which purchase each received stock item came from. */
const g = globalThis as unknown as { __watchmartDemoPurchaseOf?: Map<string, string> };
const demoPurchaseOf = (g.__watchmartDemoPurchaseOf ??= new Map());

export interface PurchaseInput {
  id: string | null;
  supplier_id: string;
  branch_id: string;
  status: "draft" | "ordered";
  ordered_at: string | null;
  expected_at: string | null;
  shipping_cost: number;
  notes: string | null;
  items: { product_id: string; quantity: number; unit_cost: number }[];
}

export async function savePurchase(input: PurchaseInput): Promise<string> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_purchase", { p: input });
    if (error) throw new Error(error.message);
    return data as string;
  }
  if (!input.items.length) throw new Error("Add at least one watch");
  const total = input.shipping_cost + input.items.reduce((t, i) => t + i.quantity * i.unit_cost, 0);
  let id = input.id;
  if (id) {
    const p = demo.purchases.find((x) => x.id === id);
    if (!p) throw new Error("Purchase not found");
    if (p.status !== "draft" && p.status !== "ordered") throw new Error("Only draft or ordered purchases can be edited");
    if (demo.purchaseItems.some((i) => i.purchase_id === id && i.received_qty > 0)) throw new Error("Watches were already received on this order");
    Object.assign(p, { ...input, id, total });
    demo.purchaseItems = demo.purchaseItems.filter((i) => i.purchase_id !== id);
  } else {
    id = crypto.randomUUID();
    demo.counters.purchase += 1;
    demo.purchases.push({
      id, number: `PO-${String(demo.counters.purchase).padStart(6, "0")}`, supplier_id: input.supplier_id, branch_id: input.branch_id,
      status: input.status, ordered_at: input.ordered_at, expected_at: input.expected_at, received_at: null,
      shipping_cost: input.shipping_cost, total, notes: input.notes, created_at: new Date().toISOString(),
    });
  }
  for (const it of input.items) demo.purchaseItems.push({ id: crypto.randomUUID(), purchase_id: id, received_qty: 0, ...it });
  return id;
}

export async function setPurchaseStatus(id: string, status: "ordered" | "cancelled"): Promise<void> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const patch = status === "ordered" ? { status, ordered_at: new Date().toISOString().slice(0, 10) } : { status };
    const allowed = status === "ordered" ? ["draft"] : ["draft", "ordered"];
    const { data, error } = await supabase.from("purchases").update(patch).eq("id", id).in("status", allowed).select("id");
    if (error) throw new Error(error.code === "42501" ? "Only a manager can change purchases." : error.message);
    if (!data?.length) throw new Error("This purchase can no longer be changed that way.");
    return;
  }
  const p = demo.purchases.find((x) => x.id === id);
  if (!p) throw new Error("Purchase not found");
  if (status === "ordered" && p.status !== "draft") throw new Error("Only a draft can be placed.");
  if (status === "cancelled" && !["draft", "ordered"].includes(p.status)) throw new Error("Received orders cannot be cancelled.");
  p.status = status;
  if (status === "ordered") p.ordered_at = new Date().toISOString().slice(0, 10);
}

export interface ReceiveInput {
  lines: { purchase_item_id: string; serials: string[] }[];
  condition: ItemCondition;
  has_box: boolean;
  has_papers: boolean;
  location_note: string;
}

export async function receivePurchase(id: string, input: ReceiveInput): Promise<number> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("receive_purchase", { p_purchase: id, p: input });
    if (error) throw new Error(error.message);
    return data as number;
  }
  const po = demo.purchases.find((x) => x.id === id);
  if (!po) throw new Error("Purchase not found");
  if (po.status !== "ordered" && po.status !== "partially_received") throw new Error(`Place the order before receiving (status ${po.status})`);
  const items = demo.purchaseItems.filter((i) => i.purchase_id === id);
  const goods = items.reduce((t, i) => t + i.quantity * i.unit_cost, 0);
  const all = input.lines.flatMap((l) => l.serials);
  const seen = new Set<string>();
  for (const s of all) {
    const k = s.toLowerCase();
    if (seen.has(k) || demo.stock.some((x) => x.serial_number.toLowerCase() === k)) throw new Error(`Serial ${s} already exists`);
    seen.add(k);
  }
  let n = 0;
  const now = new Date().toISOString();
  for (const line of input.lines) {
    const pi = items.find((i) => i.id === line.purchase_item_id);
    if (!pi) throw new Error("Line not found");
    if (pi.received_qty + line.serials.length > pi.quantity) throw new Error("More watches than ordered on a line");
    const share = goods > 0 ? Math.round((po.shipping_cost * pi.unit_cost / goods) * 100) / 100 : 0;
    for (const serial of line.serials) {
      const sid = crypto.randomUUID();
      demo.stock.push({
        id: sid, product_id: pi.product_id, branch_id: po.branch_id, serial_number: serial, status: "in_stock",
        condition: input.condition, cost_price: pi.unit_cost + share, has_box: input.has_box, has_papers: input.has_papers,
        location_note: input.location_note || null, received_at: now, sold_at: null, notes: null,
      });
      demo.movements.push({
        id: crypto.randomUUID(), stock_item_id: sid, reason: "purchase", from_branch_id: null, to_branch_id: po.branch_id,
        from_status: null, to_status: "in_stock", note: po.number, created_at: now,
      });
      demoPurchaseOf.set(sid, po.id);
      n++;
    }
    pi.received_qty += line.serials.length;
  }
  const done = items.every((i) => i.received_qty >= i.quantity);
  po.status = done ? "received" : "partially_received";
  if (done) po.received_at = now;
  return n;
}

/* ------------------------------------------------------------------ */
/* Transfers                                                           */
/* ------------------------------------------------------------------ */

export interface TransferRow extends Transfer {
  from_name: string;
  to_name: string;
  pieces: StockRow[];
}

export async function listTransfers(filters: { status?: TransferStatus | "" } = {}): Promise<TransferRow[]> {
  const scope = await getBranchScope();
  return (await listTransfersUnscoped())
    .filter((t) => scope === "all" || t.from_branch_id === scope || t.to_branch_id === scope)
    .filter((t) => !filters.status || t.status === filters.status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getTransfer(id: string): Promise<TransferRow | null> {
  return (await listTransfersUnscoped()).find((t) => t.id === id) ?? null;
}

async function listTransfersUnscoped(): Promise<TransferRow[]> {
  let transfers: Transfer[];
  let links: { transfer_id: string; stock_item_id: string }[];
  if (isDemoMode) {
    transfers = demo.transfers;
    links = demo.transferItems;
  } else {
    const supabase = await createClient();
    const [t, l] = await Promise.all([
      supabase.from("stock_transfers").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("stock_transfer_items").select("*"),
    ]);
    if (t.error) throw t.error;
    if (l.error) throw l.error;
    transfers = t.data as Transfer[];
    links = l.data as typeof links;
  }
  const [stock, branches] = await Promise.all([listStock({ branch: "all" }), listBranches()]);
  return transfers.map((t) => {
    const ids = new Set(links.filter((l) => l.transfer_id === t.id).map((l) => l.stock_item_id));
    return {
      ...t,
      from_name: branches.find((b) => b.id === t.from_branch_id)?.name ?? "",
      to_name: branches.find((b) => b.id === t.to_branch_id)?.name ?? "",
      pieces: stock.filter((s) => ids.has(s.id)),
    };
  });
}

export async function createTransfer(input: { from_branch_id: string; to_branch_id: string; items: string[]; notes: string }): Promise<string> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_transfer", { p: input });
    if (error) throw new Error(error.message);
    return data as string;
  }
  if (input.from_branch_id === input.to_branch_id) throw new Error("Pick two different branches");
  if (!input.items.length) throw new Error("Pick at least one watch");
  const pieces = input.items.map((id) => {
    const s = demo.stock.find((x) => x.id === id);
    if (!s || s.branch_id !== input.from_branch_id || s.status !== "in_stock") throw new Error(`Serial ${s?.serial_number ?? id} is not in stock at the sending branch`);
    return s;
  });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  demo.counters.transfer += 1;
  const number = `TR-${String(demo.counters.transfer).padStart(6, "0")}`;
  demo.transfers.push({ id, number, from_branch_id: input.from_branch_id, to_branch_id: input.to_branch_id, status: "in_transit", shipped_at: now, received_at: null, notes: input.notes || null, created_at: now });
  for (const s of pieces) {
    demo.transferItems.push({ transfer_id: id, stock_item_id: s.id });
    demo.movements.push({ id: crypto.randomUUID(), stock_item_id: s.id, reason: "transfer_out", from_branch_id: s.branch_id, to_branch_id: s.branch_id, from_status: "in_stock", to_status: "in_transit", note: number, created_at: now });
    s.status = "in_transit";
  }
  return id;
}

export async function closeTransfer(id: string, receive: boolean): Promise<void> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("close_transfer", { p_transfer: id, p_receive: receive });
    if (error) throw new Error(error.message);
    return;
  }
  const t = demo.transfers.find((x) => x.id === id);
  if (!t) throw new Error("Transfer not found");
  if (t.status !== "in_transit") throw new Error(`This transfer is ${t.status}`);
  const now = new Date().toISOString();
  for (const link of demo.transferItems.filter((l) => l.transfer_id === id)) {
    const s = demo.stock.find((x) => x.id === link.stock_item_id);
    if (!s) continue;
    const to = receive ? t.to_branch_id : s.branch_id;
    demo.movements.push({ id: crypto.randomUUID(), stock_item_id: s.id, reason: receive ? "transfer_in" : "adjustment", from_branch_id: s.branch_id, to_branch_id: to, from_status: "in_transit", to_status: "in_stock", note: t.number, created_at: now });
    s.status = "in_stock";
    s.branch_id = to;
  }
  t.status = receive ? "received" : "cancelled";
  if (receive) t.received_at = now;
}
