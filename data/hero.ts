/**
 * Hero disassembly settings.
 * Swap in real assets by flipping `heroModel.ready` or setting `heroFrames.count`.
 */

export const heroModel = {
  src: "/models/hero.glb",
  /** Set to true once public/models/hero.glb exists. Until then a placeholder watch built in code is used. */
  ready: false,
};

export const heroFrames = {
  /** Number of files in public/frames/hero (0001.webp …). 0 means frames mode falls back to static. */
  count: 0,
  src: (i: number) => `/frames/hero/${String(i + 1).padStart(4, "0")}.webp`,
  width: 1600,
  height: 1000,
};

/** How far a mesh travels when its step is fully exploded. Units are scene units; r* are radians. */
export type MeshOffset = { name: string; x?: number; y?: number; z?: number; rx?: number; ry?: number };

export type StageStep = {
  id: "crystal" | "bezel" | "hands" | "dial" | "movement" | "caseback" | "bracelet";
  meshes: MeshOffset[];
};

/** Order of the disassembly. Captions live in messages under home.stage.steps.<id>. */
export const stageSteps: readonly StageStep[] = [
  { id: "crystal", meshes: [{ name: "Crystal", z: 1.9, y: 0.35, rx: -0.3 }] },
  { id: "bezel", meshes: [{ name: "Bezel", z: 1.45, y: 0.15, rx: -0.2 }] },
  {
    id: "hands",
    meshes: [
      { name: "Hand_Hour", z: 1.0 },
      { name: "Hand_Minute", z: 1.08 },
      { name: "Hand_Second", z: 1.16 },
    ],
  },
  {
    id: "dial",
    meshes: [
      { name: "Dial", z: 0.6, rx: -0.08 },
      { name: "Indices", z: 0.62, rx: -0.08 },
    ],
  },
  {
    id: "movement",
    meshes: [
      { name: "Movement", z: -1.0 },
      { name: "Balance_Wheel", z: -0.85, y: 0.15 },
      { name: "Rotor", z: -1.35, ry: 0.25 },
    ],
  },
  { id: "caseback", meshes: [{ name: "Caseback", z: -1.95, rx: 0.25 }] },
  {
    id: "bracelet",
    meshes: [
      { name: "Bracelet_Top", y: 0.95, rx: -0.15 },
      { name: "Bracelet_Bottom", y: -0.95, rx: 0.15 },
    ],
  },
];
