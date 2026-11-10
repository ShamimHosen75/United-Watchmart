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
          background: "radial-gradient(ellipse at 75% 40%, #ffffff 0%, #f3f0ea 70%)",
          color: "#16140f",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 2 }}>
          <span>United&nbsp;</span>
          <span style={{ color: "#8f6c33" }}>WatchMart</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#8f6c33" }}>{eyebrow}</div>
          <div style={{ fontSize: 96, lineHeight: 1.05, marginTop: 16 }}>{title}</div>
          {meta && <div style={{ fontSize: 30, color: "#6e685e", marginTop: 20 }}>{meta}</div>}
        </div>
        <div style={{ display: "flex", height: 2, width: 160, background: "#8f6c33" }} />
      </div>
    ),
    ogSize,
  );
}
