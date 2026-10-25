"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stageSteps } from "@/data/hero";
import type { ExplodeState } from "./explode";
import { Studio, WatchModel } from "./Studio";

type Props = {
  state: ExplodeState;
  /** Render continuously only while the stage is on screen. */
  active: boolean;
  onReady: () => void;
};

const START_Y = -0.6; // three-quarter view as disassembly begins
const END_Y = -1.05; // turned further so parts behind the case come into view
const CAMERA_Z = [7.6, 8.8] as const; // dolly out as the watch spreads
const SPIN_SPEED = 0.35; // radians per second while idle

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Shortest-path interpolation between two angles. */
const lerpAngle = (from: number, to: number, t: number) => {
  const diff = ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + diff * t;
};

type Target = { obj: THREE.Object3D; base: THREE.Vector3; baseRot: THREE.Euler; step: number; off: (typeof stageSteps)[number]["meshes"][number] };

function WatchRig({ state, onReady }: Omit<Props, "active">) {
  const group = useRef<THREE.Group>(null);
  const targets = useRef<Target[] | null>(null);
  const spin = useRef(0.4);

  // Runs once the model (placeholder or GLB) is in the scene.
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const found: Target[] = [];
    stageSteps.forEach((step, i) =>
      step.meshes.forEach((off) => {
        const obj = root.getObjectByName(off.name);
        if (obj) found.push({ obj, base: obj.position.clone(), baseRot: obj.rotation.clone(), step: i, off });
      }),
    );
    targets.current = found;
    onReady();
  }, [onReady]);

  useFrame(({ camera }, delta) => {
    const g = group.current;
    if (!g) return;

    // Idle spin fades out as the disassembly starts, settling on a three-quarter view
    // that keeps turning gently so the rear parts come into view.
    const settle = smoothstep(0, 0.1, state.progress);
    const spread = smoothstep(0.1, 1, state.progress);
    spin.current += delta * SPIN_SPEED * (1 - settle);
    g.rotation.y = lerpAngle(spin.current, START_Y + (END_Y - START_Y) * spread, settle);
    g.rotation.x = 0.12 * settle;
    camera.position.z = CAMERA_Z[0] + (CAMERA_Z[1] - CAMERA_Z[0]) * spread;

    targets.current?.forEach(({ obj, base, baseRot, step, off }) => {
      const f = state.parts[step]?.v ?? 0;
      obj.position.set(base.x + (off.x ?? 0) * f, base.y + (off.y ?? 0) * f, base.z + (off.z ?? 0) * f);
      obj.rotation.x = baseRot.x + (off.rx ?? 0) * f;
      obj.rotation.y = baseRot.y + (off.ry ?? 0) * f;
    });
  });

  return (
    <group ref={group}>
      <WatchModel />
    </group>
  );
}

export default function HeroCanvas({ state, active, onReady }: Props) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.6, 7.6], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl, camera }) => {
        gl.toneMappingExposure = 1.05;
        camera.lookAt(0, 0, 0);
      }}
    >
      <Suspense fallback={null}>
        <Studio />
        <WatchRig state={state} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
