type Localized = { en: string };
type Vec3 = [number, number, number];

export type AnatomyPart = {
  id: "crystal" | "bezel" | "dial" | "movement" | "case" | "bracelet";
  title: Localized;
  does: Localized;
  made: Localized;
  /** Mesh names in /models/hero.glb that belong to this part. */
  meshes: string[];
  /** Camera preset used by the Anatomy page when this chapter is active (the watch faces +z). */
  camera: { position: Vec3; target: Vec3 };
};

export const anatomy: readonly AnatomyPart[] = [
  {
    id: "crystal",
    title: { en: "Sapphire crystal" },
    does: {
      en: "The crystal seals the face of the watch and keeps dust and water out. It has to stay perfectly clear for decades, so it is made from a material that only diamond can scratch.",
    },
    made: {
      en: "Synthetic sapphire is grown as a single crystal at over 2,000 °C, sliced, then ground and polished into a gentle dome. An anti-reflective coating on the inside removes glare without making the surface fragile.",
    },
    meshes: ["Crystal", "Crystal_Gasket"],
    camera: { position: [0.6, 0.5, 4.2], target: [0, 0, 0.2] },
  },
  {
    id: "bezel",
    title: { en: "Bezel" },
    does: {
      en: "The bezel is the ring that holds the crystal in place. On sports models it also carries a scale, such as a tachymeter, for reading speed or elapsed time at a glance.",
    },
    made: {
      en: "Gold bezels are turned from a solid ring on a lathe, then polished by hand. Ceramic bezels are pressed from powder, fired in a kiln and engraved, so their colour and numerals never fade.",
    },
    meshes: ["Bezel", "Bezel_Insert"],
    camera: { position: [2.2, 1.4, 3.4], target: [0, 0, 0.1] },
  },
  {
    id: "dial",
    title: { en: "Dial and hands" },
    does: {
      en: "The dial and hands are how the watch speaks. Indices mark the hours, the hands point to them, and luminous material lets you read the time in the dark.",
    },
    made: {
      en: "A brass blank is stamped, then brushed in radiating lines to create the sunburst before it is lacquered. Indices are set by hand one at a time. Hands are cut, faceted and balanced so they move evenly.",
    },
    meshes: ["Dial", "Indices", "Hand_Hour", "Hand_Minute", "Hand_Second"],
    camera: { position: [0, 0, 3.6], target: [0, 0, 0] },
  },
  {
    id: "movement",
    title: { en: "Movement" },
    does: {
      en: "The movement is the engine. A spring stores energy, the gear train releases it in steps, and the balance wheel swings back and forth eight times a second to keep each step exactly the same length.",
    },
    made: {
      en: "Around two hundred parts are cut, finished and assembled by hand. Bridges are bevelled and decorated with stripes, and the rotor that winds the watch swings on a ball bearing with every move of the wrist.",
    },
    meshes: ["Movement", "Rotor", "Balance_Wheel"],
    camera: { position: [-1.8, -0.5, -3.4], target: [0, 0, 0] },
  },
  {
    id: "case",
    title: { en: "Case" },
    does: {
      en: "The case protects the movement from water, dust and knocks. The case back screws down against a gasket to seal it, and the crown lets you wind and set the watch without breaking that seal.",
    },
    made: {
      en: "Steel and gold cases are forged, then milled in many passes. Every surface is finished by hand, with brushed flanks and polished bevels, before the case is pressure-tested in water.",
    },
    meshes: ["Case", "Caseback", "Crown"],
    camera: { position: [3.6, 0.4, 1.4], target: [0, 0, 0] },
  },
  {
    id: "bracelet",
    title: { en: "Bracelet" },
    does: {
      en: "The bracelet holds the watch to the wrist and spreads its weight. A good one feels like fabric: every link moves freely, and the clasp opens easily but never by accident.",
    },
    made: {
      en: "Solid links are machined, then joined with screws rather than friction pins, so they can be adjusted and serviced. Each link is brushed or polished by hand to match the case.",
    },
    meshes: ["Bracelet_Top", "Bracelet_Bottom", "Clasp"],
    camera: { position: [1.2, -3.6, 4.4], target: [0, -1.2, 0] },
  },
];

/** Camera before the first chapter: the whole watch. */
export const anatomyOverview: AnatomyPart["camera"] = { position: [2.4, 0.9, 6.8], target: [0, 0, 0] };
