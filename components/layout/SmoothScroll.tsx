"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { prefersReducedMotion } from "@/lib/device";
import { ScrollTrigger } from "@/lib/gsap";
import { initHashScroll, scrollToHashOrTop } from "@/lib/hash-scroll";
import { createLenis, setLenis } from "@/lib/lenis";

/** Starts Lenis (unless reduced motion) and handles scroll position on route change. */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const stopHash = initHashScroll();
    if (prefersReducedMotion()) return stopHash;
    const { lenis, destroy } = createLenis();
    setLenis(lenis);
    return () => {
      stopHash();
      setLenis(null);
      destroy();
    };
  }, []);

  useEffect(() => {
    // Measure first (pins add height), then jump to the #hash or the top.
    ScrollTrigger.refresh();
    scrollToHashOrTop();
  }, [pathname]);

  return null;
}
