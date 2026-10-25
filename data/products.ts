export type Strap = "bracelet" | "leather" | "rubber";

export type Watch = {
  slug: string;
  ref: string;
  name: string;
  tagline: string;
  story: string;
  priceUsd: number;
  strap: Strap;
  specs: {
    caseMm: number;
    caseMaterial: string;
    bezel: string;
    dial: string;
    movement: string;
    powerReserveH: number;
    strapDetail: string;
    waterM: number;
  };
  images: { card: string; hover: string; hero: string; og: string };
  model?: string;
};

export const straps: readonly Strap[] = ["bracelet", "leather", "rubber"];

/** Image paths for a slug. Files are added when real photography arrives. */
const imagesFor = (slug: string): Watch["images"] => ({
  card: `/images/watches/${slug}/card.webp`,
  hover: `/images/watches/${slug}/hover.webp`,
  hero: `/images/watches/${slug}/hero.webp`,
  og: `/og/${slug}.jpg`,
});

export const products: readonly Watch[] = [
  {
    slug: "heritage-42",
    ref: "UW 1042.SG",
    name: "Heritage 42",
    tagline: "The watch the house is built on.",
    story:
      "Heritage 42 is where United WatchMart begins. A steel case, a bezel turned from solid 18k gold and a navy sunburst dial that shifts from ink to cobalt as the light moves. Inside, an automatic movement beats eight times a second and keeps running for three full days off the wrist.",
    priceUsd: 4900,
    strap: "bracelet",
    specs: {
      caseMm: 42,
      caseMaterial: "Stainless steel",
      bezel: "Polished 18k yellow gold",
      dial: "Navy sunburst",
      movement: "Automatic, 28,800 vph",
      powerReserveH: 72,
      strapDetail: "Steel and gold bracelet, folding clasp",
      waterM: 100,
    },
    images: imagesFor("heritage-42"),
    model: "/models/hero.glb",
  },
  {
    slug: "octane-gt",
    ref: "UW 2043.RB",
    name: "Octane GT",
    tagline: "Eight sides, one direction: forward.",
    story:
      "Octane GT takes its octagonal rose-gold bezel from the shape of a racing bolt. The black waffle dial is stamped for grip on the light, and the chronograph counts to the fifth of a second. A vulcanised rubber strap keeps it at home on the track or in the water.",
    priceUsd: 6200,
    strap: "rubber",
    specs: {
      caseMm: 43,
      caseMaterial: "Stainless steel",
      bezel: "Octagonal 18k rose gold",
      dial: "Black waffle",
      movement: "Automatic chronograph",
      powerReserveH: 60,
      strapDetail: "Black vulcanised rubber, pin buckle",
      waterM: 150,
    },
    images: imagesFor("octane-gt"),
  },
  {
    slug: "midnight-chrono",
    ref: "UW 3044.RG",
    name: "Midnight Chrono",
    tagline: "Warm gold, cool night, exact seconds.",
    story:
      "A rose-gold case frames a deep navy dial and a ceramic tachymeter bezel that will never fade. Midnight Chrono is a dress chronograph: slim enough for a cuff, precise enough to time a lap. It sits on hand-stitched leather that softens to the wrist over weeks.",
    priceUsd: 7400,
    strap: "leather",
    specs: {
      caseMm: 44,
      caseMaterial: "18k rose gold",
      bezel: "Ceramic tachymeter",
      dial: "Navy",
      movement: "Automatic chronograph",
      powerReserveH: 56,
      strapDetail: "Brown alligator-grain leather, gold deployant",
      waterM: 100,
    },
    images: imagesFor("midnight-chrono"),
  },
  {
    slug: "aurelian",
    ref: "UW 4043.YG",
    name: "Aurelian",
    tagline: "Half dial, half machine.",
    story:
      "Aurelian cuts its navy dial away to show the gear train turning beneath. Each bridge is bevelled and polished by hand, so the open half catches light like the gold bezel above it. A 65-hour reserve means it can rest over a long weekend and still be on time.",
    priceUsd: 8900,
    strap: "bracelet",
    specs: {
      caseMm: 43,
      caseMaterial: "Stainless steel",
      bezel: "Polished 18k yellow gold",
      dial: "Navy semi-skeleton",
      movement: "Automatic, open gear train",
      powerReserveH: 65,
      strapDetail: "Steel and gold bracelet, folding clasp",
      waterM: 100,
    },
    images: imagesFor("aurelian"),
  },
  {
    slug: "verdant",
    ref: "UW 5044.GR",
    name: "Verdant",
    tagline: "Rose gold in a green field.",
    story:
      "Verdant pairs a rose-gold case with a green ceramic bezel and a textured dial that looks like cut moss under glass. The chronograph pushers are rounded so they sit flush against the case. A full gold bracelet gives it real weight on the wrist.",
    priceUsd: 9800,
    strap: "bracelet",
    specs: {
      caseMm: 44,
      caseMaterial: "18k rose gold",
      bezel: "Green ceramic",
      dial: "Green textured",
      movement: "Automatic chronograph",
      powerReserveH: 60,
      strapDetail: "18k rose gold bracelet, hidden clasp",
      waterM: 100,
    },
    images: imagesFor("verdant"),
  },
  {
    slug: "tachy-skeleton",
    ref: "UW 6044.SK",
    name: "Tachy Skeleton",
    tagline: "A chronograph with nothing to hide.",
    story:
      "Every part of the Tachy Skeleton movement is on show, from the column wheel to the clutch that starts the chronograph. The dial is gone and the bridges are thinned until the watch looks like a drawing of itself. A ceramic tachymeter frames it all.",
    priceUsd: 12600,
    strap: "bracelet",
    specs: {
      caseMm: 44,
      caseMaterial: "Stainless steel",
      bezel: "Ceramic tachymeter",
      dial: "Skeleton",
      movement: "Automatic skeleton chronograph",
      powerReserveH: 60,
      strapDetail: "Brushed steel bracelet, folding clasp",
      waterM: 100,
    },
    images: imagesFor("tachy-skeleton"),
  },
  {
    slug: "onyx-skeleton",
    ref: "UW 7043.CE",
    name: "Onyx Skeleton",
    tagline: "Black ceramic, open heart.",
    story:
      "Onyx Skeleton is carved from black ceramic, harder than steel and lighter on the wrist. At six o'clock a flying tourbillon turns once a minute with no bridge above it, so it seems to float. Screws set into the bezel hold the whole case together.",
    priceUsd: 18900,
    strap: "bracelet",
    specs: {
      caseMm: 43,
      caseMaterial: "Black ceramic",
      bezel: "Ceramic, screw-set",
      dial: "Skeleton",
      movement: "Flying tourbillon",
      powerReserveH: 72,
      strapDetail: "Black ceramic bracelet, titanium clasp",
      waterM: 100,
    },
    images: imagesFor("onyx-skeleton"),
  },
  {
    slug: "maestro-tourbillon",
    ref: "UW 8044.TB",
    name: "Maestro Tourbillon",
    tagline: "The slowest minute you will ever watch.",
    story:
      "Maestro Tourbillon is our formal piece. A rose-gold case, a ceramic bezel and a skeleton dial that leaves the flying tourbillon in full view. The movement carries 80 hours of reserve, and every surface is finished by one watchmaker from start to end.",
    priceUsd: 24500,
    strap: "leather",
    specs: {
      caseMm: 44,
      caseMaterial: "18k rose gold",
      bezel: "Ceramic",
      dial: "Skeleton",
      movement: "Flying tourbillon",
      powerReserveH: 80,
      strapDetail: "Black alligator leather, gold deployant",
      waterM: 50,
    },
    images: imagesFor("maestro-tourbillon"),
  },
  {
    slug: "blue-tourbillon",
    ref: "UW 9044.BT",
    name: "Blue Tourbillon",
    tagline: "Deep navy, open-worked, endlessly turning.",
    story:
      "Blue Tourbillon is the top of the collection. The navy open-worked dial is cut by hand into a lattice, so the gold tourbillon cage shows through like a lamp behind a screen. It comes on a full rose-gold bracelet, numbered and signed.",
    priceUsd: 28900,
    strap: "bracelet",
    specs: {
      caseMm: 44,
      caseMaterial: "18k rose gold",
      bezel: "Navy",
      dial: "Navy open-worked",
      movement: "Flying tourbillon",
      powerReserveH: 80,
      strapDetail: "18k rose gold bracelet, hidden clasp",
      waterM: 50,
    },
    images: imagesFor("blue-tourbillon"),
  },
];

export const getWatch = (slug: string) => products.find((w) => w.slug === slug);

/** Previous and next watch, wrapping around the collection. */
export const getAdjacent = (slug: string) => {
  const i = products.findIndex((w) => w.slug === slug);
  const n = products.length;
  return {
    prev: products[(i - 1 + n) % n]!,
    next: products[(i + 1) % n]!,
  };
};
