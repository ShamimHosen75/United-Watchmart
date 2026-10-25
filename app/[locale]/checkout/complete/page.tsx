import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ClearCart } from "@/components/checkout/ClearCart";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { resolveLocale } from "@/i18n/locale";
import { getOrderItems } from "@/lib/shop/orders";
import { recordSucceededPayment } from "@/lib/shop/payments";
import { formatCents } from "@/lib/format";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment_intent?: string; ref?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}


/** Stripe redirects here after payment. Confirms the order even if the webhook has not arrived yet. */
export default async function CompletePage({ params, searchParams }: Props) {
  await resolveLocale(params);
  const { payment_intent: piId, ref } = await searchParams;
  const t = await getTranslations("order");
  const stripe = getStripe();

  let status: "succeeded" | "processing" | "failed" | "missing" = "missing";
  let order = null;
  let items: Awaited<ReturnType<typeof getOrderItems>> = [];

  if (stripe && piId && /^pi_[A-Za-z0-9]+$/.test(piId)) {
    try {
      const db = await getDb();
      order = (await db.query.orders.findFirst({ where: eq(orders.paymentIntentId, piId) })) ?? null;
      if (order && (!ref || order.ref === ref)) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status === "succeeded") {
          order = (await recordSucceededPayment(pi)) ?? order;
          status = "succeeded";
        } else if (pi.status === "processing") status = "processing";
        else status = "failed";
        items = await getOrderItems(db, order.id);
      } else order = null;
    } catch (err) {
      console.error("[checkout:complete]", err);
    }
  }

  const view = {
    succeeded: { title: t("successTitle"), body: t("successBody", { ref: order?.ref ?? "", email: order?.email ?? "" }) },
    processing: { title: t("processingTitle"), body: t("processingBody", { ref: order?.ref ?? "" }) },
    failed: { title: t("failedTitle"), body: t("failedBody") },
    missing: { title: t("notFoundTitle"), body: t("notFoundBody") },
  }[status];

  return (
    <section className="container-site min-h-[70svh] pb-16 pt-[calc(var(--header-h)+5rem)] lg:pt-[calc(var(--header-h)+8rem)]">
      {status === "succeeded" && <ClearCart />}
      <SectionLabel>{order ? `${t("label")} ${order.ref}` : t("label")}</SectionLabel>
      <h1 className="mt-6 text-96">{view.title}</h1>
      <p className="mt-6 max-w-2xl text-20 text-ivory/80">{view.body}</p>

      {order && items.length > 0 && (status === "succeeded" || status === "processing") && (
        <div className="mt-12 max-w-xl">
          <p className="label text-muted">{t("items")}</p>
          <ul className="mt-4">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3 hairline-b">
                <span dir="ltr">
                  {i.name} · {i.ref} × {i.quantity}
                </span>
                <span className="tabular text-gold-light">{formatCents(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between">
            <span className="label text-muted">{t("total")}</span>
            <span className="tabular font-serif text-28 text-gold-light">{formatCents(order.totalCents)}</span>
          </p>
        </div>
      )}

      <div className="mt-12 flex flex-wrap gap-4">
        {status === "failed" && <ButtonLink href="/checkout">{t("retry")}</ButtonLink>}
        <ButtonLink href="/collection" variant={status === "failed" ? "outline" : "solid"}>
          {t("continue")}
        </ButtonLink>
      </div>
    </section>
  );
}
