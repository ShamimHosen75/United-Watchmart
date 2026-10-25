import { getTranslations } from "next-intl/server";
import { HorizontalScroll } from "@/components/motion/HorizontalScroll";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WatchCard } from "@/components/ui/WatchCard";
import { products } from "@/data/products";

/** Native horizontal scroll on phones; pinned and scroll-driven from 768 px up. */
export async function CollectionTeaser() {
  const t = await getTranslations();

  return (
    <section aria-labelledby="teaser-title" className="overflow-hidden py-24 lg:py-32">
      <div className="container-site flex flex-wrap items-end justify-between gap-8">
        <div>
          <SectionLabel reveal>{t("home.teaser.label")}</SectionLabel>
          <h2 id="teaser-title" data-reveal className="mt-6 text-64">
            {t("home.teaser.title")}
          </h2>
          <p data-reveal className="mt-4 max-w-md text-muted">
            {t("home.teaser.body")}
          </p>
        </div>
        <ButtonLink href="/collection" variant="outline">
          {t("common.viewCollection")}
        </ButtonLink>
      </div>

      <HorizontalScroll className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[max(var(--gutter),calc((100vw-var(--max-w))/2+var(--gutter)))] pb-6 [scrollbar-width:thin] data-pinned:snap-none data-pinned:overflow-visible">
        {products.map((w) => (
          <li key={w.slug} data-reveal className="w-[78vw] shrink-0 snap-start sm:w-[44vw] lg:w-[24vw]">
            <WatchCard watch={w} />
          </li>
        ))}
      </HorizontalScroll>
    </section>
  );
}
