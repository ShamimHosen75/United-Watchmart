import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AnatomyChapters } from "@/components/anatomy/AnatomyChapters";
import { PageIntro } from "@/components/sections/PageIntro";
import { anatomy } from "@/data/anatomy";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "anatomy" });
  return pageMetadata({ locale, path: "/anatomy", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function AnatomyPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("anatomy");
  const chapters = anatomy.map((p) => ({ id: p.id, title: p.title[locale], does: p.does[locale], made: p.made[locale] }));

  return (
    <>
      <PageIntro label={t("label")} title={t("title")} intro={t("intro")} />
      <AnatomyChapters
        chapters={chapters}
        labels={{
          chapter: t("chapter"),
          does: t("does"),
          made: t("made"),
          progress: t("progress"),
          visual: t("title"),
          goTo: chapters.map((c, i) => t("goTo", { n: i + 1, title: c.title })),
        }}
      />
    </>
  );
}
