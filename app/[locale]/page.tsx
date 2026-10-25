import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionTeaser } from "@/components/sections/CollectionTeaser";
import { Disassembly } from "@/components/sections/Disassembly";
import { Hero } from "@/components/sections/Hero";
import { SpecsStrip } from "@/components/sections/SpecsStrip";
import { VisitSection } from "@/components/sections/VisitSection";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description"), absoluteTitle: true });
}

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocale(params);

  return (
    <>
      <Hero />
      <Disassembly />
      <SpecsStrip />
      <CollectionTeaser locale={locale} />
      <VisitSection />
    </>
  );
}
