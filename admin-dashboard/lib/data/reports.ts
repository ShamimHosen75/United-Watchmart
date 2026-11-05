import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getBranchScope, inScope, listBranches, listProducts, listStaff, listStock } from "./index";
import { listRepairs } from "./service";
import type { Order, OrderItem } from "@/lib/types";

const DAY = 86_400_000;
const SOLD: Order["status"][] = ["paid", "completed"];
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Range { from: string; to: string } // inclusive ISO dates

export interface SalesLine {
  order_id: string;
  number: string;
  placed_at: string;
  branch: string;
  staff: string;
  channel: string;
  product: string;
  ref_number: string;
  brand: string;
  collection: string;
  revenue: number; // net of discounts, before tax
  cost: number;
  margin: number;
}

type OrderWithItems = Order & { items: (OrderItem & { cost: number | null })[] };

async function ordersInRange(r: Range): Promise<{ sold: OrderWithItems[]; refunded: Order[] }> {
  const from = `${r.from}T00:00:00.000Z`;
  const to = new Date(Date.parse(`${r.to}T00:00:00.000Z`) + DAY).toISOString();
  let orders: OrderWithItems[];
  if (isDemoMode) {
    orders = demo.orders
      .filter((o) => o.placed_at >= from && o.placed_at < to)
      .map((o) => ({
        ...o,
        items: demo.orderItems.filter((i) => i.order_id === o.id).map((i) => ({ ...i, cost: demo.stock.find((s) => s.id === i.stock_item_id)?.cost_price ?? null })),
      }));
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, stock_items(cost_price))")
      .gte("placed_at", from)
      .lt("placed_at", to)
      .limit(20000);
    if (error) throw error;
    type J = Order & { order_items: (OrderItem & { stock_items: { cost_price: number | null } | null })[] };
    orders = (data as J[]).map(({ order_items, ...o }) => ({
      ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), tax: Number(o.tax), total: Number(o.total), amount_paid: Number(o.amount_paid),
      items: order_items.map(({ stock_items, ...i }) => ({ ...i, unit_price: Number(i.unit_price), discount: Number(i.discount), cost: stock_items?.cost_price == null ? null : Number(stock_items.cost_price) })),
    }));
  }
  const scope = await getBranchScope();
  const scoped = orders.filter((o) => inScope(scope, o.branch_id));
  return { sold: scoped.filter((o) => SOLD.includes(o.status)), refunded: scoped.filter((o) => o.status === "refunded") };
}

export async function salesLines(r: Range): Promise<{ lines: SalesLine[]; refunds: { count: number; amount: number }; tax: number }> {
  const [{ sold, refunded }, branches, staff, products] = await Promise.all([ordersInRange(r), listBranches(), listStaff(), listProducts()]);
  const lines: SalesLine[] = [];
  for (const o of sold) {
    // Spread the order's net (total minus tax) across its lines by their discounted price.
    const net = o.total - o.tax;
    const weights = o.items.map((i) => Math.max(0, i.unit_price - i.discount));
    const wsum = weights.reduce((a, b) => a + b, 0) || 1;
    o.items.forEach((i, k) => {
      const p = products.find((x) => x.id === i.product_id);
      const revenue = round2((net * weights[k]) / wsum);
      const cost = i.cost ?? p?.cost_price ?? 0;
      lines.push({
        order_id: o.id, number: o.number, placed_at: o.placed_at,
        branch: branches.find((b) => b.id === o.branch_id)?.name ?? "",
        staff: staff.find((s) => s.id === o.staff_id)?.full_name ?? "Unassigned",
        channel: o.channel, product: p?.name ?? "Unknown watch", ref_number: p?.ref_number ?? "",
        brand: p?.brand_name ?? "No brand", collection: p?.collection_name ?? "No collection",
        revenue, cost, margin: round2(revenue - cost),
      });
    });
  }
  return {
    lines: lines.sort((a, b) => a.placed_at.localeCompare(b.placed_at)),
    refunds: { count: refunded.length, amount: refunded.reduce((t, o) => t + o.total, 0) },
    tax: sold.reduce((t, o) => t + o.tax, 0),
  };
}

export interface Group { key: string; revenue: number; cost: number; margin: number; units: number; orders: number }

