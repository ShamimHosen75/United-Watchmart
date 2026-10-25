import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { cancelPendingOrder, markRefunded } from "@/lib/shop/orders";
import { recordSucceededPayment } from "@/lib/shop/payments";
import { getStripe } from "@/lib/stripe/server";
import { eq } from "drizzle-orm";
import { orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Subscribe to: payment_intent.succeeded, payment_intent.canceled, charge.refunded.
 * Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Payments not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await recordSucceededPayment(event.data.object);
        break;
      case "payment_intent.canceled":
        await cancelPendingOrder(await getDb(), { paymentIntentId: event.data.object.id }, "Payment canceled in Stripe.");
        break;
      case "charge.refunded": {
        const charge = event.data.object;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId && charge.refunded) {
          const db = await getDb();
          const order = await db.query.orders.findFirst({ where: eq(orders.paymentIntentId, piId) });
          if (order) await markRefunded(db, order.id, { restock: false, note: "Refunded in Stripe." });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe:webhook] handler failed", event.type, err);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }

  return Response.json({ received: true });
}
