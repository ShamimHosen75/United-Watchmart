import { z } from "zod";
import { getWatch, products } from "@/data/products";
import { shop, toCents } from "./config";

const slugs = products.map((p) => p.slug) as [string, ...string[]];

/** What the browser sends: slugs and quantities only, never prices. */
export const cartSchema = z
  .array(z.object({ slug: z.enum(slugs), qty: z.number().int().min(1).max(shop.maxPerLine) }))
  .min(1)
  .max(shop.maxLines);

export type CartLine = z.infer<typeof cartSchema>[number];

export type PricedLine = { slug: string; name: string; ref: string; unitPriceCents: number; quantity: number };

/** Prices a cart from the product catalogue. Duplicate slugs are merged (capped per line). */
export function priceCart(lines: CartLine[]) {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.slug, Math.min(shop.maxPerLine, (merged.get(l.slug) ?? 0) + l.qty));

  const items: PricedLine[] = [...merged].map(([slug, quantity]) => {
    const w = getWatch(slug)!;
    return { slug, name: w.name, ref: w.ref, unitPriceCents: toCents(w.priceUsd), quantity };
  });
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  return { items, subtotalCents, shippingCents: shop.shippingCents, totalCents: subtotalCents + shop.shippingCents };
}
