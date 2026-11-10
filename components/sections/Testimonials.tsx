import { getLocale, getTranslations } from "next-intl/server";
import { Stars } from "@/components/reviews/Stars";
import { Verified } from "@/components/reviews/Verified";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getWatch } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { getFeaturedReviews } from "@/lib/reviews";

/** Home page testimonials: overall rating plus featured customer quotes. */
export async function Testimonials() {
  const t = await getTranslations("reviews");
  const locale = (await getLocale()) as Locale;
  const { reviews, summary } = await getFeaturedReviews(locale);
  if (reviews.length === 0) return null;

  const average = formatNumber(summary.average, locale, 1);

  return (
    <section aria-labelledby="testimonials-title" className="hairline-t overflow-hidden py-24 lg:py-32">
      <div className="container-site flex flex-wrap items-end justify-between gap-10">
        <div className="max-w-xl">
          <SectionLabel reveal>{t("label")}</SectionLabel>
          <h2 id="testimonials-title" data-reveal className="mt-6 text-64">
            {t("title")}
          </h2>
          <p data-reveal className="mt-4 max-w-md text-muted">
            {t("body")}
          </p>
        </div>
        <div data-reveal className="flex items-center gap-6">
          <p className="tabular font-serif text-96 leading-none text-ivory">{average}</p>
          <div>
            <Stars rating={summary.average} size="md" label={t("rated", { rating: average })} />
            <p className="label mt-2 text-muted">{t("basedOn", { count: summary.count })}</p>
          </div>
        </div>
      </div>

      <ul className="container-site mt-14 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:pb-0 lg:grid-cols-3">
        {reviews.map((r) => {
          const watch = getWatch(r.slug);
          return (
            <li key={r.id} data-reveal className="flex w-[84vw] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none">
              <figure className="relative flex w-full flex-col border border-hairline bg-bg p-8 transition-colors duration-500 hover:border-gold/40 lg:p-10">
                <span aria-hidden className="pointer-events-none absolute end-8 top-4 font-serif text-[5.5rem] leading-none text-gold/15 select-none">
                  &rdquo;
                </span>
                <Stars className="self-start" rating={r.rating} label={t("rated", { rating: formatNumber(r.rating, locale) })} />
                {r.title && <p className="mt-6 font-serif text-28 leading-tight text-ivory">{r.title}</p>}
                <blockquote className={`${r.title ? "mt-3" : "mt-6"} flex-1 text-ivory/80`}>
                  <p>{r.body}</p>
                </blockquote>
                <figcaption className="hairline-t mt-8 pt-6">
                  <p className="text-ivory">{r.authorName}</p>
                  <p className="label mt-1 text-muted">
                    {r.authorCity}
                    {r.authorCity && watch && <span aria-hidden className="mx-2">·</span>}
                    {watch && (
                      <Link href={`/watch/${watch.slug}`} className="text-gold hover:text-gold-light">
                        {watch.name}
                      </Link>
                    )}
                  </p>
                  {r.verified && (
                    <div className="mt-3">
                      <Verified label={t("verified")} />
                    </div>
                  )}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
