"use client";

import { useRef } from "react";
import type { Locale } from "@/i18n/routing";
import { prefersReducedMotion } from "@/lib/device";
import { formatNumber } from "@/lib/format";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

type Props = { value: number; locale: Locale };

/** Counts from 0 to `value` when scrolled into view. Server HTML shows the final number. */
export function CountUp({ value, locale }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const counter = { v: 0 };
      const render = () => {
        el.textContent = formatNumber(Math.round(counter.v), locale);
      };
      render();
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.to(counter, { v: value, duration: 1.8, ease: "power2.out", onUpdate: render }),
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="tabular">
      {formatNumber(value, locale)}
    </span>
  );
}
