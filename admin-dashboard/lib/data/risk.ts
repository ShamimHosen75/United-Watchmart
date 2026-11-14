import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import type { Customer, Order, RiskReview, RiskStatus } from "@/lib/types";

export interface RiskRow {
  order: Order;
  customer: Pick<Customer, "id" | "full_name" | "email" | "phone" | "is_vip"> | null;
  score: number;
  reasons: string[];
  review: RiskReview | null;
}

/** Order value above which a remote order gets a closer look. */
export const HIGH_VALUE = 8000;

/**
 * Scores an order for fraud or delivery risk. Simple, explainable rules: each adds points and a reason.
 * Store sales are paid face to face, so only remote orders are scored.
 */
function score(o: Order, c: RiskRow["customer"], orderCount: number): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const add = (pts: number, why: string) => { s += pts; reasons.push(why); };
  if (o.total >= HIGH_VALUE) add(25, `High value (over ${HIGH_VALUE.toLocaleString()})`);
  const due = o.total - o.amount_paid;
  if (due > 0) add(due >= o.total * 0.5 ? 30 : 15, due >= o.total ? "Nothing paid yet" : "Balance still due");
  if (!c) add(25, "No customer on the order");
  else {
    if (!c.email && !c.phone) add(20, "No email or phone");
    if (orderCount <= 1 && !c.is_vip) add(15, "First order from this customer");
  }
  if (o.subtotal > 0 && o.discount / o.subtotal >= 0.15) add(15, "Discount of 15% or more");
  if (o.channel === "whatsapp" || o.channel === "phone") add(10, `Ordered by ${o.channel === "phone" ? "phone" : "WhatsApp"}`);
  return { score: Math.min(100, s), reasons };
}

export async function listRiskOrders(): Promise<RiskRow[]> {
  let orders: Order[];
  let customers: RiskRow["customer"][];
  let reviews: RiskReview[];
  if (isDemoMode) {
    ({ orders, customers } = demo);
    reviews = demo.riskReviews;
  } else {
    const supabase = await createClient();
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [o, r] = await Promise.all([
      supabase.from("orders").select("*").neq("channel", "store").not("status", "in", "(cancelled,refunded,draft)").gte("placed_at", since),
      supabase.from("order_risk_reviews").select("*"),
    ]);
    if (o.error) throw new Error(o.error.message);
    if (r.error) throw new Error(r.error.message);
    orders = (o.data as Order[]).map((x) => ({ ...x, total: Number(x.total), subtotal: Number(x.subtotal), discount: Number(x.discount), amount_paid: Number(x.amount_paid) }));
    reviews = r.data as RiskReview[];
    const ids = [...new Set(orders.map((x) => x.customer_id).filter(Boolean))] as string[];
    const c = ids.length ? await supabase.from("customers").select("id,full_name,email,phone,is_vip").in("id", ids) : { data: [] };
    customers = (c.data ?? []) as RiskRow["customer"][];
  }
  const counts = new Map<string, number>();
  for (const o of orders) if (o.customer_id) counts.set(o.customer_id, (counts.get(o.customer_id) ?? 0) + 1);
  return orders
    .filter((o) => o.channel !== "store" && !["cancelled", "refunded", "draft"].includes(o.status))
    .map((o) => {
      const customer = customers.find((c) => c?.id === o.customer_id) ?? null;
      return { order: o, customer, ...score(o, customer, counts.get(o.customer_id ?? "") ?? 0), review: reviews.find((r) => r.order_id === o.id) ?? null };
    })
    .filter((r) => r.score >= 25)
    .sort((a, b) => b.score - a.score || b.order.placed_at.localeCompare(a.order.placed_at));
}

export async function saveRiskReview(orderId: string, status: RiskStatus, note: string | null, userId: string | null): Promise<void> {
  const row: RiskReview = { order_id: orderId, status, note, reviewed_by: userId, reviewed_at: new Date().toISOString() };
  if (isDemoMode) {
    const i = demo.riskReviews.findIndex((r) => r.order_id === orderId);
    if (i >= 0) demo.riskReviews[i] = row; else demo.riskReviews.push(row);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("order_risk_reviews").upsert(row);
  if (error) throw new Error(error.message);
}
