"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const HALF_PI = Math.PI / 2;
const LINKS = 6;

/**
 * A watch built from primitives, used until the real hero.glb arrives.
 * Object names match data/hero.ts and data/anatomy.ts so the same timeline drives either model.
 * The dial faces +z; the bracelet runs along y.
 */
export function PlaceholderWatch() {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const second = useRef<THREE.Group>(null);

  const m = useMemo(
    () => ({
      gold: new THREE.MeshPhysicalMaterial({ color: "#d9ad5f", metalness: 1, roughness: 0.2, clearcoat: 0.4 }),
      steel: new THREE.MeshPhysicalMaterial({ color: "#c9ccd1", metalness: 1, roughness: 0.28 }),
      // Case middle is an open ring, so its inner wall must render too.
      caseRing: new THREE.MeshPhysicalMaterial({ color: "#c9ccd1", metalness: 1, roughness: 0.28, side: THREE.DoubleSide }),
      brass: new THREE.MeshPhysicalMaterial({ color: "#b8925a", metalness: 1, roughness: 0.38 }),
      dial: new THREE.MeshPhysicalMaterial({
        color: "#213c85",
        metalness: 0.3,
        roughness: 0.4,
        envMapIntensity: 0.8,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      }),
      crystal: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.08,
        envMapIntensity: 0.08,
        specularIntensity: 0.3,
        depthWrite: false,
      }),
      ruby: new THREE.MeshPhysicalMaterial({ color: "#8b1d2c", metalness: 0.2, roughness: 0.2 }),
    }),
    [],
  );

  // Hands show the real time.
  useFrame(() => {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + min / 60;
    if (second.current) second.current.rotation.z = -(s / 60) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });

  const link = (i: number, dir: 1 | -1) => {
    const y = dir * (1.2 + i * 0.29);
    const z = -0.02 - i * i * 0.014;
    return (
      <group key={i} position={[0, y, z]} rotation={[dir * -0.09 * i, 0, 0]}>
        <mesh material={m.steel} position={[-0.34, 0, 0]}>
          <boxGeometry args={[0.26, 0.25, 0.15]} />
        </mesh>
        <mesh material={m.gold} position={[0, 0, 0.01]}>
          <boxGeometry args={[0.4, 0.25, 0.15]} />
        </mesh>
        <mesh material={m.steel} position={[0.34, 0, 0]}>
          <boxGeometry args={[0.26, 0.25, 0.15]} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* Case with lugs and crown */}
      <group name="Case">
        {/* Open ring: the front stays clear so the dial shows; the case back closes the rear. */}
        <mesh material={m.caseRing} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.34, 96, 1, true]} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sy) => (
            <mesh key={`${sx}${sy}`} material={m.steel} position={[sx * 0.52, sy * 1.0, -0.02]}>
              <boxGeometry args={[0.2, 0.42, 0.22]} />
            </mesh>
          )),
        )}
        <mesh name="Crown" material={m.steel} position={[1.08, 0, 0]} rotation={[0, 0, HALF_PI]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 32]} />
        </mesh>
      </group>

      <mesh name="Bezel" material={m.gold} position={[0, 0, 0.19]}>
        <torusGeometry args={[0.95, 0.085, 32, 128]} />
      </mesh>

      <mesh name="Crystal" material={m.crystal} position={[0, 0, 0.25]} rotation={[HALF_PI, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.04, 96]} />
      </mesh>

      <mesh name="Dial" material={m.dial} position={[0, 0, 0.15]} rotation={[HALF_PI, 0, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.03, 96]} />
      </mesh>

      <group name="Indices" position={[0, 0, 0.17]}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const long = i % 3 === 0;
          return (
            <mesh key={i} material={m.gold} position={[Math.sin(a) * 0.74, Math.cos(a) * 0.74, 0]} rotation={[0, 0, -a]}>
              <boxGeometry args={[long ? 0.06 : 0.04, long ? 0.16 : 0.1, 0.02]} />
            </mesh>
          );
        })}
      </group>

      <group name="Hand_Hour" ref={hour} position={[0, 0, 0.19]}>
        <mesh material={m.gold} position={[0, 0.2, 0]}>
          <boxGeometry args={[0.06, 0.42, 0.012]} />
        </mesh>
      </group>
      <group name="Hand_Minute" ref={minute} position={[0, 0, 0.2]}>
        <mesh material={m.gold} position={[0, 0.3, 0]}>
          <boxGeometry args={[0.04, 0.62, 0.012]} />
        </mesh>
      </group>
      <group name="Hand_Second" ref={second} position={[0, 0, 0.21]}>
        <mesh material={m.gold} position={[0, 0.26, 0]}>
          <boxGeometry args={[0.014, 0.74, 0.01]} />
        </mesh>
        <mesh material={m.gold} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
        </mesh>
      </group>

      {/* Movement: main plate, gears and jewels */}
      <group name="Movement" position={[0, 0, 0.03]}>
        <mesh material={m.brass} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[0.84, 0.84, 0.1, 96]} />
        </mesh>
        {[
          [0.3, 0.25, 0.22],
          [-0.28, 0.32, 0.16],
          [-0.1, -0.35, 0.2],
        ].map(([x, y, r], i) => (
          <mesh key={i} material={m.gold} position={[x!, y!, -0.07]}>
            <torusGeometry args={[r!, 0.025, 12, 48]} />
          </mesh>
        ))}
        {[
          [0.3, 0.25],
          [-0.28, 0.32],
          [-0.1, -0.35],
          [0.45, -0.3],
        ].map(([x, y], i) => (
          <mesh key={i} material={m.ruby} position={[x!, y!, -0.06]} rotation={[HALF_PI, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 16]} />
          </mesh>
        ))}
      </group>
      <group name="Balance_Wheel" position={[0.42, -0.28, -0.04]}>
        <mesh material={m.gold}>
          <torusGeometry args={[0.16, 0.018, 12, 48]} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} material={m.gold} rotation={[0, 0, (i * Math.PI) / 2]}>
            <boxGeometry args={[0.32, 0.012, 0.01]} />
          </mesh>
        ))}
      </group>
      <mesh name="Rotor" material={m.gold} position={[0, 0, -0.06]} rotation={[HALF_PI, 0, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.03, 64, 1, false, 0, Math.PI]} />
      </mesh>

      <mesh name="Caseback" material={m.steel} position={[0, 0, -0.17]} rotation={[HALF_PI, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.06, 96]} />
      </mesh>

      <group name="Bracelet_Top">{Array.from({ length: LINKS }, (_, i) => link(i, 1))}</group>
      <group name="Bracelet_Bottom">
        {Array.from({ length: LINKS }, (_, i) => link(i, -1))}
        <mesh name="Clasp" material={m.steel} position={[0, -1.2 - LINKS * 0.29, -0.55]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.7, 0.22, 0.1]} />
        </mesh>
      </group>
    </group>
  );
}
