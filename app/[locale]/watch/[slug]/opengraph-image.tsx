import { getWatch, products } from "@/data/products";
import { ogCard, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "United WatchMart watch";

export function generateStaticParams() {
  return products.map((w) => ({ slug: w.slug }));
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const watch = getWatch(slug) ?? products[0]!;
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    watch.priceUsd,
  );
  return ogCard({ eyebrow: watch.ref, title: watch.name, meta: `${watch.specs.caseMm} mm · ${price}` });
}
