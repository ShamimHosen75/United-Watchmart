import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import type { Watch } from "@/data/products";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://unitedwatchmart.com").replace(/\/$/, "");

/** Absolute URL for a path such as "/collection" ("" for home). URLs carry no language prefix. */
export const localeUrl = (_locale: Locale, path = "") => `${siteUrl}${path || "/"}`;

type PageMetaInput = {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /** Absolute or root-relative 1200x630 image. Defaults to the locale's generated image. */
  image?: string;
  type?: "website" | "article";
  /** Skip the "%s — United WatchMart" title template (home page). */
  absoluteTitle?: boolean;
};

export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  absoluteTitle = false,
}: PageMetaInput): Metadata {
  const url = localeUrl(locale, path);
  const ogImage = image ?? "/opengraph-image";

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: "United WatchMart",
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/** schema.org Product data for a watch page. */
export function productJsonLd(watch: Watch, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: watch.name,
    sku: watch.ref,
    mpn: watch.ref,
    description: watch.tagline,
    url: localeUrl(locale, `/watch/${watch.slug}`),
    image: `${siteUrl}/watch/${watch.slug}/opengraph-image`,
    brand: { "@type": "Brand", name: "United WatchMart" },
    material: watch.specs.caseMaterial,
    offers: {
      "@type": "Offer",
      price: watch.priceUsd,
      priceCurrency: "USD",
      availability: "https://schema.org/InStoreOnly",
      url: localeUrl(locale, `/watch/${watch.slug}`),
    },
  };
}

/** Serialises JSON-LD safely for a <script> tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
