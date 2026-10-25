"use client";

import { useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/device";
import { gsap, useGSAP } from "@/lib/gsap";

const INTERACTIVE = 'a, button, [role="button"], label, select, summary, [data-cursor]';

/** Dot + ring cursor. Mouse and trackpad only; off for touch and reduced motion. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useGSAP((_, contextSafe) => {
    const d = dot.current;
    const r = ring.current;
    if (!d || !r || !contextSafe || !hasFinePointer() || prefersReducedMotion()) return;

    const html = document.documentElement;
    html.classList.add("has-cursor");
    gsap.set([d, r], { xPercent: -50, yPercent: -50 });

    const dotX = gsap.quickTo(d, "x", { duration: 0.12, ease: "power3" });
    const dotY = gsap.quickTo(d, "y", { duration: 0.12, ease: "power3" });
    const ringX = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });
    let visible = false;

    const move = contextSafe((e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      if (!visible) {
        visible = true;
        gsap.to([d, r], { autoAlpha: 1, duration: 0.3 });
      }
    });

    const over = contextSafe((e: PointerEvent) => {
      const hit = e.target instanceof Element && e.target.closest(INTERACTIVE);
      gsap.to(r, { scale: hit ? 1.8 : 1, duration: 0.35, ease: "power3.out" });
      gsap.to(d, { scale: hit ? 0 : 1, duration: 0.25 });
    });

    const leave = contextSafe(() => {
      visible = false;
      gsap.to([d, r], { autoAlpha: 0, duration: 0.3 });
    });

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over);
    html.addEventListener("pointerleave", leave);

    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      html.removeEventListener("pointerleave", leave);
      html.classList.remove("has-cursor");
    };
  });

  return (
    <>
      <div
        ref={ring}
        aria-hidden="true"
        className="pointer-events-none invisible fixed left-0 top-0 z-[100] size-9 rounded-full border border-gold/70"
      />
      <div
        ref={dot}
        aria-hidden="true"
        className="pointer-events-none invisible fixed left-0 top-0 z-[100] size-1.5 rounded-full bg-gold-light"
      />
    </>
  );
}
