import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite (local embedded Postgres) loads its own WASM and data files at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The site used to live under /en and /ar. Send old links to the same page without the prefix.
  async redirects() {
    return [
      { source: "/:lang(en|ar)", destination: "/", permanent: true },
      { source: "/:lang(en|ar)/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
