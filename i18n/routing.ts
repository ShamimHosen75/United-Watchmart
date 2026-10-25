import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export const rtlLocales: readonly Locale[] = ["ar"];
export const dirOf = (locale: Locale) => (rtlLocales.includes(locale) ? "rtl" : "ltr");
