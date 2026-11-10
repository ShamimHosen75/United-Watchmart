"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Studio, WatchModel } from "./Studio";

type Props = {
  /** Render frames only while the hero is on screen and the tab is visible. */
  active: boolean;
  /** Mouse tilt (desktop only). */
  interactive: boolean;
  /** Called after the first frame is drawn, so the static image can fade out. */
  onReady: () => void;
};

const SPIN_SPEED = 0.22; // radians per second: slow, like a display turntable
const TILT = 0.22; // max mouse tilt in radians
const BASE_TILT_X = 0.18; // dial leans slightly towards the viewer
const BASE_ROLL = -0.32; // diagonal pose, like a catalogue shot

/** Shared between the window listeners and the render loop without re-rendering React. */
type Input = { px: number; py: number; scroll: number };

function FloatingWatch({ input, onReady }: { input: React.RefObject<Input>; onReady: () => void }) {
  const turn = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef(-0.5);
  const scrollSmooth = useRef(0);
  const reported = useRef(false);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05); // no jump after the tab was hidden
    const t = turn.current;
    const g = tilt.current;
    if (!t || !g) return;
    const { px, py, scroll } = input.current;

    scrollSmooth.current = THREE.MathUtils.damp(scrollSmooth.current, scroll, 6, delta);
    const s = scrollSmooth.current;

    // Slow turntable spin; scrolling past the hero turns it a little further.
    spin.current += delta * SPIN_SPEED;
    t.rotation.y = spin.current + s * 1.2;

    // Mouse tilt and a gentle float, both eased so nothing snaps.
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, BASE_TILT_X + py * TILT, 3, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, px * TILT, 3, delta);
    g.rotation.z = BASE_ROLL + s * 0.25;
    g.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.06 + s * 0.6;
    g.position.x = THREE.MathUtils.damp(g.position.x, px * 0.12, 3, delta);

    if (!reported.current) {
      reported.current = true;
      // Wait one more frame so the environment map has been applied.
      requestAnimationFrame(onReady);
    }
  });

  return (
    <group ref={tilt}>
      <group ref={turn}>
        <WatchModel />
      </group>
    </group>
  );
}

export default function HeroWatchCanvas({ active, interactive, onReady }: Props) {
  const input = useRef<Input>({ px: 0, py: 0, scroll: 0 });

  useEffect(() => {
    const onScroll = () => {
      input.current.scroll = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
    };
    const onMove = (e: PointerEvent) => {
      input.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      input.current.px = 0;
      input.current.py = 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive]);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, interactive ? 1.75 : 1.5]}
      camera={{ position: [0, 0.2, 10.5], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl, camera }) => {
        gl.toneMappingExposure = 1.05;
        camera.lookAt(0, 0, 0);
      }}
    >
      <Suspense fallback={null}>
        <Studio />
        <FloatingWatch input={input} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
