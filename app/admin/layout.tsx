import "../globals.css";
import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · United WatchMart admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0e0803", colorScheme: "dark" };

/** Root layout for the boutique's admin area (English, left to right, no site chrome). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
