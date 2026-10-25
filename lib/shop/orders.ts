import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import type { DB } from "@/lib/db";
import {
  inventory,
  orderEvents,
  orderItems,
  orders,
  type Order,
  type OrderStatus,
  type ShippingAddress,
} from "@/lib/db/schema";
import { shop } from "./config";
import type { PricedLine } from "./cart";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Executor = DB | Tx;

// ------------------------------------------------------------------ refs

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

/** Short, readable order reference such as UWM-7K3F9Q. */
export function newOrderRef() {
  const bytes = randomBytes(6);
  return "UWM-" + [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

const log = (db: Executor, orderId: string, type: string, message: string) =>
  db.insert(orderEvents).values({ orderId, type, message });

// ------------------------------------------------------------------ stock

/** Units held by pending orders whose hold has not expired, per slug. */
async function heldBySlug(db: Executor, slugs?: string[]) {
  const rows = await db
    .select({ slug: orderItems.slug, held: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.status, "pending"),
        gt(orders.expiresAt, new Date()),
        slugs ? inArray(orderItems.slug, slugs) : undefined,
      ),
    )
    .groupBy(orderItems.slug);
  return new Map(rows.map((r) => [r.slug, Number(r.held)]));
}

export type Availability = Record<string, { stock: number; held: number; available: number }>;

export async function getAvailability(db: DB): Promise<Availability> {
  const [rows, held] = await Promise.all([db.select().from(inventory), heldBySlug(db)]);
  return Object.fromEntries(
    rows.map((r) => {
      const h = held.get(r.slug) ?? 0;
      return [r.slug, { stock: r.stock, held: h, available: Math.max(0, r.stock - h) }];
    }),
  );
}

// ------------------------------------------------------------------ checkout

export type ReserveResult =
  | { ok: true; order: Order }
  | { ok: false; unavailable: { slug: string; available: number }[] };

/**
 * Creates a pending order and holds its stock for `shop.holdMinutes`.
 * Inventory rows are locked so two buyers can never hold the same last piece.
 */
export async function reserveOrder(
  db: DB,
  priced: { items: PricedLine[]; subtotalCents: number; shippingCents: number; totalCents: number },
  locale: string,
): Promise<ReserveResult> {
  return db.transaction(async (tx) => {
    const slugs = priced.items.map((i) => i.slug);
    const stockRows = await tx.select().from(inventory).where(inArray(inventory.slug, slugs)).for("update");
    const stock = new Map(stockRows.map((r) => [r.slug, r.stock]));
    const held = await heldBySlug(tx, slugs);

    const unavailable = priced.items
      .map((i) => ({ slug: i.slug, available: Math.max(0, (stock.get(i.slug) ?? 0) - (held.get(i.slug) ?? 0)), want: i.quantity }))
      .filter((x) => x.available < x.want)
      .map(({ slug, available }) => ({ slug, available }));
    if (unavailable.length) return { ok: false as const, unavailable };

    const [order] = await tx
      .insert(orders)
      .values({
        ref: newOrderRef(),
        locale,
        currency: shop.currency,
        subtotalCents: priced.subtotalCents,
        shippingCents: priced.shippingCents,
        totalCents: priced.totalCents,
        expiresAt: new Date(Date.now() + shop.holdMinutes * 60_000),
      })
      .returning();
    await tx.insert(orderItems).values(priced.items.map((i) => ({ ...i, orderId: order!.id })));
    await log(tx, order!.id, "created", `Checkout started; stock held for ${shop.holdMinutes} minutes.`);
    return { ok: true as const, order: order! };
  });
}

export async function setPaymentIntent(db: DB, orderId: string, paymentIntentId: string) {
  await db.update(orders).set({ paymentIntentId, updatedAt: new Date() }).where(eq(orders.id, orderId));
}

/** A pending order the same browser can keep using (same items, hold still valid). Extends the hold. */
export async function findReusableOrder(db: DB, ref: string, items: PricedLine[]) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.ref, ref), eq(orders.status, "pending"), gt(orders.expiresAt, new Date())),
  });
  if (!order?.paymentIntentId) return null;
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const key = (l: { slug: string; quantity: number }[]) =>
    l.map((x) => `${x.slug}:${x.quantity}`).sort().join("|");
  if (key(lines) !== key(items)) return null;
  await db
    .update(orders)
    .set({ expiresAt: new Date(Date.now() + shop.holdMinutes * 60_000), updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  return order;
}

/** Releases a pending order's hold (cart changed or payment canceled). */
export async function cancelPendingOrder(db: DB, where: { ref?: string; paymentIntentId?: string }, reason: string) {
  const cond = where.ref ? eq(orders.ref, where.ref) : eq(orders.paymentIntentId, where.paymentIntentId ?? "");
  const [order] = await db
    .update(orders)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(and(cond, eq(orders.status, "pending")))
    .returning();
  if (order) await log(db, order.id, "canceled", reason);
  return order ?? null;
}

/** Marks pending orders past their hold as expired. Returns their payment intents so the caller can cancel them. */
export async function expireStaleOrders(db: DB) {
  const stale = await db
    .update(orders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(orders.status, "pending"), lt(orders.expiresAt, new Date())))
    .returning({ id: orders.id, paymentIntentId: orders.paymentIntentId });
  for (const o of stale) await log(db, o.id, "expired", "Hold expired before payment; stock released.");
  return stale.map((o) => o.paymentIntentId).filter((x): x is string => Boolean(x));
}

