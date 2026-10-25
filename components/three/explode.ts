/**
 * Mutable state shared between the GSAP scroll timeline (writer) and the 3D scene / frame canvas (readers).
 * Plain numbers, so GSAP can tween them and useFrame can read them without React re-renders.
 */
export type ExplodeState = {
  /** Scroll progress through the pinned stage, 0 to 1. */
  progress: number;
  /** One entry per stage step, each tweened 0 (assembled) to 1 (fully apart). */
  parts: { v: number }[];
};

export const createExplodeState = (steps: number): ExplodeState => ({
  progress: 0,
  parts: Array.from({ length: steps }, () => ({ v: 0 })),
});