export function groupBy(lines: SalesLine[], key: (l: SalesLine) => string): Group[] {
  const map = new Map<string, Group & { ids: Set<string> }>();
  for (const l of lines) {
    const k = key(l);
    const g = map.get(k) ?? { key: k, revenue: 0, cost: 0, margin: 0, units: 0, orders: 0, ids: new Set<string>() };
    g.revenue += l.revenue; g.cost += l.cost; g.margin += l.margin; g.units += 1; g.ids.add(l.order_id);
    map.set(k, g);
  }
  return [...map.values()].map(({ ids, ...g }) => ({ ...g, orders: ids.size })).sort((a, b) => b.revenue - a.revenue);
}

export function dailySeries(lines: SalesLine[], r: Range) {
  const out: { date: string; total: number; orders: number }[] = [];
  for (let t = Date.parse(`${r.from}T00:00:00Z`); t <= Date.parse(`${r.to}T00:00:00Z`); t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    const day = lines.filter((l) => l.placed_at.slice(0, 10) === d);
    out.push({ date: d, total: round2(day.reduce((s, l) => s + l.revenue, 0)), orders: new Set(day.map((l) => l.order_id)).size });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Stock value and age                                                 */
/* ------------------------------------------------------------------ */

export const AGE_BUCKETS = [
  { label: "0–30 days", max: 30 },
  { label: "31–90 days", max: 90 },
  { label: "91–180 days", max: 180 },
  { label: "181–365 days", max: 365 },
  { label: "Over a year", max: Infinity },
];

export async function stockReport() {
  const scope = await getBranchScope();
  const stock = (await listStock({})).filter((s) => ["in_stock", "reserved", "in_repair", "in_transit"].includes(s.status) && inScope(scope, s.branch_id));
  const now = Date.now();
  const pieces = stock.map((s) => ({ ...s, cost: s.cost_price ?? 0, age: Math.floor((now - Date.parse(s.received_at)) / DAY) }));
  const byBranch = new Map<string, { branch: string; pieces: number; cost: number; retail: number }>();
  for (const p of pieces) {
    const g = byBranch.get(p.branch_name) ?? { branch: p.branch_name, pieces: 0, cost: 0, retail: 0 };
    g.pieces++; g.cost += p.cost; g.retail += p.price;
    byBranch.set(p.branch_name, g);
  }
  const buckets = AGE_BUCKETS.map((b, i) => {
    const min = i === 0 ? 0 : AGE_BUCKETS[i - 1].max + 1;
    const list = pieces.filter((p) => p.age >= min && p.age <= b.max);
    return { label: b.label, pieces: list.length, cost: list.reduce((t, p) => t + p.cost, 0) };
  });
  return {
    pieces,
    totals: { pieces: pieces.length, cost: pieces.reduce((t, p) => t + p.cost, 0), retail: pieces.reduce((t, p) => t + p.price, 0) },
    byBranch: [...byBranch.values()].sort((a, b) => b.cost - a.cost),
    buckets,
    oldest: [...pieces].sort((a, b) => b.age - a.age).slice(0, 10),
  };
}

/* ------------------------------------------------------------------ */
/* Workshop                                                            */
/* ------------------------------------------------------------------ */

export async function repairsReport(r: Range) {
  const all = await listRepairs({});
  const inRange = (iso: string | null) => Boolean(iso && iso.slice(0, 10) >= r.from && iso.slice(0, 10) <= r.to);
  const received = all.filter((x) => inRange(x.received_at));
  const collected = all.filter((x) => inRange(x.collected_at));
  const turnaround = collected.map((x) => (Date.parse(x.collected_at!) - Date.parse(x.received_at)) / DAY);
  const techs = new Map<string, { technician: string; collected: number; revenue: number; days: number[] }>();
  for (const x of collected) {
    const k = x.technician_name ?? "Unassigned";
    const t = techs.get(k) ?? { technician: k, collected: 0, revenue: 0, days: [] };
    t.collected++; t.revenue += x.paid_amount; t.days.push((Date.parse(x.collected_at!) - Date.parse(x.received_at)) / DAY);
    techs.set(k, t);
  }
  return {
    received: received.length,
    collected: collected.length,
    warranty: received.filter((x) => x.under_warranty).length,
    revenue: collected.reduce((t, x) => t + x.paid_amount, 0),
    avgDays: turnaround.length ? turnaround.reduce((a, b) => a + b, 0) / turnaround.length : null,
    overdue: all.filter((x) => x.overdue).length,
    byTechnician: [...techs.values()].map((t) => ({ ...t, avgDays: t.days.reduce((a, b) => a + b, 0) / t.days.length })),
    jobs: collected,
  };
}

/** Turns rows into CSV text (Excel-friendly). */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s; // stop spreadsheet formulas
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
