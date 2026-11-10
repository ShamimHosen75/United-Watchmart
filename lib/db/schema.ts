import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "pending", // stock held, waiting for payment
  "paid",
  "shipped",
  "delivered",
  "canceled",
  "expired", // hold ran out before payment
  "refunded",
]);
export type OrderStatus = (typeof orderStatus.enumValues)[number];

export type ShippingAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
};

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    status: orderStatus("status").notNull().default("pending"),
    locale: text("locale").notNull().default("en"),
    currency: text("currency").notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    email: text("email"),
    name: text("name"),
    phone: text("phone"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    paymentIntentId: text("payment_intent_id").unique(),
    /** Paid after its hold expired and stock had run out: needs a person to resolve. */
    stockIssue: boolean("stock_issue").notNull().default(false),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    expiresAt: ts("expires_at"),
    paidAt: ts("paid_at"),
    shippedAt: ts("shipped_at"),
    deliveredAt: ts("delivered_at"),
    canceledAt: ts("canceled_at"),
    refundedAt: ts("refunded_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ref: text("ref").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Units physically in the boutique and not yet sold. Holds are derived from pending orders. */
export const inventory = pgTable("inventory", {
  slug: text("slug").primaryKey(),
  stock: integer("stock").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Audit trail shown on the admin order page. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;

/**
 * Customer reviews shown on the home page and watch pages.
 * Only rows with status "approved" are shown; new submissions should start as "pending".
 */
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Watch slug from data/products.ts. */
    slug: text("slug").notNull(),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    authorName: text("author_name").notNull(),
    authorCity: text("author_city"),
    verified: boolean("verified").notNull().default(false),
    /** Shown in the home page testimonials. */
    featured: boolean("featured").notNull().default(false),
    status: reviewStatus("status").notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("reviews_slug_idx").on(t.slug),
    index("reviews_status_idx").on(t.status),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

export type ReviewRow = typeof reviews.$inferSelect;
