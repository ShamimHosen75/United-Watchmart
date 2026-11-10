import { getTranslations } from "next-intl/server";
import { HeroTitle } from "@/components/motion/HeroTitle";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HeroWatch } from "./HeroWatch";

export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden pb-16 pt-[var(--header-h)] lg:flex-row lg:items-center lg:pb-0 lg:pt-[calc(var(--header-h)+2rem)]">
      {/* Phones: the watch sits above the headline. Desktop: it fills the right half behind the grid. */}
      <HeroWatch
        label="Heritage 42"
        className="relative h-[42svh] min-h-64 w-full shrink-0 lg:absolute lg:inset-y-0 lg:end-0 lg:h-auto lg:w-[55%]"
      />
      <div className="container-site relative grid-12 mt-8 lg:mt-0">
        <div className="col-span-12 lg:col-span-6">
          <div data-hero-fade>
            <SectionLabel>{t("eyebrow")}</SectionLabel>
          </div>
          <HeroTitle className="mt-6 text-96">{t("title")}</HeroTitle>
          <p data-hero-fade className="mt-8 max-w-md text-20 text-ivory/80">
            {t("intro")}
          </p>
          <a
            href="#stage"
            data-hero-fade
            className="label mt-14 inline-flex items-center gap-4 text-muted hover:text-ivory"
          >
            <span aria-hidden className="relative block h-12 w-px overflow-hidden bg-gold/25">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-cue_2.2s_ease-in-out_infinite] bg-gold" />
            </span>
            {t("cue")}
          </a>
        </div>
      </div>
    </section>
  );
}
