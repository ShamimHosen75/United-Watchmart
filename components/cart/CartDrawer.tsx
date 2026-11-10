"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { WatchVisual } from "@/components/ui/WatchVisual";
import { getWatch } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { refreshStock, useStock } from "@/lib/cart/stock";
import { removeFromCart, setCartOpen, setQuantity, useCart, useCartOpen } from "@/lib/cart/store";
import { prefersReducedMotion } from "@/lib/device";
import { formatPrice } from "@/lib/format";
import { gsap, useGSAP } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { shop } from "@/lib/shop/config";
import { useDialogKeys } from "@/lib/use-dialog";

/** Slide-out cart. Enters from the inline end (from the right). */
export function CartDrawer() {
  const t = useTranslations("cart");
  const open = useCartOpen();
  const lines = useCart();
  const stock = useStock();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setCartOpen(false), []);
  useDialogKeys(panel, open, close);

  useEffect(() => {
    if (open) void refreshStock(true);
  }, [open]);

  useGSAP(
    () => {
      const el = root.current;
      const p = panel.current;
      if (!el || !p) return;
      const reduce = prefersReducedMotion();
      const offscreen = 100;

      if (open) {
        wasOpen.current = true;
        returnFocus.current = document.activeElement as HTMLElement | null;
        lockScroll();
        gsap.set(el, { autoAlpha: 1 });
        if (reduce) gsap.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        else gsap.fromTo(p, { xPercent: offscreen }, { xPercent: 0, duration: 0.7, ease: "power4.out" });
        gsap.fromTo("[data-cart-backdrop]", { opacity: 0 }, { opacity: 1, duration: 0.4 });
        p.querySelector<HTMLElement>("[data-cart-close]")?.focus({ preventScroll: true });
        return;
      }
      if (!wasOpen.current) return;
      wasOpen.current = false;
      unlockScroll();
      gsap.to("[data-cart-backdrop]", { opacity: 0, duration: 0.3 });
      gsap.to(p, {
        ...(reduce ? { opacity: 0 } : { xPercent: offscreen }),
        duration: reduce ? 0.2 : 0.5,
        ease: "power3.in",
        onComplete: () => gsap.set(el, { autoAlpha: 0 }),
      });
      returnFocus.current?.focus({ preventScroll: true });
    },
    { dependencies: [open], scope: root, revertOnUpdate: false },
  );

  const subtotal = lines.reduce((s, l) => s + (getWatch(l.slug)?.priceUsd ?? 0) * l.qty, 0);

  return (
    <div ref={root} className="invisible fixed inset-0 z-[60]" inert={!open}>
      <div data-cart-backdrop aria-hidden="true" className="absolute inset-0 bg-black/30" onClick={close} />
      <div
        id="cart-drawer"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        data-lenis-prevent
        onClick={(e) => (e.target as Element).closest("a") && close()}
        className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-surface shadow-[0_0_60px_rgba(0,0,0,.6)]"
      >
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-6 hairline-b">
          <h2 id="cart-title" className="text-28">
            {t("title")}
          </h2>
          <button
            type="button"
            data-cart-close
            onClick={close}
            aria-label={t("close")}
            className="grid size-11 place-items-center text-ivory hover:text-gold-light"
          >
            <span aria-hidden className="relative block size-5">
              <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-gold" />
              <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-gold" />
            </span>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-6 px-6">
            <p className="text-20 text-ivory/80">{t("empty")}</p>
            <Link href="/collection" className="label text-gold hover:text-gold-light">
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {lines.map((line) => {
                const w = getWatch(line.slug);
                if (!w) return null;
                const available = stock?.[line.slug];
                const cap = Math.min(shop.maxPerLine, available ?? shop.maxPerLine);
                return (
                  <li key={line.slug} className="flex gap-4 py-6 hairline-b">
                    <Link href={`/watch/${w.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                      <WatchVisual slug={w.slug} label="" decorative className="relative size-20" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/watch/${w.slug}`} className="font-serif text-20 hover:text-gold-light">
                            {w.name}
                          </Link>
                          <p className="label tabular text-muted">
                            {w.ref}
                          </p>
                        </div>
                        <p className="tabular text-ivory">{formatPrice(w.priceUsd * line.qty)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-gold/30" role="group" aria-label={t("quantity")}>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.slug, line.qty - 1)}
                            aria-label={t("decrease", { name: w.name })}
                            className="grid size-11 place-items-center text-ivory hover:text-gold-light"
                          >
                            −
                          </button>
                          <span className="tabular w-6 text-center" aria-live="polite">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.slug, line.qty + 1)}
                            disabled={line.qty >= cap}
                            aria-label={t("increase", { name: w.name })}
                            className="grid size-11 place-items-center text-ivory hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.slug)}
                          aria-label={t("remove", { name: w.name })}
                          className="grid size-11 place-items-center text-28 leading-none text-muted hover:text-ivory"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>
                      {available !== undefined && available < line.qty && (
                        <p className="mt-2 text-14 text-danger">
                          {available === 0 ? t("soldOut") : t("onlyLeft", { count: available })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="shrink-0 px-6 py-6 hairline-t">
              <div className="flex items-baseline justify-between">
                <span className="label text-muted">{t("subtotal")}</span>
                <span className="tabular font-serif text-28 text-ivory">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-2 text-14 text-muted">{t("shippingNote")}</p>
              <Link
                href="/checkout"
                className="label mt-6 flex min-h-12 w-full items-center justify-center bg-ivory text-bg transition-colors hover:bg-gold"
              >
                {t("checkout")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