// ------------------------------------------------------------------ payment

export type PaymentDetails = {
  amountReceived: number;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  shipping?: ShippingAddress | null;
};

/**
 * Records a successful payment. Safe to call more than once (webhook and confirmation page):
 * only the first call changes anything and returns `newlyPaid: true`.
 */
export async function finalizePaid(db: DB, paymentIntentId: string, details: PaymentDetails) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.paymentIntentId, paymentIntentId)).for("update");
    if (!order) return { order: null, newlyPaid: false };
    if (order.status !== "pending" && order.status !== "expired" && order.status !== "canceled") {
      return { order, newlyPaid: false };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const stockRows = await tx
      .select()
      .from(inventory)
      .where(inArray(inventory.slug, items.map((i) => i.slug)))
      .for("update");
    const stock = new Map(stockRows.map((r) => [r.slug, r.stock]));

    let stockIssue = false;
    for (const item of items) {
      const have = stock.get(item.slug) ?? 0;
      if (have < item.quantity) stockIssue = true;
      await tx
        .update(inventory)
        .set({ stock: Math.max(0, have - item.quantity), updatedAt: new Date() })
        .where(eq(inventory.slug, item.slug));
    }
    if (details.amountReceived !== order.totalCents) stockIssue = true; // amount mismatch also needs a person

    const [paid] = await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
        email: details.email ?? order.email,
        name: details.name ?? order.name,
        phone: details.phone ?? order.phone,
        shippingAddress: details.shipping ?? order.shippingAddress,
        stockIssue,
      })
      .where(eq(orders.id, order.id))
      .returning();
    await log(tx, order.id, "paid", `Payment received (${(details.amountReceived / 100).toFixed(2)} ${order.currency.toUpperCase()}).`);
    if (stockIssue) {
      await log(tx, order.id, "attention", "Paid after the hold ended or with a different amount: check stock and amount.");
    }
    return { order: paid!, newlyPaid: true };
  });
}

// ------------------------------------------------------------------ admin

export async function getOrder(db: DB, id: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(desc(orderEvents.createdAt), desc(orderEvents.id)),
  ]);
  return { order, items, events };
}

export async function getOrderItems(db: DB, orderId: string) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export const PAGE_SIZE = 25;

export async function listOrders(db: DB, opts: { status?: OrderStatus; q?: string; page?: number }) {
  const filters: (SQL | undefined)[] = [];
  if (opts.status) filters.push(eq(orders.status, opts.status));
  if (opts.q) {
    const q = `%${opts.q.trim()}%`;
    filters.push(or(ilike(orders.ref, q), ilike(orders.email, q), ilike(orders.name, q)));
  }
  const where = and(...filters);
  const page = Math.max(1, opts.page ?? 1);
  const [rows, [count]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);
  const ids = rows.map((r) => r.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  return {
    rows: rows.map((r) => ({ ...r, items: items.filter((i) => i.orderId === r.id) })),
    total: Number(count?.n ?? 0),
    page,
  };
}

/** Allowed manual status changes in admin. */
const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["canceled"],
  paid: ["shipped", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => transitions[from]?.includes(to) ?? false;

export async function markShipped(db: DB, id: string, carrier: string, trackingNumber: string) {
  const [o] = await db
    .update(orders)
    .set({ status: "shipped", carrier, trackingNumber, shippedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.status, "paid")))
    .returning();
  if (o) await log(db, id, "shipped", `Shipped with ${carrier}, tracking ${trackingNumber}.`);
  return o ?? null;
}

export async function markDelivered(db: DB, id: string) {
  const [o] = await db
    .update(orders)
    .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.status, "shipped")))
    .returning();
  if (o) await log(db, id, "delivered", "Marked as delivered.");
  return o ?? null;
}

/** Records a refund. With `restock`, the units go back into inventory. */
export async function markRefunded(db: DB, id: string, opts: { restock: boolean; note: string }) {
  return db.transaction(async (tx) => {
    const [o] = await tx
      .update(orders)
      .set({ status: "refunded", refundedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, id), inArray(orders.status, ["paid", "shipped", "delivered"])))
      .returning();
    if (!o) return null;
    if (opts.restock) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
      for (const i of items) {
        await tx
          .update(inventory)
          .set({ stock: sql`${inventory.stock} + ${i.quantity}`, updatedAt: new Date() })
          .where(eq(inventory.slug, i.slug));
      }
    }
    await log(tx, id, "refunded", `${opts.note}${opts.restock ? " Stock returned to inventory." : ""}`);
    return o;
  });
}

export async function addNote(db: DB, id: string, note: string) {
  await log(db, id, "note", note);
}

export async function setStock(db: DB, values: { slug: string; stock: number }[]) {
  await db.transaction(async (tx) => {
    for (const v of values) {
      await tx
        .insert(inventory)
        .values({ slug: v.slug, stock: v.stock })
        .onConflictDoUpdate({ target: inventory.slug, set: { stock: v.stock, updatedAt: new Date() } });
    }
  });
}
