import { routing } from "@/i18n/routing";
import { ogCard, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "United WatchMart — Automatic watches, taken apart";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function Image() {
  return ogCard({ eyebrow: "Automatic watchmaking", title: "Time, taken apart." });
}
