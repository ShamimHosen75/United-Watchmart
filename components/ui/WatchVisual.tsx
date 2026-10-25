import type { CSSProperties } from "react";

type Tone = { dial: [string, string]; metal: string; strap: string };

// Placeholder colours per watch until real photography arrives.
const tones: Record<string, Tone> = {
  "heritage-42": { dial: ["#34518f", "#0e1a36"], metal: "#c9a35c", strap: "#8d9197" },
  "octane-gt": { dial: ["#3b3b3b", "#0a0a0a"], metal: "#d49a7f", strap: "#161616" },
  "midnight-chrono": { dial: ["#2d4274", "#0b1430"], metal: "#d49a7f", strap: "#5a3820" },
  aurelian: { dial: ["#35528c", "#0f1b38"], metal: "#c9a35c", strap: "#8d9197" },
  verdant: { dial: ["#416e4c", "#12251a"], metal: "#d49a7f", strap: "#c08a6e" },
  "tachy-skeleton": { dial: ["#6e6e6e", "#1b1b1b"], metal: "#b9bcc0", strap: "#9a9ea3" },
  "onyx-skeleton": { dial: ["#4a4a4a", "#090909"], metal: "#3a3a3a", strap: "#1c1c1c" },
  "maestro-tourbillon": { dial: ["#5c4a38", "#1a120a"], metal: "#d49a7f", strap: "#141414" },
  "blue-tourbillon": { dial: ["#2c4c92", "#09142e"], metal: "#d49a7f", strap: "#c08a6e" },
};

const fallback: Tone = { dial: ["#34518f", "#0e1a36"], metal: "#c9a35c", strap: "#8d9197" };

type Props = {
  slug: string;
  label: string;
  /** "hover" shows a second angle for card crossfades. */
  angle?: "front" | "hover";
  className?: string;
  /** Hide from assistive tech when a sibling already describes the image. */
  decorative?: boolean;
};

/** Gradient-only watch placeholder. No image request, so it never hurts LCP. */
export function WatchVisual({ slug, label, angle = "front", className = "", decorative = false }: Props) {
  const t = tones[slug] ?? fallback;
  const tilted = angle === "hover";

  const strap: CSSProperties = {
    background: `linear-gradient(90deg, rgba(0,0,0,.55), ${t.strap} 30%, ${t.strap} 70%, rgba(0,0,0,.55))`,
  };
  const caseRing: CSSProperties = {
    background: `conic-gradient(from ${tilted ? 200 : 140}deg, ${t.metal}, #fff6 18%, ${t.metal} 35%, #0008 60%, ${t.metal} 85%)`,
  };
  const dial: CSSProperties = {
    background: `radial-gradient(circle at ${tilted ? "62% 28%" : "35% 30%"}, ${t.dial[0]}, ${t.dial[1]} 70%)`,
  };

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      // No position class here, so callers can make it absolute or leave it in flow.
      className={`overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#2a1d10_0%,#120b05_70%)] ${className}`}
    >
      <div
        className="relative size-full transition-transform duration-700 ease-out-expo"
        style={{ transform: tilted ? "rotate(-14deg) scale(1.04)" : undefined }}
      >
        <div className="absolute inset-y-0 left-1/2 w-[30%] -translate-x-1/2" style={strap} />
        <div
          className="absolute left-1/2 top-1/2 aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)]"
          style={caseRing}
        >
          <div className="absolute inset-[9%] rounded-full" style={dial}>
            <span className="absolute bottom-1/2 left-1/2 h-[28%] w-[3%] origin-bottom -translate-x-1/2 rotate-[-60deg] rounded-full bg-gold-light/90" />
            <span className="absolute bottom-1/2 left-1/2 h-[40%] w-[2%] origin-bottom -translate-x-1/2 rotate-[50deg] rounded-full bg-gold-light/90" />
            <span className="absolute left-1/2 top-1/2 size-[6%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}
