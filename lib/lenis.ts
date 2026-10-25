"use client";

import Lenis from "lenis";
import { useSyncExternalStore } from "react";
import { gsap, ScrollTrigger } from "./gsap";

/** Creates Lenis and drives it from the GSAP ticker so ScrollTrigger stays in sync. */
export function createLenis() {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    autoRaf: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const destroy = () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };

  return { lenis, destroy };
}

// A tiny store so any component can read the active Lenis instance.
let current: Lenis | null = null;
const listeners = new Set<() => void>();

export const getLenis = () => current;

export function setLenis(lenis: Lenis | null) {
  current = lenis;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The active Lenis instance, or null when smooth scroll is off (reduced motion). */
export const useLenis = () => useSyncExternalStore(subscribe, getLenis, () => null);

/** Stops page scrolling. Works with or without Lenis. */
export function lockScroll() {
  current?.stop();
  document.documentElement.style.overflow = "hidden";
}

/** Restores page scrolling. Pass `restartLenis: false` when another owner (the page transition) keeps it stopped. */
export function unlockScroll(restartLenis = true) {
  document.documentElement.style.overflow = "";
  if (restartLenis) current?.start();
}
