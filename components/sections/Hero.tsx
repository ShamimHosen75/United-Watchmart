import { getTranslations } from "next-intl/server";
import { HeroTitle } from "@/components/motion/HeroTitle";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WatchVisual } from "@/components/ui/WatchVisual";

export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative flex min-h-svh items-end overflow-hidden pb-16 pt-[calc(var(--header-h)+2rem)] lg:items-center lg:pb-0">
      <WatchVisual
        slug="heritage-42"
        label="Heritage 42"
        decorative
        className="absolute inset-y-0 end-0 w-full opacity-40 lg:w-[55%] lg:opacity-100"
      />
      <div className="container-site relative grid-12">
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
