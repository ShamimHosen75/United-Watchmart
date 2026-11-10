import { defineRouting } from "next-intl/routing";

// The site is English only. next-intl is kept for its message files, and the
// locale never appears in URLs (the home page is "/", not "/en").
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: false,
  localeCookie: false,
});
