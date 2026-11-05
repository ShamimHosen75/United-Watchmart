import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getBranchScope, inScope, matchesQuery } from "./index";
import { listOrders, type OrderRow } from "./sales";
import type { Customer, Repair, ViewingRequest, ViewingStatus, Warranty } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export interface CustomerRow extends Customer {
  orders: number;
  spent: number;
  last_purchase: string | null;
}

export async function listCustomers(filters: { q?: string; vip?: boolean } = {}): Promise<CustomerRow[]> {
  let customers: Customer[];
  let orders: { customer_id: string | null; total: number; status: string; placed_at: string }[];
  if (isDemoMode) {
    customers = demo.customers;
    orders = demo.orders;
  } else {
    const supabase = await createClient();
    let query = supabase.from("customers").select("*").order("full_name").limit(1000);
    if (filters.vip) query = query.eq("is_vip", true);
    if (filters.q) {
      const q = filters.q.replace(/[%,()]/g, " ");
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const [c, o] = await Promise.all([
      query,
      supabase.from("orders").select("customer_id,total,status,placed_at").not("customer_id", "is", null).in("status", ["pending", "paid", "completed"]),
    ]);
    if (c.error) throw c.error;
    if (o.error) throw o.error;
    customers = c.data as Customer[];
    orders = (o.data as typeof orders).map((x) => ({ ...x, total: Number(x.total) }));
  }
  const live = orders.filter((o) => ["pending", "paid", "completed"].includes(o.status));
  return customers
    .filter((c) => !filters.vip || c.is_vip)
    .filter((c) => matchesQuery(filters.q, c.full_name, c.email, c.phone, ...c.tags))
    .map((c) => {
      const mine = live.filter((o) => o.customer_id === c.id);
      return {
        ...c,
        orders: mine.length,
        spent: mine.reduce((t, o) => t + o.total, 0),
        last_purchase: mine.map((o) => o.placed_at).sort().at(-1) ?? null,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export interface OwnedWatch extends Warranty {
  product_name: string;
  ref_number: string;
  serial_number: string;
}

export interface CustomerProfile {
  customer: Customer;
  orders: OrderRow[];
  owned: OwnedWatch[];
  viewings: (ViewingRequest & { product_name: string | null })[];
  repairs: Repair[];
}

export async function getCustomer(id: string): Promise<CustomerProfile | null> {
  const orders = await listOrders({ customer: id, allBranches: true });
  if (isDemoMode) {
    const customer = demo.customers.find((c) => c.id === id);
    if (!customer) return null;
    return {
      customer,
      orders,
      owned: demo.warranties.filter((w) => w.customer_id === id).map((w) => {
        const s = demo.stock.find((x) => x.id === w.stock_item_id)!;
        const p = demo.products.find((x) => x.id === s.product_id)!;
        return { ...w, product_name: p.name, ref_number: p.ref_number, serial_number: s.serial_number };
      }),
      viewings: demo.viewings.filter((v) => v.customer_id === id).map((v) => ({
        ...v, product_name: demo.products.find((p) => p.id === v.product_id)?.name ?? null,
      })),
      repairs: demo.repairs.filter((r) => r.customer_id === id),
    };
  }
  const supabase = await createClient();
  const [c, w, v, r] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("warranties").select("*, stock_items!inner(serial_number, products!inner(name,ref_number))").eq("customer_id", id),
    supabase.from("viewing_requests").select("*, products(name)").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("repairs").select("*").eq("customer_id", id).order("received_at", { ascending: false }),
  ]);
  for (const res of [c, w, v, r]) if (res.error) throw res.error;
  if (!c.data) return null;
  type W = Warranty & { stock_items: { serial_number: string; products: { name: string; ref_number: string } } };
  type V = ViewingRequest & { products: { name: string } | null };
  return {
    customer: c.data as Customer,
    orders,
    owned: (w.data as W[]).map(({ stock_items, ...x }) => ({
      ...x, serial_number: stock_items.serial_number, product_name: stock_items.products.name, ref_number: stock_items.products.ref_number,
    })),
    viewings: (v.data as V[]).map(({ products, ...x }) => ({ ...x, product_name: products?.name ?? null })),
    repairs: r.data as Repair[],
  };
}

export type CustomerInput = Omit<Customer, "id" | "created_at">;

export async function saveCustomer(id: string | null, input: CustomerInput): Promise<string> {
  if (isDemoMode) {
    if (input.email && demo.customers.some((c) => c.id !== id && c.email?.toLowerCase() === input.email!.toLowerCase())) {
      throw new Error("Another client already uses this email.");
    }
    if (id) {
      const c = demo.customers.find((x) => x.id === id);
      if (!c) throw new Error("Client not found.");
      Object.assign(c, input);
      return id;
    }
    const newId = crypto.randomUUID();
    demo.customers.push({ ...input, id: newId, created_at: new Date().toISOString() });
    return newId;
  }
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("customers").update(input).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

/* ------------------------------------------------------------------ */
/* Viewing requests                                                    */
/* ------------------------------------------------------------------ */

export interface ViewingRow extends ViewingRequest {
  product_name: string | null;
  ref_number: string | null;
  branch_name: string | null;
  assigned_name: string | null;
  reserved_serial: string | null;
}

export async function listViewings(filters: { status?: ViewingStatus | "" | "open"; q?: string } = {}): Promise<ViewingRow[]> {
  const scope = await getBranchScope();
  let rows: ViewingRow[];
  if (isDemoMode) {
    rows = demo.viewings.map((v) => {
      const p = demo.products.find((x) => x.id === v.product_id);
      return {
        ...v, product_name: p?.name ?? null, ref_number: p?.ref_number ?? null,
        branch_name: demo.branches.find((b) => b.id === v.branch_id)?.name ?? null,
        assigned_name: demo.staff.find((s) => s.id === v.assigned_to)?.full_name ?? null,
        reserved_serial: demo.stock.find((s) => s.id === v.stock_item_id)?.serial_number ?? null,
      };
    });
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("viewing_requests")
      .select("*, products(name,ref_number), branches(name), profiles(full_name), stock_items(serial_number)")
      .order("preferred_at", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw error;
    type J = ViewingRequest & {
      products: { name: string; ref_number: string } | null; branches: { name: string } | null;
      profiles: { full_name: string } | null; stock_items: { serial_number: string } | null;
    };
    rows = (data as J[]).map(({ products, branches, profiles, stock_items, ...v }) => ({
      ...v, product_name: products?.name ?? null, ref_number: products?.ref_number ?? null, branch_name: branches?.name ?? null,
      assigned_name: profiles?.full_name ?? null, reserved_serial: stock_items?.serial_number ?? null,
    }));
  }
  return rows
    .filter((v) => scope === "all" || v.branch_id === null || inScope(scope, v.branch_id))
    .filter((v) => !filters.status ? true : filters.status === "open" ? v.status === "new" || v.status === "confirmed" : v.status === filters.status)
    .filter((v) => matchesQuery(filters.q, v.name, v.email, v.phone, v.product_name))
    .sort((a, b) => (a.preferred_at ?? "9").localeCompare(b.preferred_at ?? "9"));
}

export async function getViewing(id: string): Promise<ViewingRow | null> {
  if (isDemoMode) {
    const v = demo.viewings.find((x) => x.id === id);
    if (!v) return null;
    const p = demo.products.find((x) => x.id === v.product_id);
    return {
      ...v, product_name: p?.name ?? null, ref_number: p?.ref_number ?? null,
      branch_name: demo.branches.find((b) => b.id === v.branch_id)?.name ?? null,
      assigned_name: demo.staff.find((s) => s.id === v.assigned_to)?.full_name ?? null,
      reserved_serial: demo.stock.find((s) => s.id === v.stock_item_id)?.serial_number ?? null,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("viewing_requests")
    .select("*, products(name,ref_number), branches(name), profiles(full_name), stock_items(serial_number)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { products, branches, profiles, stock_items, ...v } = data as ViewingRequest & {
    products: { name: string; ref_number: string } | null; branches: { name: string } | null;
    profiles: { full_name: string } | null; stock_items: { serial_number: string } | null;
  };
  return {
    ...v, product_name: products?.name ?? null, ref_number: products?.ref_number ?? null, branch_name: branches?.name ?? null,
    assigned_name: profiles?.full_name ?? null, reserved_serial: stock_items?.serial_number ?? null,
  };
}

export interface ViewingInput {
  name: string;
  email: string;
  phone: string | null;
  product_id: string | null;
  branch_id: string | null;
  preferred_at: string | null;
  status: ViewingStatus;
  source: string;
  message: string | null;
  staff_notes: string | null;
  assigned_to: string | null;
  customer_id: string | null;
}

export async function saveViewing(id: string | null, input: Partial<ViewingInput>): Promise<string> {
  if (isDemoMode) {
    if (id) {
      const v = demo.viewings.find((x) => x.id === id);
      if (!v) throw new Error("Viewing not found.");
      Object.assign(v, input);
      // Releasing a reservation when the viewing ends without a sale
      if (input.status && ["cancelled", "no_show"].includes(input.status) && v.stock_item_id) {
        const s = demo.stock.find((x) => x.id === v.stock_item_id);
        if (s?.status === "reserved") s.status = "in_stock";
        v.stock_item_id = null;
      }
      return id;
    }
    const newId = crypto.randomUUID();
    demo.viewings.push({
      id: newId, customer_id: null, stock_item_id: null, assigned_to: null, source: "phone", message: null, staff_notes: null,
      name: "", email: "", phone: null, product_id: null, branch_id: null, preferred_at: null, status: "new",
      created_at: new Date().toISOString(), ...input,
    });
    return newId;
  }
  const supabase = await createClient();
  if (id && input.status && ["cancelled", "no_show"].includes(input.status)) {
    const { data: cur } = await supabase.from("viewing_requests").select("stock_item_id").eq("id", id).maybeSingle();
    const sid = (cur as { stock_item_id: string | null } | null)?.stock_item_id;
    if (sid) {
      await supabase.from("stock_items").update({ status: "in_stock" }).eq("id", sid).eq("status", "reserved");
      input = { ...input, ...{ stock_item_id: null } } as Partial<ViewingInput>;
    }
  }
  const { data, error } = id
    ? await supabase.from("viewing_requests").update(input).eq("id", id).select("id").single()
    : await supabase.from("viewing_requests").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

/** Holds one serial for the client until the viewing (status "reserved" in inventory). */
export async function reserveForViewing(id: string, stockItemId: string | null): Promise<void> {
  if (isDemoMode) {
    const v = demo.viewings.find((x) => x.id === id);
    if (!v) throw new Error("Viewing not found.");
    if (v.stock_item_id) {
      const old = demo.stock.find((x) => x.id === v.stock_item_id);
      if (old?.status === "reserved") old.status = "in_stock";
    }
    if (stockItemId) {
      const s = demo.stock.find((x) => x.id === stockItemId);
      if (!s || s.status !== "in_stock") throw new Error("That watch is not in stock.");
      s.status = "reserved";
      demo.movements.push({
        id: crypto.randomUUID(), stock_item_id: s.id, reason: "reservation", from_branch_id: s.branch_id, to_branch_id: s.branch_id,
        from_status: "in_stock", to_status: "reserved", note: `Viewing for ${v.name}`, created_at: new Date().toISOString(),
      });
    }
    v.stock_item_id = stockItemId;
    return;
  }
  const supabase = await createClient();
  const { data: cur } = await supabase.from("viewing_requests").select("stock_item_id").eq("id", id).maybeSingle();
  const old = (cur as { stock_item_id: string | null } | null)?.stock_item_id;
  if (old) await supabase.from("stock_items").update({ status: "in_stock" }).eq("id", old).eq("status", "reserved");
  if (stockItemId) {
    const { data, error } = await supabase.from("stock_items").update({ status: "reserved" }).eq("id", stockItemId).eq("status", "in_stock").select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("That watch is not in stock.");
  }
  const { error } = await supabase.from("viewing_requests").update({ stock_item_id: stockItemId }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Finds a client by email, or creates one from the viewing request, and links them. */
export async function linkViewingCustomer(id: string): Promise<string> {
  const v = await getViewing(id);
  if (!v) throw new Error("Viewing not found.");
  if (v.customer_id) return v.customer_id;
  let customerId: string | undefined;
  if (isDemoMode) {
    customerId = demo.customers.find((c) => c.email && c.email.toLowerCase() === v.email.toLowerCase())?.id;
  } else if (v.email) {
    const supabase = await createClient();
    const { data } = await supabase.from("customers").select("id").ilike("email", v.email).limit(1);
    customerId = (data as { id: string }[] | null)?.[0]?.id;
  }
  customerId ??= await saveCustomer(null, {
    full_name: v.name, email: v.email || null, phone: v.phone, address: null, city: null, country: null, birthday: null,
    wrist_size_mm: null, preferred_branch_id: v.branch_id, is_vip: false, marketing_opt_in: false, tags: [], notes: null,
  });
  await saveViewing(id, { customer_id: customerId });
  return customerId;
}

/* ------------------------------------------------------------------ */
/* Warranties                                                          */
/* ------------------------------------------------------------------ */

export interface WarrantyRow extends OwnedWatch {
  customer_name: string | null;
  order_number: string | null;
  state: "active" | "expired" | "void";
}

export async function listWarranties(filters: { q?: string; state?: WarrantyRow["state"] | "" } = {}): Promise<WarrantyRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const state = (w: Warranty): WarrantyRow["state"] => (w.status === "void" ? "void" : w.ends_on < today ? "expired" : "active");
  let rows: WarrantyRow[];
  if (isDemoMode) {
    rows = demo.warranties.map((w) => {
      const s = demo.stock.find((x) => x.id === w.stock_item_id)!;
      const p = demo.products.find((x) => x.id === s.product_id)!;
      return {
        ...w, product_name: p.name, ref_number: p.ref_number, serial_number: s.serial_number,
        customer_name: demo.customers.find((c) => c.id === w.customer_id)?.full_name ?? null,
        order_number: demo.orders.find((o) => o.id === w.order_id)?.number ?? null, state: state(w),
      };
    });
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warranties")
      .select("*, stock_items!inner(serial_number, products!inner(name,ref_number)), customers(full_name), orders(number)")
      .order("starts_on", { ascending: false })
      .limit(1000);
    if (error) throw error;
    type J = Warranty & {
      stock_items: { serial_number: string; products: { name: string; ref_number: string } };
      customers: { full_name: string } | null; orders: { number: string } | null;
    };
    rows = (data as J[]).map(({ stock_items, customers, orders, ...w }) => ({
      ...w, serial_number: stock_items.serial_number, product_name: stock_items.products.name,
      ref_number: stock_items.products.ref_number, customer_name: customers?.full_name ?? null,
      order_number: orders?.number ?? null, state: state(w),
    }));
  }
  return rows
    .filter((w) => !filters.state || w.state === filters.state)
    .filter((w) => matchesQuery(filters.q, w.card_number, w.serial_number, w.product_name, w.customer_name, w.order_number))
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on));
}
