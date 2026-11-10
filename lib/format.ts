import type { Locale } from "@/i18n/routing";

const intlLocale = (_locale: Locale) => "en-US";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "$12,600". */
export const formatPrice = (amountUsd: number) => usd.format(amountUsd);

/** Same as formatPrice, for amounts stored in cents (orders, Stripe). */
export const formatCents = (cents: number) => usd.format(cents / 100);

/** Optional `decimals` forces that many digits after the point ("5.0"). */
export const formatNumber = (value: number, locale: Locale, decimals?: number) =>
  new Intl.NumberFormat(
    intlLocale(locale),
    decimals === undefined ? undefined : { minimumFractionDigits: decimals, maximumFractionDigits: decimals },
  ).format(value);
