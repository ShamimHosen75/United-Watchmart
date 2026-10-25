import Stripe from "stripe";
import type { PaymentDetails } from "@/lib/shop/orders";

let client: Stripe | null | undefined;

/** Server-side Stripe client, or null when STRIPE_SECRET_KEY is not set. */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key, { appInfo: { name: "United WatchMart" }, maxNetworkRetries: 2 }) : null;
  }
  return client;
}

/** Customer and shipping details captured by the Payment and Address Elements. */
export function detailsFromIntent(pi: Stripe.PaymentIntent): PaymentDetails {
  const s = pi.shipping;
  return {
    amountReceived: pi.amount_received,
    email: pi.receipt_email,
    name: s?.name ?? null,
    phone: s?.phone ?? null,
    shipping: s?.address
      ? {
          line1: s.address.line1 ?? "",
          line2: s.address.line2,
          city: s.address.city ?? "",
          state: s.address.state,
          postalCode: s.address.postal_code,
          country: s.address.country ?? "",
        }
      : null,
  };
}

/** Best effort: cancel payment intents whose hold has ended so they can no longer be paid. */
export async function cancelIntents(ids: string[]) {
  const stripe = getStripe();
  if (!stripe) return;
  await Promise.allSettled(ids.map((id) => stripe.paymentIntents.cancel(id)));
}
