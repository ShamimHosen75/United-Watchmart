import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddToCart } from "@/components/cart/AddToCart";
import { Stars } from "@/components/reviews/Stars";
import { WatchReviews } from "@/components/reviews/WatchReviews";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WatchCard } from "@/components/ui/WatchCard";
import { WatchGallery } from "@/components/watch/WatchGallery";
import { localizeWatch } from "@/data/localize";
import { getAdjacent, getWatch, products, type Watch } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { formatNumber, formatPrice } from "@/lib/format";
import { getWatchReviews } from "@/lib/reviews";
import { jsonLdString, pageMetadata, productJsonLd } from "@/lib/seo";
import { shopEnabled } from "@/lib/shop/config";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
// Re-read approved reviews from the database at most once an hour.
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => products.map((w) => ({ locale, slug: w.slug })));
}

async function load(params: Props["params"]) {
  const { slug } = await params;
  const locale = await resolveLocale(params);
  const base = getWatch(slug);
  if (!base) notFound();
  return { locale, watch: localizeWatch(base, locale) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, watch } = await load(params);
  return pageMetadata({
    locale,
    path: `/watch/${watch.slug}`,
    title: `${watch.name} · ${watch.ref}`,
    description: watch.tagline,
    image: `/watch/${watch.slug}/opengraph-image`,
  });
}

export default async function WatchPage({ params }: Props) {
  const { locale, watch } = await load(params);
  const t = await getTranslations();
  const { prev, next } = getAdjacent(watch.slug);
  const others = products.filter((w) => w.slug !== watch.slug).slice(0, 3);
  const n = (v: number) => formatNumber(v, locale);
  const { summary: rating } = await getWatchReviews(watch.slug, locale);

  const specs: { key: keyof Watch["specs"]; value: string }[] = [
    { key: "caseMm", value: t("watch.mm", { value: n(watch.specs.caseMm) }) },
    { key: "caseMaterial", value: watch.specs.caseMaterial },
    { key: "bezel", value: watch.specs.bezel },
    { key: "dial", value: watch.specs.dial },
    { key: "movement", value: watch.specs.movement },
    { key: "powerReserveH", value: t("watch.hours", { value: n(watch.specs.powerReserveH) }) },
    { key: "strapDetail", value: watch.specs.strapDetail },
    { key: "waterM", value: t("watch.metres", { value: n(watch.specs.waterM) }) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(watch, locale)) }} />

      <section className="container-site grid-12 gap-y-12 pt-[calc(var(--header-h)+3rem)] lg:pt-[calc(var(--header-h)+5rem)]">
        <div className="col-span-12 flex flex-col justify-center lg:col-span-5">
          <nav aria-label={t("a11y.breadcrumb")} className="label text-muted">
            <Link href="/collection" className="hover:text-ivory">
              {t("nav.collection")}
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span aria-current="page">
              {watch.name}
            </span>
          </nav>
          <h1 className="mt-8 text-96">
            {watch.name}
          </h1>
          <p className="label tabular mt-4 text-gold">
            {t("watch.ref")} <span>{watch.ref}</span>
          </p>
          <p className="mt-8 max-w-md text-20 text-ivory/80">{watch.tagline}</p>
          {rating.count > 0 && (
            <a href="#reviews" className="group mt-6 inline-flex w-fit items-center gap-3">
              <Stars rating={rating.average} label={t("reviews.rated", { rating: formatNumber(rating.average, locale, 1) })} />
              <span className="label tabular text-muted group-hover:text-ivory">
                {formatNumber(rating.average, locale, 1)} · {t("reviews.reviewsLink", { count: rating.count })}
              </span>
            </a>
          )}
          <p className="tabular mt-10 font-serif text-40 text-ivory">{formatPrice(watch.priceUsd)}</p>
          <div className="mt-6 flex flex-wrap items-start gap-4">
            {shopEnabled && <AddToCart slug={watch.slug} />}
            <ButtonLink variant={shopEnabled ? "outline" : "solid"} href={{ pathname: "/", query: { watch: watch.slug }, hash: "visit" }}>
              {t("common.requestViewing")}
            </ButtonLink>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <WatchGallery
            slug={watch.slug}
            name={watch.name}
            hasModel={Boolean(watch.model)}
            labels={{
              gallery: t("watch.gallery"),
              front: t("watch.angleFront"),
              side: t("watch.angleSide"),
              view3d: t("watch.view3d"),
              viewPhotos: t("watch.viewPhotos"),
              loading3d: t("watch.loading3d"),
              dragHint: t("watch.dragHint"),
              showFront: t("watch.showAngle", { angle: t("watch.angleFront") }),
              showSide: t("watch.showAngle", { angle: t("watch.angleSide") }),
            }}
          />
        </div>
      </section>

      <section className="container-site grid-12 mt-24 gap-y-12 lg:mt-40">
        <div data-reveal className="col-span-12 lg:col-span-5">
          <SectionLabel as="h2">{t("watch.story")}</SectionLabel>
          <p className="mt-8 font-serif text-28 leading-snug text-ivory/90">{watch.story}</p>
        </div>
        <div data-reveal className="col-span-12 lg:col-span-6 lg:col-start-7">
          <SectionLabel as="h2">{t("watch.specs")}</SectionLabel>
          <dl className="mt-8">
            {specs.map((s) => (
              <div key={s.key} className="hairline-b grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 py-4">
                <dt className="label text-muted">{t(`watch.${s.key}`)}</dt>
                <dd className="tabular text-ivory">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <WatchReviews slug={watch.slug} name={watch.name} locale={locale} />

      <section aria-labelledby="others-title" className="container-site mt-24 lg:mt-40">
        <h2 id="others-title" data-reveal className="text-40">
          {t("watch.others")}
        </h2>
        <ul className="mt-12 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((w) => (
            <li key={w.slug} data-reveal>
              <WatchCard watch={w} />
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label={t("watch.others")} className="container-site hairline-t mt-24 grid grid-cols-2 gap-6 pt-8">
        <Link href={`/watch/${prev.slug}`} className="group">
          <span className="label text-muted">
            <span aria-hidden className="inline-block">←</span> {t("watch.prev")}
          </span>
          <span className="mt-2 block font-serif text-28 group-hover:text-gold-light">
            {prev.name}
          </span>
        </Link>
        <Link href={`/watch/${next.slug}`} className="group text-end">
          <span className="label text-muted">
            {t("watch.next")} <span aria-hidden className="inline-block">→</span>
          </span>
          <span className="mt-2 block font-serif text-28 group-hover:text-gold-light">
            {next.name}
          </span>
        </Link>
      </nav>
    </>
  );
}
