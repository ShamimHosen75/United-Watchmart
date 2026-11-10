import type { Locale } from "@/i18n/routing";
import { products, type Watch } from "./products";

/** The site is English only, so watches are returned as they are. */
export function localizeWatch(watch: Watch, _locale: Locale): Watch {
  return watch;
}

export const localizedProducts = (locale: Locale) => products.map((w) => localizeWatch(w, locale));
