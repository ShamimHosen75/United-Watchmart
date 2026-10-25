/** Shop rules shared by the cart (client) and checkout (server). */
export const shop = {
  currency: "usd",
  /** Minutes a checkout holds stock before it is released. */
  holdMinutes: 30,
  /** Most units of one watch per order. */
  maxPerLine: 2,
  /** Most different watches per order. */
  maxLines: 9,
  /** Complimentary insured shipping. */
  shippingCents: 0,
} as const;

export const toCents = (usd: number) => Math.round(usd * 100);

/**
 * Online buying (cart, add to cart, checkout) only appears when a Stripe publishable key is set.
 * Without it the site is viewing-request only. Read at build time, so redeploy after adding the key.
 */
export const shopEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
