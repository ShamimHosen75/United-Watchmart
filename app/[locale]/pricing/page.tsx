import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/sections/PageIntro";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { products } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "pricing" });
  return pageMetadata({ locale, path: "/pricing", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function PricingPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations();

  return (
    <>
      <PageIntro label={t("pricing.label")} title={t("pricing.title")} intro={t("pricing.intro")} />

      <div className="container-site">
        <div data-reveal className="relative overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-start">
            <caption className="sr-only">{t("pricing.caption")}</caption>
            <thead>
              <tr className="hairline-b">
                <th scope="col" className="label py-4 text-start font-medium text-muted">
                  {t("pricing.name")}
                </th>
                <th scope="col" className="label py-4 text-start font-medium text-muted">
                  {t("pricing.ref")}
                </th>
                <th scope="col" className="label py-4 text-end font-medium text-muted">
                  {t("pricing.price")}
                </th>
                <th scope="col" className="label py-4 text-end font-medium text-muted">
                  <span className="sr-only">{t("pricing.link")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((w) => (
                <tr key={w.slug} className="hairline-b group">
                  <th scope="row" className="py-6 text-start font-normal">
                    <span dir="ltr" className="font-serif text-28">
                      {w.name}
                    </span>
                  </th>
                  <td dir="ltr" className="label tabular py-6 text-start text-muted rtl:text-right">
                    {w.ref}
                  </td>
                  <td className="tabular py-6 text-end text-20 text-ivory">{formatPrice(w.priceUsd)}</td>
                  <td className="py-6 text-end">
                    <Link
                      href={`/watch/${w.slug}`}
                      className="label inline-flex min-h-11 items-center text-ivory/80 hover:text-gold-light"
                    >
                      {t("pricing.link")}
                      <span className="sr-only"> — {w.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-14 text-muted">{t("pricing.note")}</p>

        <aside data-reveal className="mt-24 flex flex-wrap items-center justify-between gap-8 bg-surface p-10 lg:p-16">
          <div>
            <h2 className="text-40">{t("pricing.ctaTitle")}</h2>
            <p className="mt-3 max-w-lg text-muted">{t("pricing.ctaBody")}</p>
          </div>
          <ButtonLink href={{ pathname: "/", hash: "visit" }}>{t("common.requestViewing")}</ButtonLink>
        </aside>
      </div>
    </>
  );
}
