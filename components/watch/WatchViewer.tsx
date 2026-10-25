"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Studio, WatchModel } from "@/components/three/Studio";

/** Drag-to-rotate 3D viewer for watch pages. Loaded only when someone asks for it. */
export default function WatchViewer() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [2.2, 0.8, 6.4], fov: 32 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      className="touch-none"
    >
      <Suspense fallback={null}>
        <Studio />
        <WatchModel />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.6}
        enableDamping
      />
    </Canvas>
  );
}
