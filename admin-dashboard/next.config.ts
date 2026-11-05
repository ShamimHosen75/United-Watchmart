import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image uploads for website content go through a server action (8 MB limit plus form overhead).
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
