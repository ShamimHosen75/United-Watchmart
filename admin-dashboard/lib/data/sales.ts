import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getBranchScope, getCurrentUser, inScope, listStock, matchesQuery } from "./index";
import type {
  Customer, Order, OrderChannel, OrderItem, OrderStatus, Payment, PaymentMethod, StockRow, Warranty,
} from "@/lib/types";

export interface OrderRow extends Order {
  customer_name: string | null;
  branch_name: string;
  staff_name: string | null;
  items_label: string;
}

export interface OrderDetail extends OrderRow {
  customer: Customer | null;
  items: (OrderItem & { product_name: string; ref_number: string; serial_number: string | null })[];
  payments: Payment[];
  warranties: Warranty[];
}

const normOrder = (o: Order): Order => ({
  ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), tax: Number(o.tax), total: Number(o.total),
  amount_paid: Number(o.amount_paid),
});

export interface OrderFilters {
  q?: string;
  status?: OrderStatus | "" | "open";
  channel?: OrderChannel | "";
  customer?: string;
  /** Ignore the branch picked in the top bar (customer history). */
  allBranches?: boolean;
}

function demoOrderRow(o: Order): OrderRow {
  const items = demo.orderItems.filter((i) => i.order_id === o.id);
  return {
    ...o,
    customer_name: demo.customers.find((c) => c.id === o.customer_id)?.full_name ?? null,
    branch_name: demo.branches.find((b) => b.id === o.branch_id)?.name ?? "",
    staff_name: demo.staff.find((s) => s.id === o.staff_id)?.full_name ?? null,
    items_label: items.map((i) => demo.products.find((p) => p.id === i.product_id)?.name).join(", "),
  };
}

export async function listOrders(filters: OrderFilters = {}): Promise<OrderRow[]> {
  const scope = filters.allBranches ? "all" : await getBranchScope();
  let rows: OrderRow[];
  if (isDemoMode) {
    rows = demo.orders.map(demoOrderRow);
  } else {
    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select("*, customers(full_name), branches!inner(name), profiles(full_name), order_items(products(name))")
      .order("placed_at", { ascending: false })
      .limit(500);
    if (scope !== "all") query = query.eq("branch_id", scope);
    if (filters.customer) query = query.eq("customer_id", filters.customer);
    const { data, error } = await query;
    if (error) throw error;
    type J = Order & {
      customers: { full_name: string } | null; branches: { name: string }; profiles: { full_name: string } | null;
      order_items: { products: { name: string } }[];
    };
    rows = (data as J[]).map(({ customers, branches, profiles, order_items, ...o }) => ({
      ...normOrder(o), customer_name: customers?.full_name ?? null, branch_name: branches.name,
      staff_name: profiles?.full_name ?? null, items_label: order_items.map((i) => i.products.name).join(", "),
    }));
  }
  return rows
    .filter((o) => inScope(scope, o.branch_id))
    .filter((o) => !filters.customer || o.customer_id === filters.customer)
    .filter((o) => !filters.channel || o.channel === filters.channel)
    .filter((o) => !filters.status ? true : filters.status === "open" ? o.status === "pending" : o.status === filters.status)
    .filter((o) => matchesQuery(filters.q, o.number, o.customer_name, o.items_label))
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at));
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  if (isDemoMode) {
    const o = demo.orders.find((x) => x.id === id);
    if (!o) return null;
    return {
      ...demoOrderRow(o),
      customer: demo.customers.find((c) => c.id === o.customer_id) ?? null,
      items: demo.orderItems.filter((i) => i.order_id === id).map((i) => {
        const p = demo.products.find((x) => x.id === i.product_id)!;
        return { ...i, product_name: p.name, ref_number: p.ref_number, serial_number: demo.stock.find((s) => s.id === i.stock_item_id)?.serial_number ?? null };
      }),
      payments: demo.payments.filter((p) => p.order_id === id).sort((a, b) => a.paid_at.localeCompare(b.paid_at)),
      warranties: demo.warranties.filter((w) => w.order_id === id),
    };
  }
  const supabase = await createClient();
  const [o, items, pays, wars] = await Promise.all([
    supabase.from("orders").select("*, customers(*), branches!inner(name), profiles(full_name)").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*, products(name,ref_number), stock_items(serial_number)").eq("order_id", id),
    supabase.from("payments").select("*").eq("order_id", id).order("paid_at"),
    supabase.from("warranties").select("*").eq("order_id", id),
  ]);
  for (const r of [o, items, pays, wars]) if (r.error) throw r.error;
  if (!o.data) return null;
  type J = Order & { customers: Customer | null; branches: { name: string }; profiles: { full_name: string } | null };
  const { customers, branches, profiles, ...order } = o.data as J;
  type I = OrderItem & { products: { name: string; ref_number: string }; stock_items: { serial_number: string } | null };
  const lines = (items.data as I[]).map(({ products, stock_items, ...i }) => ({
    ...i, unit_price: Number(i.unit_price), discount: Number(i.discount), product_name: products.name,
    ref_number: products.ref_number, serial_number: stock_items?.serial_number ?? null,
  }));
  return {
    ...normOrder(order), customer: customers, branch_name: branches.name, staff_name: profiles?.full_name ?? null,
    customer_name: customers?.full_name ?? null, items_label: lines.map((l) => l.product_name).join(", "),
    items: lines,
    payments: (pays.data as Payment[]).map((p) => ({ ...p, amount: Number(p.amount) })),
    warranties: wars.data as Warranty[],
  };
}

