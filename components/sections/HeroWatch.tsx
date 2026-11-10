"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { WatchVisual } from "@/components/ui/WatchVisual";
import { hasFinePointer, hasWebGL2, isLowPower, prefersReducedMotion } from "@/lib/device";
import { windowLoaded } from "@/lib/loader";

// three.js is only downloaded once the page has finished loading (see below).
const HeroWatchCanvas = dynamic(() => import("@/components/three/HeroWatchCanvas"), { ssr: false });

type Props = { label: string; className?: string };

/** Starts the 3D upgrade once the browser is idle after load, so it never competes with first paint. */
const whenIdle = (fn: () => void) => {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(fn, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 600);
  return () => clearTimeout(id);
};

/**
 * Hero watch. The server sends the lightweight static watch (no image request, good for LCP).
 * Capable devices then swap in a slowly turning 3D watch that tilts with the mouse and turns on scroll.
 * Reduced motion, low-power devices and browsers without WebGL2 keep the static watch.
 */
export function HeroWatch({ label, className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion() || isLowPower() || !hasWebGL2()) return;
    let cancel = () => {};
    let stopped = false;
    windowLoaded().then(() => {
      if (stopped) return;
      cancel = whenIdle(() => {
        setInteractive(hasFinePointer());
        setEnabled(true);
      });
    });
    return () => {
      stopped = true;
      cancel();
    };
  }, []);

  // Pause rendering when the hero scrolls away or the tab is in the background.
  useEffect(() => {
    if (!enabled || !root.current) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)));
    io.observe(root.current);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div
      ref={root}
      role="img"
      aria-label={label}
      className={`overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_0%,#f6f4f0_50%,#ece7de_100%)] ${className}`}
    >
      <WatchVisual
        slug="heritage-42"
        label={label}
        decorative
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${ready ? "opacity-0" : "opacity-100"}`}
      />
      {/* Soft floor shadow under the floating 3D watch */}
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-[10%] left-1/2 h-[7%] w-[38%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(40,30,15,.22),transparent)] blur-md transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {enabled && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <HeroWatchCanvas active={onScreen && tabVisible} interactive={interactive} onReady={onReady} />
        </div>
      )}
    </div>
  );
}
