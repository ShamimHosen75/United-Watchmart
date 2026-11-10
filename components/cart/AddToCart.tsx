"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useStock } from "@/lib/cart/stock";
import { addToCart, setCartOpen, useCart } from "@/lib/cart/store";
import { shop } from "@/lib/shop/config";

type Props = { slug: string };

/** Add-to-cart with live stock: "Only 1 left", "Sold out", per-order limit. */
export function AddToCart({ slug }: Props) {
  const t = useTranslations("cart");
  const stock = useStock();
  const inCart = useCart().find((l) => l.slug === slug)?.qty ?? 0;
  const [justAdded, setJustAdded] = useState(false);

  const available = stock ? (stock[slug] ?? 0) : null;
  const soldOut = available === 0;
  const atLimit = inCart >= Math.min(shop.maxPerLine, available ?? shop.maxPerLine);

  const onAdd = () => {
    if (addToCart(slug, 1, available)) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
    setCartOpen(true);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onAdd}
        disabled={soldOut || (atLimit && !inCart)}
        data-magnetic
        className="label inline-flex min-h-12 items-center justify-center gap-3 bg-ivory px-7 py-3 text-bg transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      >
        {soldOut ? t("soldOut") : justAdded ? t("added") : t("add")}
      </button>
      <p className="text-14 text-muted" aria-live="polite">
        {available === null
          ? ""
          : soldOut
            ? ""
            : atLimit && inCart
              ? t("maxReached")
              : available <= 2
                ? t("onlyLeft", { count: available })
                : ""}
      </p>
    </div>
  );
}
