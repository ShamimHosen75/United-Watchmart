"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { straps, type Strap } from "@/data/products";
import { prefersReducedMotion } from "@/lib/device";
import { Flip, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getFilter, getServerFilter, setFilter, subscribeFilter, type StrapFilter } from "./filter-store";

type Item = { slug: string; strap: Strap; card: React.ReactNode };
type Props = { items: Item[]; labels: Record<StrapFilter, string> };

const filters: StrapFilter[] = ["all", ...straps];

/** Strap filter + grid. Cards are server-rendered; this only shows, hides and animates them. */
export function CollectionGrid({ items, labels }: Props) {
  const t = useTranslations("collection");
  const filter = useSyncExternalStore(subscribeFilter, getFilter, getServerFilter);
  const grid = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const visible = items.filter((i) => filter === "all" || i.strap === filter);

  const choose = (next: StrapFilter) => {
    if (next === filter) return;
    // Record positions before React re-renders the grid.
    if (grid.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(grid.current.querySelectorAll("[data-flip]"));
    }
    setFilter(next);
  };

  // After the re-render, animate from the recorded positions.
  useGSAP(
    () => {
      const state = flipState.current;
      flipState.current = null;
      if (!state) return;
      Flip.from(state, {
        absolute: true,
        duration: 0.6,
        ease: "power3.inOut",
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.4, ease: "power2.in" }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    },
    { dependencies: [filter], scope: grid, revertOnUpdate: false },
  );

  return (
    <>
      <div className="container-site mb-12 flex flex-wrap items-center justify-between gap-6">
        <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => choose(f)}
              className="label min-h-11 border border-gold/30 px-5 text-ivory/80 transition-colors hover:border-gold hover:text-ivory aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-bg"
            >
              {labels[f]}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="label tabular text-muted">
          {t("count", { count: visible.length })}
        </p>
      </div>

      <ul ref={grid} className="container-site relative grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const shown = filter === "all" || item.strap === filter;
          return (
            <li key={item.slug} data-flip data-flip-id={item.slug} className={shown ? "" : "hidden"}>
              <div data-reveal>{item.card}</div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
