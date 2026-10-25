"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { heroModel } from "@/data/hero";

/**
 * The real hero model (Draco geometry + KTX2 textures, compressed with gltf-transform).
 * Decoders are self-hosted in /public/draco and /public/basis.
 */
export function GltfWatch() {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(heroModel.src, "/draco/", false, (loader) => {
    const ktx2 = new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl);
    // three-stdlib's GLTFLoader accepts three's KTX2Loader at runtime; the types differ slightly.
    loader.setKTX2Loader(ktx2 as unknown as Parameters<typeof loader.setKTX2Loader>[0]);
  });
  return <primitive object={scene} />;
}
