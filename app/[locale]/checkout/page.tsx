import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { PageIntro } from "@/components/sections/PageIntro";
import { resolveLocale } from "@/i18n/locale";
import { shopEnabled } from "@/lib/shop/config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Static shell; the cart and Stripe form are rendered in the browser. */
export default async function CheckoutPage({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!shopEnabled) notFound();
  const t = await getTranslations("checkout");

  return (
    <>
      <PageIntro label={t("label")} title={t("title")} />
      <CheckoutView locale={locale} />
    </>
  );
}
