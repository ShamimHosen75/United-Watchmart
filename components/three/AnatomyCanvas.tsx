"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { anatomy, anatomyOverview } from "@/data/anatomy";
import { Studio, WatchModel } from "./Studio";

/** Written by the chapter ScrollTriggers, read every frame. -1 = before the first chapter. */
export type AnatomyState = { active: number };

const FADED = 0.15;

type Props = { state: AnatomyState; active: boolean };

type Tracked = { mat: THREE.Material & { opacity: number }; base: number; parts: Set<number> };

/** Eases each mesh toward full or faded opacity. Kept outside React: it mutates three.js materials. */
function fadeParts(list: Tracked[], active: number, k: number) {
  for (const t of list) {
    const on = active < 0 || t.parts.has(active);
    const goal = t.base * (on ? 1 : FADED);
    t.mat.opacity += (goal - t.mat.opacity) * k;
    // Faded parts must not hide what is behind them.
    t.mat.depthWrite = t.mat.opacity > t.base * 0.95 && t.base === 1;
  }
}

function Rig({ state }: { state: AnatomyState }) {
  const group = useRef<THREE.Group>(null);
  const tracked = useRef<Tracked[]>([]);
  const target = useRef(new THREE.Vector3(...anatomyOverview.target));
  const goalPos = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3());

  // Give every mesh its own material (so opacity is per part) and note which chapters it belongs to.
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const partsOf = new Map<THREE.Object3D, Set<number>>();
    anatomy.forEach((part, i) =>
      part.meshes.forEach((name) =>
        root.getObjectByName(name)?.traverse((o) => {
          if (!partsOf.has(o)) partsOf.set(o, new Set());
          partsOf.get(o)!.add(i);
        }),
      ),
    );

    const list: Tracked[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = (o.material as THREE.Material).clone() as Tracked["mat"];
      const base = mat.transparent ? mat.opacity : 1;
      mat.transparent = true;
      o.material = mat;
      list.push({ mat, base, parts: partsOf.get(o) ?? new Set() });
    });
    tracked.current = list;
    return () => list.forEach((t) => t.mat.dispose());
  }, []);

  useFrame(({ camera }, delta) => {
    const k = 1 - Math.exp(-delta * 3); // frame-rate independent easing
    const preset = anatomy[state.active]?.camera ?? anatomyOverview;
    goalPos.current.set(...preset.position);
    goalTarget.current.set(...preset.target);
    camera.position.lerp(goalPos.current, k);
    target.current.lerp(goalTarget.current, k);
    camera.lookAt(target.current);

    fadeParts(tracked.current, state.active, k);
  });

  return (
    <group ref={group}>
      <WatchModel />
    </group>
  );
}

/** Sticky canvas on the Anatomy page: camera moves to each chapter's preset, other parts fade to 15%. */
export default function AnatomyCanvas({ state, active }: Props) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: anatomyOverview.position, fov: 32 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Suspense fallback={null}>
        <Studio />
        <Rig state={state} />
      </Suspense>
    </Canvas>
  );
}
