import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { detailsFromIntent } from "@/lib/stripe/server";
import { sendOrderEmails } from "./emails";
import { finalizePaid, getOrderItems } from "./orders";

/**
 * Records a succeeded payment and sends the order emails exactly once.
 * Called by both the Stripe webhook and the confirmation page, whichever arrives first.
 */
export async function recordSucceededPayment(pi: Stripe.PaymentIntent) {
  if (pi.status !== "succeeded") return null;
  const db = await getDb();
  const { order, newlyPaid } = await finalizePaid(db, pi.id, detailsFromIntent(pi));
  if (order && newlyPaid) {
    try {
      await sendOrderEmails(order, await getOrderItems(db, order.id));
    } catch (err) {
      // Payment is recorded either way; the boutique can resend from admin later.
      console.error("[order] email failed", order.ref, err);
    }
  }
  return order;
}
