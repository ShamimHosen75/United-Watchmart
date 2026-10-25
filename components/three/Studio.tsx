"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { heroModel } from "@/data/hero";
import { GltfWatch } from "./GltfWatch";
import { PlaceholderWatch } from "./PlaceholderWatch";

/** Studio lighting built from light panels (no HDRI download). Shared by every watch canvas. */
export function Studio() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* soft fill from above the camera: lifts steel without being mirrored straight back by flat glass */}
        <Lightformer form="rect" intensity={0.7} position={[0, 7, 6]} rotation-x={Math.PI / 4} scale={[14, 5, 1]} />
        {/* gentle front fill so metal facing the camera has something to reflect */}
        <Lightformer form="rect" intensity={0.45} position={[0, 1, 9]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={3} position={[0, 5, 3]} rotation-x={Math.PI / 2.5} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} position={[6, 0, 1]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, 0, -8]} scale={[12, 6, 1]} />
        <Lightformer form="ring" color="#e6c88a" intensity={1.5} position={[3, 2, 6]} scale={2.5} />
        <Lightformer form="circle" intensity={0.8} position={[0, -5, 2]} rotation-x={-Math.PI / 2} scale={5} />
      </Environment>
      <directionalLight position={[3, 4, 5]} intensity={0.6} />
    </>
  );
}

/** The real GLB once it exists, otherwise the placeholder built in code. */
export function WatchModel() {
  return heroModel.ready ? <GltfWatch /> : <PlaceholderWatch />;
}
