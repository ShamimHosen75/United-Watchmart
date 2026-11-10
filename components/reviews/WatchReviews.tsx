import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { getWatchReviews } from "@/lib/reviews";
import { Stars } from "./Stars";
import { Verified } from "./Verified";

type Props = { slug: string; name: string; locale: Locale };

const dateFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-US", { month: "long", year: "numeric" });

/** Reviews block on a watch page: rating summary on one side, the reviews on the other. */
export async function WatchReviews({ slug, name, locale }: Props) {
  const t = await getTranslations("reviews");
  const { reviews, summary } = await getWatchReviews(slug, locale);
  const n = (v: number) => formatNumber(v, locale);
  const dates = dateFormat(locale);
  const average = formatNumber(summary.average, locale, 1);

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="container-site grid-12 mt-24 scroll-mt-[var(--header-h)] gap-y-12 lg:mt-40">
      <div data-reveal className="col-span-12 lg:col-span-4">
        <SectionLabel>{t("label")}</SectionLabel>
        <h2 id="reviews-title" className="mt-6 text-40">
          {t("watchTitle")}
        </h2>

        {summary.count > 0 ? (
          <div className="mt-10">
            <div className="flex items-end gap-4">
              <p className="tabular font-serif text-64 leading-none text-ivory">{average}</p>
              <p className="label pb-2 text-muted">{t("outOf")}</p>
            </div>
            <Stars className="mt-4" size="md" rating={summary.average} label={t("rated", { rating: average })} />
            <p className="label mt-3 text-muted">{t("basedOn", { count: summary.count })}</p>

            <dl className="mt-8 space-y-2.5">
              {summary.breakdown.map((count, i) => {
                const stars = 5 - i;
                const pct = summary.count ? (count / summary.count) * 100 : 0;
                return (
                  <div key={stars} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-3">
                    <dt className="label tabular whitespace-nowrap text-muted">{t("starsShort", { count: stars })}</dt>
                    <dd className="h-1 overflow-hidden bg-surface-2">
                      <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
                    </dd>
                    <dd className="label tabular text-end text-muted">{n(count)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : (
          <p className="mt-8 max-w-sm text-muted">{t("empty", { name })}</p>
        )}

        <div className="mt-10">
          <ButtonLink variant="outline" href={{ pathname: "/", query: { watch: slug }, hash: "visit" }}>
            {t("cta")}
          </ButtonLink>
        </div>
      </div>

      {reviews.length > 0 && (
        <ul className="col-span-12 lg:col-span-7 lg:col-start-6">
          {reviews.map((r) => (
            <li key={r.id} data-reveal className="hairline-b py-8 first:pt-0 lg:py-10">
              <article>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Stars rating={r.rating} label={t("rated", { rating: n(r.rating) })} />
                  <time dateTime={r.date} className="label text-muted">
                    {dates.format(new Date(`${r.date}T12:00:00Z`))}
                  </time>
                </div>
                {r.title && <h3 className="mt-5 text-28">{r.title}</h3>}
                <p className={`${r.title ? "mt-3" : "mt-5"} max-w-2xl text-ivory/80`}>{r.body}</p>
                <footer className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-ivory">
                    {r.authorName}
                    {r.authorCity && <span className="text-muted"> · {r.authorCity}</span>}
                  </p>
                  {r.verified && <Verified label={t("verified")} />}
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
