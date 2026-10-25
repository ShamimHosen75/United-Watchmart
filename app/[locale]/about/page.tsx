import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/sections/PageIntro";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const sections = ["s1", "s2", "s3", "s4"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "about" });
  return pageMetadata({ locale, path: "/about", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function AboutPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("about");

  return (
    <>
      <PageIntro label={t("label")} title={t("title")} intro={t("intro")} />
      <div className="container-site grid gap-x-6 gap-y-16 md:grid-cols-2">
        {sections.map((s, i) => (
          <section key={s} data-reveal className="hairline-t pt-8">
            <p className="label tabular text-gold">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-4 text-40">{t(`${s}Title`)}</h2>
            <p className="mt-4 max-w-xl text-ivory/80">{t(`${s}Body`)}</p>
          </section>
        ))}
      </div>
    </>
  );
}