/* ------------------------------------------------------------------ */
/* Point of sale                                                       */
/* ------------------------------------------------------------------ */

export interface SaleInput {
  branch_id: string;
  customer_id: string | null;
  new_customer: { full_name: string; phone: string; email: string } | null;
  channel: OrderChannel;
  order_discount: number;
  notes: string;
  items: { stock_item_id: string; unit_price: number; discount: number }[];
  payments: { method: PaymentMethod; amount: number; reference: string }[];
}

export async function getTaxRate(): Promise<number> {
  if (isDemoMode) return demo.settings.tax_rate;
  const supabase = await createClient();
  const { data } = await supabase.from("store_settings").select("tax_rate").eq("id", 1).maybeSingle();
  return Number((data as { tax_rate: number } | null)?.tax_rate ?? 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function createSale(input: SaleInput): Promise<string> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", { p: input });
    if (error) throw new Error(error.message);
    return data as string;
  }

  // Demo: same rules as the create_sale database function.
  const user = await getCurrentUser();
  if (!input.items.length) throw new Error("Add at least one watch");
  const pieces = input.items.map((it) => {
    const s = demo.stock.find((x) => x.id === it.stock_item_id);
    if (!s) throw new Error("Watch not found");
    if (s.status !== "in_stock" && s.status !== "reserved") throw new Error(`Serial ${s.serial_number} is not available (${s.status})`);
    if (s.branch_id !== input.branch_id) throw new Error(`Serial ${s.serial_number} is in another branch`);
    return { it, s, p: demo.products.find((p) => p.id === s.product_id)! };
  });
  const subtotal = pieces.reduce((t, x) => t + x.it.unit_price, 0);
  const discount = pieces.reduce((t, x) => t + x.it.discount, 0) + input.order_discount;
  const tax = round2(((subtotal - discount) * demo.settings.tax_rate) / 100);
  const total = round2(subtotal - discount + tax);
  if (total < 0) throw new Error("Discount is larger than the total");
  const paid = input.payments.filter((p) => p.amount > 0).reduce((t, p) => t + p.amount, 0);
  if (paid > total + 0.001) throw new Error("Payments are more than the total");

  let customerId = input.customer_id;
  const now = new Date().toISOString();
  if (!customerId && input.new_customer?.full_name.trim()) {
    customerId = crypto.randomUUID();
    demo.customers.push({
      id: customerId, full_name: input.new_customer.full_name.trim(), phone: input.new_customer.phone || null,
      email: input.new_customer.email || null, address: null, city: null, country: null, birthday: null, wrist_size_mm: null,
      preferred_branch_id: input.branch_id, is_vip: false, marketing_opt_in: false, tags: [], notes: null, created_at: now,
    });
  }
  const id = crypto.randomUUID();
  demo.counters.order += 1;
  demo.orders.push({
    id, number: `ORD-${String(demo.counters.order).padStart(6, "0")}`, customer_id: customerId, branch_id: input.branch_id,
    staff_id: user?.id ?? null, channel: input.channel, status: paid >= total ? "completed" : "pending", subtotal, discount,
    tax, total, amount_paid: paid, notes: input.notes || null, placed_at: now, refunded_at: null, refund_reason: null,
  });
  for (const { it, s, p } of pieces) {
    demo.orderItems.push({
      id: crypto.randomUUID(), order_id: id, product_id: p.id, stock_item_id: s.id,
      description: `${p.name} · ${p.ref_number} · ${s.serial_number}`, unit_price: it.unit_price, discount: it.discount,
    });
    demo.movements.push({
      id: crypto.randomUUID(), stock_item_id: s.id, reason: "sale", from_branch_id: s.branch_id, to_branch_id: s.branch_id,
      from_status: s.status, to_status: "sold", note: demo.orders.at(-1)!.number, created_at: now,
    });
    s.status = "sold";
    s.sold_at = now;
    const end = new Date();
    end.setMonth(end.getMonth() + p.warranty_months);
    demo.counters.warranty += 1;
    demo.warranties.push({
      id: crypto.randomUUID(), card_number: `WR-${String(demo.counters.warranty).padStart(6, "0")}`, stock_item_id: s.id,
      order_id: id, customer_id: customerId, starts_on: now.slice(0, 10), ends_on: end.toISOString().slice(0, 10), status: "active",
    });
    demo.viewings.filter((v) => v.stock_item_id === s.id && (v.status === "new" || v.status === "confirmed")).forEach((v) => (v.status = "completed"));
  }
  for (const pay of input.payments.filter((p) => p.amount > 0)) {
    demo.payments.push({ id: crypto.randomUUID(), order_id: id, method: pay.method, amount: pay.amount, reference: pay.reference || null, paid_at: now });
  }
  return id;
}

