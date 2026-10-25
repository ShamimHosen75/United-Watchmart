"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { products } from "@/data/products";
import { Link, usePathname } from "@/i18n/navigation";
import { prefersReducedMotion } from "@/lib/device";
import { gsap, useGSAP } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { isCovered } from "@/lib/page-state";
import { Brand } from "./Brand";
import { LanguageSwitch } from "./LanguageSwitch";
import { mainLinks } from "./nav-links";

type Props = { open: boolean; onClose: () => void };

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Menu({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const pathname = usePathname();
  const t = useTranslations();

  // Open: clip-path reveal, links rise in. Close: clip-path out.
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduce = prefersReducedMotion();

      if (open) {
        wasOpen.current = true;
        lockScroll();
        gsap.set(el, { autoAlpha: 1 });
        if (reduce) {
          gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        } else {
          gsap
            .timeline()
            .fromTo(
              el,
              { clipPath: "inset(0% 0% 100% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power4.inOut" },
            )
            .fromTo(
              "[data-menu-link]",
              { yPercent: 110 },
              { yPercent: 0, duration: 0.8, stagger: 0.06, ease: "power3.out" },
              "-=0.35",
            )
            .fromTo(
              "[data-menu-fade]",
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.03 },
              "<0.1",
            );
        }
        el.querySelector<HTMLElement>("[data-menu-close]")?.focus({ preventScroll: true });
        return;
      }

      if (!wasOpen.current) return;
      wasOpen.current = false;

      // A menu link started a page transition: stay put until the panel covers us, then vanish underneath.
      if (isCovered()) {
        unlockScroll(false);
        gsap.to(el, { autoAlpha: 0, duration: 0, delay: 0.8 });
        return;
      }

      unlockScroll();
      if (reduce) {
        gsap.to(el, { autoAlpha: 0, duration: 0.2 });
      } else {
        gsap.to(el, {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.7,
          ease: "power4.inOut",
          onComplete: () => gsap.set(el, { autoAlpha: 0 }),
        });
      }
    },
    { dependencies: [open], scope: ref, revertOnUpdate: false },
  );

  // Escape closes, Tab stays inside the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Any link click inside the menu closes it.
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("a")) onClose();
  };

  return (
    <div
      id="site-menu"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t("a11y.mainNav")}
      inert={!open}
      onClick={onClick}
      data-lenis-prevent
      className="invisible fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg"
    >
      <div className="container-site flex h-[var(--header-h)] shrink-0 items-center justify-between">
        <Brand />
        <div className="flex items-center gap-4 lg:gap-8">
          <LanguageSwitch className="hidden sm:flex" />
          <button
            type="button"
            data-menu-close
            data-magnetic
            onClick={onClose}
            className="label inline-flex min-h-11 items-center gap-3 text-ivory"
          >
            <span>{t("header.close")}</span>
            <span aria-hidden className="relative block size-5">
              <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-gold" />
              <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-gold" />
            </span>
          </button>
        </div>
      </div>

      <div className="container-site grid flex-1 gap-y-14 py-10 lg:grid-cols-12 lg:gap-x-6 lg:py-16">
        <nav aria-label={t("a11y.mainNav")} className="lg:col-span-7">
          <p data-menu-fade className="label mb-6 text-muted">
            {t("menu.explore")}
          </p>
          <ul className="space-y-1">
            {mainLinks.map((link) => (
              <li key={link.key} className="overflow-hidden">
                <Link
                  href={link.href}
                  data-menu-link
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="inline-block py-1 font-serif text-64 leading-[1.1] text-ivory transition-colors hover:text-gold-light aria-[current=page]:text-gold"
                >
                  {t(`nav.${link.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4 lg:col-start-9">
          <p data-menu-fade className="label mb-6 text-muted">
            {t("menu.watches")}
          </p>
          <ul>
            {products.map((w) => (
              <li key={w.slug} data-menu-fade className="hairline-b">
                <Link
                  href={`/watch/${w.slug}`}
                  className="flex min-h-12 items-center justify-between gap-4 py-2 text-ivory transition-colors hover:text-gold-light"
                >
                  <span dir="ltr">{w.name}</span>
                  <span dir="ltr" className="label tabular text-muted">
                    {w.ref}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        data-menu-fade
        className="container-site hairline-t flex shrink-0 flex-wrap items-center justify-between gap-4 py-6"
      >
        <p className="label text-muted">{t("menu.viewings")}</p>
        <LanguageSwitch className="sm:hidden" />
        <Link href={{ pathname: "/", hash: "visit" }} className="label text-gold hover:text-gold-light">
          {t("nav.visit")}
        </Link>
      </div>
    </div>
  );
}
