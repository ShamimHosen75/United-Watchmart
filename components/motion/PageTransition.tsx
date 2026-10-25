"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/layout/Brand";
import { prefersReducedMotion } from "@/lib/device";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";
import { setCovered } from "@/lib/page-state";

/** Runs after the next paint (two frames), with a timer fallback for background tabs. */
function afterPaint(fn: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  window.setTimeout(run, 150);
}

/** Internal link clicks that should get the panel transition. */
function transitionTarget(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = e.target instanceof Element ? e.target.closest("a") : null;
  if (!a || !a.href) return null;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.closest("[data-no-transition]")) {
    return null;
  }
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  // Same page (hash or query change only): let Next handle it without a cover.
  if (url.pathname === location.pathname) return null;
  return url;
}

/**
 * Panel covers the screen, the route changes underneath, stale ScrollTriggers are killed,
 * ScrollTrigger refreshes, then the panel lifts.
 */
export function PageTransition() {
  const panel = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const revealRef = useRef<(() => void) | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useGSAP(
    (_, contextSafe) => {
      const el = panel.current;
      if (!el || !contextSafe) return;
      let safety = 0;

      const reveal = contextSafe(() => {
        window.clearTimeout(safety);
        pending.current = false;
        // Kill triggers whose elements left with the old page.
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger instanceof Element && !st.trigger.isConnected) st.kill();
        });
        // Wait for the new page to paint before measuring.
        afterPaint(() => {
          ScrollTrigger.refresh();
          getLenis()?.start();
          setCovered(false);
          if (prefersReducedMotion()) {
            gsap.to(el, { autoAlpha: 0, duration: 0.25 });
          } else {
            gsap.to(el, {
              yPercent: -100,
              duration: 0.9,
              ease: "power4.inOut",
              onComplete: () => gsap.set(el, { autoAlpha: 0 }),
            });
          }
        });
      });

      const cover = contextSafe((href: string) => {
        pending.current = true;
        setCovered(true);
        getLenis()?.stop();
        const go = () => {
          router.push(href, { scroll: false });
          safety = window.setTimeout(reveal, 5000); // never leave the panel down (real timer, not the ticker)
        };
        if (prefersReducedMotion()) {
          gsap.fromTo(el, { autoAlpha: 0, yPercent: 0 }, { autoAlpha: 1, duration: 0.25, onComplete: go });
        } else {
          gsap.fromTo(
            el,
            { autoAlpha: 1, yPercent: 100 },
            { yPercent: 0, duration: 0.75, ease: "power4.inOut", onComplete: go },
          );
        }
      });

      revealRef.current = reveal;

      const onClick = (e: MouseEvent) => {
        const url = transitionTarget(e);
        if (!url) return;
        e.preventDefault(); // next/link skips its own navigation when the click is prevented
        if (pending.current) return;
        cover(url.pathname + url.search + url.hash);
      };

      // Capture phase on window runs before React's handlers on the document.
      window.addEventListener("click", onClick, true);
      return () => window.removeEventListener("click", onClick, true);
    },
    { scope: panel },
  );

  useEffect(() => {
    if (pending.current) revealRef.current?.();
  }, [pathname]);

  return (
    <div
      ref={panel}
      aria-hidden="true"
      className="invisible fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-surface"
    >
      <Wordmark className="text-40" />
      <span className="block h-px w-24 bg-gold" />
    </div>
  );
}
