"use client";

import { useRef } from "react";
import { prefersReducedMotion } from "@/lib/device";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { isCovered, whenUncovered } from "@/lib/page-state";

type Props = { children: string; className?: string };

/**
 * Hero h1 with a masked line-by-line rise (SplitText).
 * Animates only when the page arrives under the page-transition panel, so on a first visit the
 * text is painted immediately (good for LCP) and it never flashes away and back.
 * Elements marked `data-hero-fade` in the same section fade up with it.
 */
export function HeroTitle({ children, className = "" }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      // Under the first-visit preloader the curtain lift is the entrance. Hiding and re-showing
      // the text there would make it a late LCP paint, so only animate under the transition panel.
      const preloading = document.documentElement.classList.contains("is-loading");
      if (!el || !contextSafe || prefersReducedMotion() || !isCovered() || preloading) return;
      const fades = el.closest("section")?.querySelectorAll<HTMLElement>("[data-hero-fade]") ?? [];

      // Line breaks depend on the real font, so split once fonts are ready.
      document.fonts.ready.then(
        contextSafe(() => {
          if (!isCovered()) return; // cover already gone: leave the text as it is
          // Words only, never chars: splitting Arabic letters would break their joins.
          const split = SplitText.create(el, { type: "lines", mask: "lines" });
          gsap.set(split.lines, { yPercent: 110 });
          gsap.set(fades, { autoAlpha: 0, y: 24 });

          whenUncovered().then(
            contextSafe(() => {
              gsap
                .timeline({ onComplete: () => split.revert() })
                .to(split.lines, { yPercent: 0, duration: 1.2, stagger: 0.12, ease: "power4.out" })
                .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.7");
            }),
          );
        }),
      );
    },
    { scope: ref },
  );

  return (
    <h1 ref={ref} className={className}>
      {children}
    </h1>
  );
}
