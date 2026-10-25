import type { Locale } from "@/i18n/routing";

// Arabic pages keep Latin digits so prices and references read the same in both languages.
const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-AE-u-nu-latn" : "en-US");

export const formatPrice = (usd: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);

export const formatNumber = (value: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale)).format(value);
