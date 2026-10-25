/** Client-side capability checks. Every function is safe to call during SSR (returns a conservative default). */

import { heroFrames } from "@/data/hero";

export type RenderMode = "three" | "frames" | "static";

const isBrowser = () => typeof window !== "undefined";

export const prefersReducedMotion = () =>
  isBrowser() && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True for a mouse or trackpad (custom cursor and magnetic buttons only run here). */
export const hasFinePointer = () =>
  isBrowser() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export const isSmallScreen = () => isBrowser() && window.innerWidth < 768;

export function hasWebGL2() {
  if (!isBrowser()) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** Rough low-power guess from hardware and network hints. */
export function isLowPower() {
  if (!isBrowser()) return true;
  const nav = navigator as NavigatorHints;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const saveData = nav.connection?.saveData === true;
  const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
  return saveData || slowNet || (fewCores && lowMemory);
}

let cachedMode: RenderMode | null = null;

/**
 * Picks how the hero disassembly renders on this device (computed once per page load).
 * - static: phones under 768 px, reduced motion, or no better option
 * - three: WebGL2 and not low power
 * - frames: everything else, when a frame sequence exists
 */
export function getRenderMode(): RenderMode {
  if (!isBrowser()) return "static";
  if (cachedMode) return cachedMode;
  if (prefersReducedMotion() || isSmallScreen()) cachedMode = "static";
  else if (hasWebGL2() && !isLowPower()) cachedMode = "three";
  else cachedMode = heroFrames.count > 0 ? "frames" : "static";
  return cachedMode;
}