export async function addPayment(orderId: string, method: PaymentMethod, amount: number, reference: string): Promise<void> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("add_payment", { p_order: orderId, p_method: method, p_amount: amount, p_reference: reference });
    if (error) throw new Error(error.message);
    return;
  }
  const o = demo.orders.find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.status !== "pending" && o.status !== "paid") throw new Error(`This order is ${o.status}`);
  if (amount <= 0 || o.amount_paid + amount > o.total + 0.001) throw new Error("Amount is more than the balance due");
  demo.payments.push({ id: crypto.randomUUID(), order_id: orderId, method, amount, reference: reference || null, paid_at: new Date().toISOString() });
  o.amount_paid = round2(o.amount_paid + amount);
  if (o.amount_paid >= o.total) o.status = "completed";
}

export async function refundOrder(orderId: string, reason: string): Promise<void> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("refund_order", { p_order: orderId, p_reason: reason });
    if (error) throw new Error(error.message);
    return;
  }
  const o = demo.orders.find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.status === "cancelled" || o.status === "refunded") throw new Error(`Already ${o.status}`);
  const now = new Date().toISOString();
  for (const it of demo.orderItems.filter((i) => i.order_id === orderId)) {
    const s = demo.stock.find((x) => x.id === it.stock_item_id);
    if (!s) continue;
    demo.movements.push({
      id: crypto.randomUUID(), stock_item_id: s.id, reason: "return", from_branch_id: s.branch_id, to_branch_id: s.branch_id,
      from_status: s.status, to_status: "in_stock", note: o.number, created_at: now,
    });
    s.status = "in_stock";
    s.sold_at = null;
  }
  demo.warranties.filter((w) => w.order_id === orderId).forEach((w) => (w.status = "void"));
  o.status = o.amount_paid > 0 ? "refunded" : "cancelled";
  o.refunded_at = now;
  o.refund_reason = reason || null;
}

/** Watches that can be sold (in stock or reserved), across all branches, for the POS screen. */
export async function listSellableStock(): Promise<StockRow[]> {
  return listStock({ branch: "all", status: "available" });
}
