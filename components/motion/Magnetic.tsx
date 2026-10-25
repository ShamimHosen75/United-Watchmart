"use client";

import { hasFinePointer, prefersReducedMotion } from "@/lib/device";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Pulls any element with `data-magnetic` toward the pointer.
 * `data-magnetic="0.5"` sets the strength (default 0.3). Mounted once in the layout.
 */
export function Magnetic() {
  useGSAP((_, contextSafe) => {
    if (!contextSafe || !hasFinePointer() || prefersReducedMotion()) return;

    let active: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let xTo: gsap.QuickToFunc | null = null;
    let yTo: gsap.QuickToFunc | null = null;

    const release = contextSafe((el: HTMLElement) => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)", overwrite: true });
    });

    const move = contextSafe((e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-magnetic]") : null;

      if (el !== active) {
        if (active) release(active);
        active = el;
        if (el) {
          rect = el.getBoundingClientRect();
          xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
          yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
        }
      }
      if (!active || !rect || !xTo || !yTo) return;

      const strength = Number(active.dataset.magnetic) || 0.3;
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    });

    const leave = contextSafe(() => {
      if (active) release(active);
      active = null;
    });

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  });

  return null;
}
