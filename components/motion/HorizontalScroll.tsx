"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

type Props = { children: React.ReactNode; className?: string };

/**
 * A row that scrolls natively on phones and with reduced motion. On wider screens the parent
 * section pins and vertical scroll drives the row sideways (mirrored for RTL).
 */
export function HorizontalScroll({ children, className = "" }: Props) {
  const ref = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const track = ref.current;
      const section = track?.closest("section");
      if (!track || !section) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        track.setAttribute("data-pinned", "");
        const rtl = document.documentElement.dir === "rtl";
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        gsap.to(track, {
          x: () => (rtl ? 1 : -1) * distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            // Pin when the section is centred, or bottom-aligned if it is taller than the screen.
            start: () => (section.offsetHeight > window.innerHeight ? "bottom bottom" : "center center"),
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        ScrollTrigger.sort();
        ScrollTrigger.refresh();

        return () => track.removeAttribute("data-pinned");
      });
    },
    { scope: ref },
  );

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
