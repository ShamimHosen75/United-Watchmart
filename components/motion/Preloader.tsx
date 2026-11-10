"use client";

import { useRef } from "react";
import { Wordmark } from "@/components/layout/Brand";
import { prefersReducedMotion } from "@/lib/device";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";
import { getProgress, imagesReady, trackPromise, windowLoaded } from "@/lib/loader";
import { SESSION_KEY, setCovered } from "@/lib/page-state";

const MIN_MS = 1200; // never flash past faster than this
const MAX_MS = 6000; // never hold the visitor longer than this

/**
 * First-visit preloader. Visible only while <html> has `is-loading`, which the head script
 * adds before first paint. The counter follows real asset progress (see lib/loader.ts).
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      window.__uwmReady = true;
      const html = document.documentElement;
      const el = root.current;
      if (!el || !html.classList.contains("is-loading")) {
        setCovered(false);
        return;
      }

      getLenis()?.stop();
      trackPromise("fonts", document.fonts.ready);
      trackPromise("window", windowLoaded());
      trackPromise("images", windowLoaded().then(() => imagesReady()));

      const startedAt = performance.now();
      let shown = 0;
      let exiting = false;

      const render = () => {
        if (count.current) count.current.textContent = String(Math.round(shown));
        if (bar.current) gsap.set(bar.current, { scaleX: shown / 100 });
      };

      const finish = () => {
        html.classList.remove("is-loading");
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* private mode: the preloader will simply show again next time */
        }
        getLenis()?.start();
        setCovered(false);
      };

      const exit = () => {
        exiting = true;
        gsap.ticker.remove(tick);
        shown = 100;
        render();
        ScrollTrigger.refresh();

        if (prefersReducedMotion()) {
          gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: finish });
          return;
        }
        gsap
          .timeline({ onComplete: finish })
          .to("[data-preloader-content]", { autoAlpha: 0, y: -24, duration: 0.5, ease: "power2.in" })
          .to(el, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "-=0.15")
          // Let entrance animations start while the curtain is still lifting.
          .add(() => setCovered(false), "-=0.55");
      };

      const tick = () => {
        const elapsed = performance.now() - startedAt;
        const real = getProgress() * 100;
        const target = elapsed >= MAX_MS ? 100 : Math.min(real, (elapsed / MIN_MS) * 100);
        shown += (target - shown) * 0.12;
        if (target - shown < 0.5) shown = target;
        render();
        if (!exiting && shown >= 100) exit();
      };

      gsap.ticker.add(tick);

      // Hard cap on a real timer: animation frames pause in background tabs, timers don't.
      const failsafe = window.setTimeout(() => {
        if (!html.classList.contains("is-loading")) return;
        gsap.ticker.remove(tick);
        gsap.set(el, { autoAlpha: 0 });
        finish();
      }, MAX_MS + 2000);

      return () => {
        gsap.ticker.remove(tick);
        window.clearTimeout(failsafe);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="preloader fixed inset-0 z-[90] hidden flex-col bg-bg">
      <div data-preloader-content className="container-site flex flex-1 flex-col justify-between py-8 lg:py-12">
        <p className="label text-muted">Automatic watchmaking</p>
        <Wordmark className="self-center text-64" />
        <div>
          <div className="flex items-end justify-end">
            <span className="tabular font-serif text-96 leading-none text-gold">
              <span ref={count}>0</span>
              <span className="text-40">%</span>
            </span>
          </div>
          <span className="mt-6 block h-px w-full bg-hairline">
            <span
              ref={bar}
              className="block h-full w-full origin-[0%_50%] scale-x-0 bg-gold"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
