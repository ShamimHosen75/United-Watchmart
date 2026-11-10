"use client";

import { useTranslations } from "next-intl";
import { cartCount, setCartOpen, useCart } from "@/lib/cart/store";

/** Header cart button with an item count. */
export function CartButton() {
  const t = useTranslations("cart");
  const count = cartCount(useCart());

  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={t("button", { count })}
      aria-haspopup="dialog"
      aria-controls="cart-drawer"
      data-magnetic
      className="label relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-ivory"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-gold" strokeWidth="1.25">
        <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      <span className="hidden sm:inline">{t("label")}</span>
      {count > 0 && (
        <span className="tabular grid min-w-5 place-items-center rounded-full bg-ivory px-1.5 text-[11px] leading-5 tracking-normal text-bg">
          {count}
        </span>
      )}
    </button>
  );
}
