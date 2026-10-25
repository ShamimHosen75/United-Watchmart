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
