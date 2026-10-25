import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { PageIntro } from "@/components/sections/PageIntro";
import { WatchCard } from "@/components/ui/WatchCard";
import { localizedProducts } from "@/data/localize";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "collection" });
  return pageMetadata({ locale, path: "/collection", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function CollectionPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations();
  const items = localizedProducts(locale).map((w) => ({
    slug: w.slug,
    strap: w.strap,
    card: <WatchCard watch={w} headingLevel="h2" />,
  }));

  return (
    <>
      <PageIntro label={t("collection.label")} title={t("collection.title")} intro={t("collection.intro")} />
      <CollectionGrid
        items={items}
        labels={{
          all: t("collection.all"),
          bracelet: t("common.strap.bracelet"),
          leather: t("common.strap.leather"),
          rubber: t("common.strap.rubber"),
        }}
      />
    </>
  );
}
