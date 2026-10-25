import "../globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Cursor } from "@/components/motion/Cursor";
import { Magnetic } from "@/components/motion/Magnetic";
import { PageTransition } from "@/components/motion/PageTransition";
import { Preloader } from "@/components/motion/Preloader";
import { Reveal } from "@/components/motion/Reveal";
import { resolveLocale } from "@/i18n/locale";
import { dirOf, routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { headScript } from "@/lib/page-state";
import { siteUrl } from "@/lib/seo";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0e0803",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s — ${t("siteName")}` },
    description: t("description"),
    applicationName: "United WatchMart",
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "a11y" });

  return (
    // The head script adds classes before hydration, hence suppressHydrationWarning.
    <html lang={locale} dir={dirOf(locale)} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <a href="#main" className="skip-link label">
            {t("skip")}
          </a>
          <SmoothScroll />
          <Preloader />
          <PageTransition />
          <Reveal />
          <Cursor />
          <Magnetic />
          <Header />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
