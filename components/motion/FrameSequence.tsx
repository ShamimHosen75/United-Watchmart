"use client";

import { useEffect, useRef } from "react";
import { heroFrames } from "@/data/hero";
import { gsap } from "@/lib/gsap";
import type { ExplodeState } from "@/components/three/explode";

const FIRST_BATCH = 30;

type Props = { state: ExplodeState; onReady: () => void };

/**
 * Frames-mode fallback: draws frame round(progress × (N − 1)) on a 2D canvas.
 * Loads the first 30 frames immediately, then the rest in the background.
 */
export function FrameSequence({ state, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || heroFrames.count === 0) return;

    const n = heroFrames.count;
    const images: (HTMLImageElement | null)[] = Array(n).fill(null);
    let last = -1;
    let cancelled = false;

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          images[i] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = heroFrames.src(i);
      });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = el.clientWidth * dpr;
      el.height = el.clientHeight * dpr;
      last = -1; // force a redraw
    };

    // Nearest loaded frame, so scrubbing never shows a blank canvas.
    const nearest = (i: number) => {
      for (let d = 0; d < n; d++) {
        const a = images[i - d];
        if (a) return a;
        const b = images[i + d];
        if (b) return b;
      }
      return null;
    };

    const draw = () => {
      const index = Math.round(state.progress * (n - 1));
      if (index === last) return;
      const img = nearest(index);
      if (!img) return;
      last = index;
      const scale = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.drawImage(img, (el.width - w) / 2, (el.height - h) / 2, w, h);
    };

    resize();
    window.addEventListener("resize", resize);
    gsap.ticker.add(draw);

    const first = Array.from({ length: Math.min(FIRST_BATCH, n) }, (_, i) => load(i));
    Promise.all(first).then(async () => {
      if (cancelled) return;
      onReady();
      for (let i = FIRST_BATCH; i < n && !cancelled; i += 10) {
        await Promise.all(Array.from({ length: Math.min(10, n - i) }, (_, k) => load(i + k)));
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      gsap.ticker.remove(draw);
    };
  }, [state, onReady]);

  return <canvas ref={canvas} className="size-full" />;
}
