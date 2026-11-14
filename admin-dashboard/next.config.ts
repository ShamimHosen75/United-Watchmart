import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image uploads for website content go through a server action (8 MB limit plus form overhead).
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  turbopack: {
    // This app sits inside the website repo; keep the website's lockfile and PostCSS config out of its build.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
