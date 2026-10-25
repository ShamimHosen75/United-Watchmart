"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { prefersReducedMotion } from "@/lib/device";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { whenUncovered } from "@/lib/page-state";

/**
 * Animates every `[data-reveal]` element (y 40 → 0, opacity 0 → 1) as it scrolls in.
 * CSS hides them only while <html> has the `js` class, so content shows without JavaScript.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    window.__uwmReady = true;
    let cancelled = false;
    let triggers: ScrollTrigger[] = [];

    whenUncovered().then(() => {
      if (cancelled) return;
      const all = gsap.utils.toArray<HTMLElement>("[data-reveal]:not([data-revealed])");
      const show = (els: Element[], stagger = 0.08) => {
        els.forEach((el) => el.setAttribute("data-revealed", ""));
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: prefersReducedMotion() ? 0.4 : 1,
          stagger,
          ease: "power3.out",
          overwrite: true,
        });
      };

      // Anything already scrolled past (back/forward, hash links) appears at once.
      const above = all.filter((el) => el.getBoundingClientRect().bottom < 0);
      if (above.length) show(above, 0);

      const rest = all.filter((el) => !above.includes(el));
      if (rest.length) {
        triggers = ScrollTrigger.batch(rest, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => show(batch),
        });
      }
    });

    return () => {
      cancelled = true;
      triggers.forEach((t) => t.kill());
    };
  }, [pathname]);

  return null;
}
