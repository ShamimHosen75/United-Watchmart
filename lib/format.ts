import type { Locale } from "@/i18n/routing";

// Arabic pages keep Latin digits so prices and references read the same in both languages.
const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-AE-u-nu-latn" : "en-US");

// Prices use "$12,600" in both languages: the Arabic "US$" form gets reordered inside right-to-left text.
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "$12,600" in both languages. */
export const formatPrice = (amountUsd: number) => usd.format(amountUsd);

/** Same as formatPrice, for amounts stored in cents (orders, Stripe). */
export const formatCents = (cents: number) => usd.format(cents / 100);

export const formatNumber = (value: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale)).format(value);
