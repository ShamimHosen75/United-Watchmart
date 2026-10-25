import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { routing } from "@/i18n/routing";
import { localeUrl } from "@/lib/seo";

const staticPaths = ["", "/collection", "/anatomy", "/pricing", "/about", "/legal"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...staticPaths, ...products.map((w) => `/watch/${w.slug}`)];
  const lastModified = new Date();

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: localeUrl(locale, path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : path.startsWith("/watch") ? 0.8 : 0.6,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l, path)])),
      },
    })),
  );
}
