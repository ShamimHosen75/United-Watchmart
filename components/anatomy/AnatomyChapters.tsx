"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { AnatomyState } from "@/components/three/AnatomyCanvas";
import { WatchVisual } from "@/components/ui/WatchVisual";
import { getRenderMode, type RenderMode } from "@/lib/device";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";

const AnatomyCanvas = dynamic(() => import("@/components/three/AnatomyCanvas"), { ssr: false });

export type Chapter = { id: string; title: string; does: string; made: string };

type Props = {
  chapters: Chapter[];
  labels: { chapter: string; does: string; made: string; progress: string; visual: string; goTo: string[] };
};

const noopSubscribe = () => () => {};
const serverMode = (): RenderMode => "static";

/** Sticky visual on one side, six chapters on the other, with progress dots and bar. */
export function AnatomyChapters({ chapters, labels }: Props) {
  const mode = useSyncExternalStore(noopSubscribe, getRenderMode, serverMode);
  const root = useRef<HTMLDivElement>(null);
  const [state] = useState<AnatomyState>(() => ({ active: -1 }));
  const [onScreen, setOnScreen] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-chapter]", el);
      const dots = gsap.utils.toArray<HTMLElement>("[data-dot]", el);
      const bar = el.querySelector<HTMLElement>("[data-progress-bar]");

      const setActive = (i: number) => {
        state.active = i;
        dots.forEach((d, n) => {
          d.toggleAttribute("data-active", n === i);
          if (n === i) d.setAttribute("aria-current", "step");
          else d.removeAttribute("aria-current");
        });
      };

      items.forEach((item, i) =>
        ScrollTrigger.create({
          trigger: item,
          start: "top 55%",
          end: "bottom 55%",
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
          onLeaveBack: () => i === 0 && setActive(-1),
        }),
      );

      const list = el.querySelector("ol");
      if (list && bar) {
        ScrollTrigger.create({
          trigger: list,
          start: "top 55%",
          end: "bottom 55%",
          onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
        });
      }

      ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => setOnScreen(self.isActive) });
    },
    { scope: root },
  );

  const jump = (id: string) => (e: React.MouseEvent) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ block: "start" });
    history.replaceState(history.state, "", `#${id}`);
  };

  return (
    <div ref={root} className="container-site grid-12 gap-y-12">
      <div className="col-span-12 md:col-span-6">
        <div className="md:sticky md:top-[calc(var(--header-h)+1.5rem)]">
          <div data-reveal role="img" aria-label={labels.visual} className="relative aspect-square w-full overflow-hidden bg-surface">
            {mode === "three" ? (
              <AnatomyCanvas state={state} active={onScreen} />
            ) : (
              <WatchVisual slug="heritage-42" label="" decorative className="absolute inset-0" />
            )}
          </div>

          <nav aria-label={labels.progress} className="mt-6">
            <ol className="flex items-center justify-between gap-2">
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    data-dot
                    onClick={jump(c.id)}
                    aria-label={labels.goTo[i]}
                    className="group flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <span className="block size-2.5 rounded-full border border-gold/60 transition-transform duration-300 group-hover:scale-125 group-data-active:scale-125 group-data-active:bg-gold" />
                  </a>
                </li>
              ))}
            </ol>
            <span className="mt-2 block h-px w-full bg-hairline">
              <span
                data-progress-bar
                className="block h-full origin-[0%_50%] scale-x-0 bg-gold rtl:origin-[100%_50%]"
              />
            </span>
          </nav>
        </div>
      </div>

      <ol className="col-span-12 md:col-span-6 lg:col-span-5 lg:col-start-8">
        {chapters.map((part, i) => (
          <li
            key={part.id}
            id={part.id}
            data-chapter
            className="hairline-t flex scroll-mt-[var(--header-h)] flex-col justify-center py-16 md:min-h-[80svh]"
          >
            <p className="label tabular text-gold">
              {labels.chapter} {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-4 text-64">{part.title}</h2>
            <h3 className="label mt-10 text-muted">{labels.does}</h3>
            <p className="mt-3 text-20 text-ivory/85">{part.does}</p>
            <h3 className="label mt-8 text-muted">{labels.made}</h3>
            <p className="mt-3 text-ivory/75">{part.made}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
