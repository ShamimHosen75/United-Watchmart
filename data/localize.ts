import type { Locale } from "@/i18n/routing";
import { products, type Watch } from "./products";
import { productsAr } from "./products.ar";

/** Returns the watch with copy in the requested locale (falls back to English). */
export function localizeWatch(watch: Watch, locale: Locale): Watch {
  if (locale !== "ar") return watch;
  const copy = productsAr[watch.slug];
  if (!copy) return watch;
  return {
    ...watch,
    tagline: copy.tagline,
    story: copy.story,
    specs: { ...watch.specs, ...copy.specs },
  };
}

export const localizedProducts = (locale: Locale) => products.map((w) => localizeWatch(w, locale));
