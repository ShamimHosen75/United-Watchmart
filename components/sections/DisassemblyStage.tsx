"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FrameSequence } from "@/components/motion/FrameSequence";
import { createExplodeState } from "@/components/three/explode";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WatchVisual } from "@/components/ui/WatchVisual";
import { stageSteps } from "@/data/hero";
import { getRenderMode, type RenderMode } from "@/lib/device";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { trackAsset } from "@/lib/loader";

// three.js only loads in 3D mode.
const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

export type StageCopy = {
  label: string;
  title: string;
  visualLabel: string;
  steps: { id: string; title: string; body: string }[];
};

const noopSubscribe = () => () => {};
const serverMode = (): RenderMode => "static";

/** The signature section. Server HTML is the static version; the client upgrades it when the device allows. */
export function DisassemblyStage(copy: StageCopy) {
  const mode = useSyncExternalStore(noopSubscribe, getRenderMode, serverMode);
  return mode === "static" ? <StaticStage {...copy} /> : <PinnedStage mode={mode} {...copy} />;
}

/** Phones, reduced motion and no-JS: exploded image and the caption list, no pin. */
function StaticStage({ label, title, visualLabel, steps }: StageCopy) {
  return (
    <section id="stage" aria-labelledby="stage-title" className="py-24 lg:py-40">
      <div className="container-site grid-12 gap-y-12">
        <div data-reveal className="col-span-12 lg:col-span-6">
          <WatchVisual slug="heritage-42" label={visualLabel} className="relative aspect-square w-full" />
        </div>
        <div className="col-span-12 lg:col-span-5 lg:col-start-8">
          <SectionLabel reveal>{label}</SectionLabel>
          <h2 id="stage-title" data-reveal className="mt-6 text-64">
            {title}
          </h2>
          <ol className="mt-12">
            {steps.map((step, i) => (
              <li key={step.id} data-reveal className="hairline-t grid grid-cols-[3rem_1fr] gap-4 py-6">
                <span className="label tabular pt-1 text-gold">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-28">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Pinned for 400% of the viewport; one scrubbed timeline with a label per step. */
function PinnedStage({ mode, label, title, visualLabel, steps }: StageCopy & { mode: RenderMode }) {
  const root = useRef<HTMLElement>(null);
  const reportReady = useRef<(() => void) | null>(null);
  const [state] = useState(() => createExplodeState(stageSteps.length));
  const [onScreen, setOnScreen] = useState(false);
  const n = stageSteps.length;

  // Let the preloader wait for the 3D scene or first frames.
  useEffect(() => {
    const report = trackAsset("hero-stage");
    reportReady.current = () => report(1);
    return () => report(1);
  }, []);
  const onReady = useCallback(() => reportReady.current?.(), []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const captions = gsap.utils.toArray<HTMLElement>("[data-caption]", el);
      const counter = el.querySelector<HTMLElement>("[data-stage-count]");
      const bar = el.querySelector<HTMLElement>("[data-stage-bar]");
      let active = -1;

      const setActive = (index: number) => {
        if (index === active) return;
        active = index;
        captions.forEach((c, i) => {
          c.toggleAttribute("data-active", i === index);
          if (i === index) c.setAttribute("aria-current", "step");
          else c.removeAttribute("aria-current");
        });
        if (counter) counter.textContent = String(index + 1).padStart(2, "0");
      };
      setActive(0);

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=400%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            state.progress = self.progress;
            setActive(Math.min(n - 1, Math.floor(self.progress * n)));
            if (bar) gsap.set(bar, { scaleX: self.progress });
          },
        },
      });
      stageSteps.forEach((step, i) => {
        tl.addLabel(step.id, i);
        tl.to(state.parts[i]!, { v: 1, duration: 0.85 }, i);
      });
      tl.set({}, {}, n); // timeline length = number of steps, so labels line up with captions

      // Render the canvas only while the section is on screen: from its top entering the viewport,
      // through the 400% pin, until it has scrolled away. (Measured explicitly because the
      // element's own "bottom" does not include the pin distance.)
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: () => `+=${window.innerHeight + el.offsetHeight * 5}`,
        invalidateOnRefresh: true,
        onToggle: (self) => setOnScreen(self.isActive),
      });

      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section id="stage" ref={root} aria-labelledby="stage-title" className="relative h-svh overflow-hidden">
      <div role="img" aria-label={visualLabel} className="absolute inset-y-0 end-0 w-full lg:w-[64%]">
        {mode === "three" ? (
          <HeroCanvas state={state} active={onScreen} onReady={onReady} />
        ) : (
          <FrameSequence state={state} onReady={onReady} />
        )}
      </div>
      {/* Keeps captions readable where the canvas sits behind them */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent lg:via-bg/40"
      />

      <div className="container-site pointer-events-none relative flex h-full flex-col justify-center pt-[var(--header-h)]">
        <div className="pointer-events-auto max-w-md">
          <SectionLabel>{label}</SectionLabel>
          <h2 id="stage-title" className="mt-5 text-40">
            {title}
          </h2>
          <ol className="mt-8 space-y-1">
            {steps.map((step, i) => (
              <li
                key={step.id}
                data-caption
                className="grid grid-cols-[2.5rem_1fr] gap-3 py-2 opacity-35 transition-opacity duration-500 data-active:opacity-100"
              >
                <span className="label tabular pt-1 text-gold">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-20">{step.title}</h3>
                  <p className="mt-1 text-14 text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex items-center gap-4">
            <span className="label tabular text-gold">
              <span data-stage-count>01</span> / {String(n).padStart(2, "0")}
            </span>
            <span className="block h-px flex-1 bg-hairline">
              <span
                data-stage-bar
                className="block h-full origin-[0%_50%] scale-x-0 bg-gold"
              />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
