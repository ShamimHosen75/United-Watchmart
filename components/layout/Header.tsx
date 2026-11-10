"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { CartButton } from "@/components/cart/CartButton";
import { shopEnabled } from "@/lib/shop/config";
import { Brand } from "./Brand";
import { LanguageSwitch } from "./LanguageSwitch";
import { Menu } from "./Menu";

export function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();

  // Hide on scroll down, show on scroll up.
  useGSAP(
    () => {
      const el = headerRef.current;
      if (!el) return;
      let hidden = false;
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const shouldHide = self.direction === 1 && self.scroll() > 120;
          if (shouldHide === hidden) return;
          hidden = shouldHide;
          gsap.to(el, { yPercent: hidden ? -100 : 0, duration: 0.45, ease: "power3.out", overwrite: true });
        },
      });
    },
    { scope: headerRef },
  );

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 border-b border-hairline bg-bg/85 backdrop-blur-md"
      >
        <div className="container-site flex h-[var(--header-h)] items-center justify-between">
          <Brand />
          <div className="flex items-center gap-4 lg:gap-8">
            <LanguageSwitch className="hidden sm:flex" />
            {shopEnabled && <CartButton />}
            <button
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
              data-magnetic
              className="label group inline-flex min-h-11 items-center gap-3 text-ivory"
            >
              <span>{t("header.menu")}</span>
              <span aria-hidden className="flex w-7 flex-col gap-[6px]">
                <span className="h-px w-full bg-ivory transition-transform duration-300 group-hover:scale-x-75" />
                <span className="h-px w-full bg-ivory" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <Menu open={open} onClose={close} />
    </>
  );
}
