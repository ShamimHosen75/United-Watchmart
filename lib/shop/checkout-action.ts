"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { cancelIntents, getStripe } from "@/lib/stripe/server";
import { cartSchema, priceCart, type PricedLine } from "./cart";
import { cancelPendingOrder, expireStaleOrders, findReusableOrder, reserveOrder, setPaymentIntent } from "./orders";

const inputSchema = z.object({
  items: cartSchema,
  locale: z.enum(["en", "ar"]),
  /** A pending order this browser started earlier, reused when the cart is unchanged. */
  existingRef: z.string().max(20).optional(),
});

export type CheckoutResult =
  | {
      ok: true;
      ref: string;
      clientSecret: string;
      items: PricedLine[];
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
      expiresAt: string;
    }
  | { ok: false; error: "invalid" | "unavailable" | "payments_unavailable" | "rate" | "server"; unavailable?: { slug: string; available: number }[] };

/**
 * Starts (or resumes) a checkout: prices the cart on the server, holds stock and creates the
 * Stripe PaymentIntent the embedded Payment Element confirms. Never throws.
 */
export async function createCheckout(input: unknown): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "payments_unavailable" };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { items, locale, existingRef } = parsed.data;
  const priced = priceCart(items);

  try {
    const db = await getDb();
    await cancelIntents(await expireStaleOrders(db));

    // Same browser, same cart, hold still valid: keep the existing order and payment intent.
    if (existingRef) {
      const reusable = await findReusableOrder(db, existingRef, priced.items);
      if (reusable?.paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(reusable.paymentIntentId);
        if (pi.client_secret && pi.status !== "canceled" && pi.status !== "succeeded") {
          return {
            ok: true,
            ref: reusable.ref,
            clientSecret: pi.client_secret,
            ...priced,
            expiresAt: reusable.expiresAt!.toISOString(),
          };
        }
      }
      // Cart changed or the old checkout cannot be resumed: release its hold.
      const old = await cancelPendingOrder(db, { ref: existingRef }, "Replaced by a new checkout.");
      if (old?.paymentIntentId) await cancelIntents([old.paymentIntentId]);
    }

    if (!checkoutLimiter(clientIp(await headers()))) return { ok: false, error: "rate" };

    const reserved = await reserveOrder(db, priced, locale);
    if (!reserved.ok) return { ok: false, error: "unavailable", unavailable: reserved.unavailable };
    const order = reserved.order;

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: order.totalCents,
          currency: order.currency,
          automatic_payment_methods: { enabled: true },
          description: `United WatchMart order ${order.ref}`,
          metadata: { orderId: order.id, ref: order.ref },
        },
        { idempotencyKey: `order-${order.id}` },
      );
      await setPaymentIntent(db, order.id, pi.id);
      return {
        ok: true,
        ref: order.ref,
        clientSecret: pi.client_secret!,
        ...priced,
        expiresAt: order.expiresAt!.toISOString(),
      };
    } catch (err) {
      await cancelPendingOrder(db, { ref: order.ref }, "Could not create the payment.");
      throw err;
    }
  } catch (err) {
    console.error("[checkout] failed", err);
    return { ok: false, error: "server" };
  }
}
