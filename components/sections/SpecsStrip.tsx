import { getLocale, getTranslations } from "next-intl/server";
import { CountUp } from "@/components/motion/CountUp";
import type { Locale } from "@/i18n/routing";

export async function SpecsStrip() {
  const t = await getTranslations("home.specs");
  const locale = (await getLocale()) as Locale;

  const items = [
    { value: 42, unit: t("mm"), label: t("case") },
    { value: 28800, unit: t("vph"), label: t("beat") },
    { value: 100, unit: t("m"), label: t("water") },
    { value: 72, unit: t("h"), label: t("reserve") },
  ];

  return (
    <section aria-label={t("label")} className="hairline-t hairline-b">
      <dl className="container-site grid grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            data-reveal
            className="flex flex-col-reverse gap-2 border-hairline py-10 odd:border-e lg:border-e lg:px-8 lg:last:border-e-0 lg:first:ps-0"
          >
            <dt className="label text-muted">{item.label}</dt>
            <dd className="font-serif text-64 leading-none text-ivory">
              <CountUp value={item.value} locale={locale} />
              <span className="ms-2 text-28 text-gold">{item.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
