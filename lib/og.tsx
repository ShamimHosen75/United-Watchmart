import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

type Props = { eyebrow: string; title: string; meta?: string };

/** Shared 1200x630 Open Graph card. Latin text only (the default OG font has no Arabic). */
export function ogCard({ eyebrow, title, meta }: Props) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(ellipse at 75% 40%, #2a1d10 0%, #0e0803 65%)",
          color: "#efe6d6",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 2 }}>
          <span>United&nbsp;</span>
          <span style={{ color: "#c9a35c" }}>WatchMart</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#c9a35c" }}>{eyebrow}</div>
          <div style={{ fontSize: 96, lineHeight: 1.05, marginTop: 16 }}>{title}</div>
          {meta && <div style={{ fontSize: 30, color: "#a8997f", marginTop: 20 }}>{meta}</div>}
        </div>
        <div style={{ display: "flex", height: 2, width: 160, background: "#c9a35c" }} />
      </div>
    ),
    ogSize,
  );
}
