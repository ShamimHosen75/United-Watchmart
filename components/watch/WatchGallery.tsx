"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { WatchVisual } from "@/components/ui/WatchVisual";

const WatchViewer = dynamic(() => import("./WatchViewer"), { ssr: false });

type View = "front" | "side" | "3d";

type Props = {
  slug: string;
  name: string;
  /** Show the "View in 3D" option. */
  hasModel: boolean;
  labels: {
    gallery: string;
    front: string;
    side: string;
    view3d: string;
    viewPhotos: string;
    loading3d: string;
    dragHint: string;
    showFront: string;
    showSide: string;
  };
};

/**
 * Watch page visual: two angles with thumbnails, plus an optional 3D viewer.
 * three.js loads only after the 3D button is pressed, so the page stays light on phones.
 * Placeholder gradients stand in for photography until real images arrive.
 */
export function WatchGallery({ slug, name, hasModel, labels }: Props) {
  const [view, setView] = useState<View>("front");
  const angles: { id: Exclude<View, "3d">; label: string; show: string }[] = [
    { id: "front", label: labels.front, show: labels.showFront },
    { id: "side", label: labels.side, show: labels.showSide },
  ];

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
        {angles.map((a) => (
          <WatchVisual
            key={a.id}
            slug={slug}
            label={`${name}, ${a.label}`}
            angle={a.id === "side" ? "hover" : "front"}
            className={`absolute inset-0 transition-opacity duration-700 ${view === a.id ? "opacity-100" : "opacity-0"}`}
            decorative={view !== a.id}
          />
        ))}
        {view === "3d" && (
          <div className="absolute inset-0">
            <p className="label absolute inset-x-0 top-1/2 text-center text-muted">{labels.loading3d}</p>
            <div className="absolute inset-0">
              <WatchViewer />
            </div>
            <p className="label pointer-events-none absolute inset-x-0 bottom-4 text-center text-muted">{labels.dragHint}</p>
          </div>
        )}
      </div>

      <div role="group" aria-label={labels.gallery} className="mt-4 flex flex-wrap items-center gap-3">
        {angles.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={view === a.id}
            aria-label={a.show}
            onClick={() => setView(a.id)}
            className="group relative size-16 overflow-hidden border border-transparent aria-pressed:border-gold"
          >
            <WatchVisual slug={slug} label="" decorative angle={a.id === "side" ? "hover" : "front"} className="size-full" />
          </button>
        ))}
        {hasModel && (
          <button
            type="button"
            aria-pressed={view === "3d"}
            onClick={() => setView(view === "3d" ? "front" : "3d")}
            className="label ms-auto min-h-11 border border-gold/40 px-5 text-ivory transition-colors hover:border-gold aria-pressed:bg-gold aria-pressed:text-bg"
          >
            {view === "3d" ? labels.viewPhotos : labels.view3d}
          </button>
        )}
      </div>
    </div>
  );
}
