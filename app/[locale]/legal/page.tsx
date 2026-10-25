import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/sections/PageIntro";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const LAST_UPDATED = "2026-10-25";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  return pageMetadata({ locale, path: "/legal", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function LegalPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("legal");
  const updated = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    dateStyle: "long",
  }).format(new Date(LAST_UPDATED));

  const blocks = [
    { id: "privacy", title: t("privacyTitle"), paras: [t("privacy1"), t("privacy2"), t("privacy3")] },
    { id: "terms", title: t("termsTitle"), paras: [t("terms1"), t("terms2"), t("terms3")] },
  ];

  return (
    <>
      <PageIntro label={t("label")} title={t("title")}>
        <p className="mt-8 text-14 text-muted">
          {t("updated")}: <time dateTime={LAST_UPDATED}>{updated}</time>
        </p>
      </PageIntro>
      <div className="container-site max-w-3xl space-y-16 lg:ms-[max(var(--gutter),calc((100vw-var(--max-w))/2+var(--gutter)))]">
        {blocks.map((b) => (
          <section key={b.id} id={b.id} data-reveal className="hairline-t pt-8">
            <h2 className="text-40">{b.title}</h2>
            {b.paras.map((p) => (
              <p key={p} className="mt-5 text-ivory/80">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
