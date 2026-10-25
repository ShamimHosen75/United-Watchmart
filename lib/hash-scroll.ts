"use client";

import { ScrollTrigger } from "./gsap";
import { getLenis } from "./lenis";

/**
 * Scrolling to #anchors on arrival.
 * Pinned sections add their scroll length only after ScrollTrigger refreshes, which moves
 * the target. So the jump is repeated after each refresh for a short window, and dropped
 * as soon as the visitor scrolls themselves.
 */

const WINDOW_MS = 3000;
let pendingId: string | null = null;
let until = 0;

function apply() {
  if (!pendingId || performance.now() > until) {
    pendingId = null;
    return;
  }
  const el = document.getElementById(pendingId);
  if (!el) return;
  jumpTo(el);
}

/** Lenis caches the page height (and clamps to it), so re-measure before jumping. */
function jumpTo(target: HTMLElement | 0) {
  const lenis = getLenis();
  if (lenis) {
    lenis.resize();
    lenis.scrollTo(target, { immediate: true, force: true });
  } else if (target === 0) window.scrollTo(0, 0);
  else target.scrollIntoView();
}

/** Call on arrival at a URL. Scrolls to the hash target, or to the top when there is none. */
export function scrollToHashOrTop() {
  const hash = window.location.hash.slice(1);
  const target = hash ? document.getElementById(decodeURIComponent(hash)) : null;
  if (target) {
    pendingId = target.id;
    until = performance.now() + WINDOW_MS;
    apply();
    return;
  }
  pendingId = null;
  jumpTo(0);
}

/** Wires the listeners once. Returns a cleanup function. */
export function initHashScroll() {
  const cancel = () => {
    pendingId = null;
  };
  const opts = { passive: true } as const;
  window.addEventListener("wheel", cancel, opts);
  window.addEventListener("touchstart", cancel, opts);
  window.addEventListener("keydown", cancel);
  ScrollTrigger.addEventListener("refresh", apply);
  return () => {
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
    ScrollTrigger.removeEventListener("refresh", apply);
  };
}
