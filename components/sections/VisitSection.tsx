import { getLocale, getTranslations } from "next-intl/server";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { products } from "@/data/products";
import type { Locale } from "@/i18n/routing";

/** Request a viewing (id="visit"). Watch pages link here with ?watch=<slug> to pre-select. */
export async function VisitSection() {
  const t = await getTranslations("home.visit");
  const locale = (await getLocale()) as Locale;
  const watches = products.map(({ slug, name, ref }) => ({ slug, name, ref }));

  return (
    <section
      id="visit"
      aria-labelledby="visit-title"
      className="scroll-mt-[var(--header-h)] bg-surface py-24 lg:py-40"
    >
      <div className="container-site grid-12 gap-y-12">
        <div className="col-span-12 lg:col-span-5">
          <SectionLabel reveal>{t("label")}</SectionLabel>
          <h2 id="visit-title" data-reveal className="mt-6 text-64">
            {t("title")}
          </h2>
          <p data-reveal className="mt-6 max-w-md text-20 text-ivory/80">
            {t("body")}
          </p>
        </div>
        <div data-reveal className="col-span-12 lg:col-span-6 lg:col-start-7">
          <EnquiryForm watches={watches} locale={locale} />
        </div>
      </div>
    </section>
  );
}
