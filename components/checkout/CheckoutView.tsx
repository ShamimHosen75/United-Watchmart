"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import { WatchVisual } from "@/components/ui/WatchVisual";
import { Link } from "@/i18n/navigation";
import { getCheckoutRef, setCheckoutRef, setQuantity, useCart } from "@/lib/cart/store";
import { refreshStock } from "@/lib/cart/stock";
import { createCheckout, type CheckoutResult } from "@/lib/shop/checkout-action";
import { formatCents } from "@/lib/format";
import { elementsOptions, getStripeJs } from "@/lib/stripe/client";
import { PaymentForm } from "./PaymentForm";

type Props = { locale: "en" };
type Ready = Extract<CheckoutResult, { ok: true }>;
type State = { key: string; result: CheckoutResult | null };


/** Starts (or resumes) a server checkout for the current cart, then shows the Stripe form. */
export function CheckoutView({ locale }: Props) {
  const t = useTranslations("checkout");
  const lines = useCart();
  const cartKey = useMemo(() => lines.map((l) => `${l.slug}:${l.qty}`).join("|"), [lines]);
  const [state, setState] = useState<State>({ key: "", result: null });
  const [notice, setNotice] = useState<string | null>(null);
  const stripePromise = getStripeJs();

  useEffect(() => {
    if (!cartKey || !stripePromise) return;
    let cancelled = false;
    createCheckout({ items: lines, locale, existingRef: getCheckoutRef() }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setCheckoutRef(result.ref);
      } else if (result.error === "unavailable" && result.unavailable) {
        // Trim the cart to what is actually available; this effect then runs again.
        result.unavailable.forEach((u) => setQuantity(u.slug, u.available));
        setNotice(t("errors.unavailable"));
        void refreshStock(true);
      }
      setState({ key: cartKey, result });
    });
    return () => {
      cancelled = true;
    };
    // `lines` is captured through cartKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, locale, stripePromise]);

  if (!lines.length) {
    return (
      <div className="container-site py-16">
        <p className="text-20 text-ivory/80">{t("empty")}</p>
        <Link href="/collection" className="label mt-6 inline-block text-gold hover:text-gold-light">
          {t("edit")}
        </Link>
      </div>
    );
  }

  if (!stripePromise) return <Message text={t("errors.payments_unavailable")} />;

  const result = state.key === cartKey ? state.result : null;
  if (result && !result.ok && result.error !== "unavailable") return <Message text={t(`errors.${result.error}`)} />;
  const ready: Ready | null = result?.ok ? result : null;

  return (
    <div className="container-site grid-12 gap-y-12">
      <div className="col-span-12 lg:col-span-7">
        {notice && (
          <p role="status" className="mb-8 border border-gold/40 p-4 text-gold">
            {notice}
          </p>
        )}
        {ready ? (
          <Elements key={ready.clientSecret} stripe={stripePromise} options={elementsOptions(ready.clientSecret, locale)}>
            <PaymentForm orderRef={ready.ref} locale={locale} payLabel={t("pay", { amount: formatCents(ready.totalCents) })} />
          </Elements>
        ) : (
          <p className="label text-muted" aria-live="polite">
            {t("loading")}
          </p>
        )}
      </div>

      <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
        <div className="bg-surface p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-28">{t("summary")}</h2>
            <Link href="/collection" className="label text-gold hover:text-gold-light">
              {t("edit")}
            </Link>
          </div>
          <ul className="mt-6">
            {(ready?.items ?? []).map((i) => (
              <li key={i.slug} className="flex items-center gap-4 py-4 hairline-b">
                <WatchVisual slug={i.slug} label="" decorative className="relative size-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-20">
                    {i.name}
                  </p>
                  <p className="label tabular text-muted">
                    {i.ref} · ×{i.quantity}
                  </p>
                </div>
                <p className="tabular text-ivory">{formatCents(i.unitPriceCents * i.quantity)}</p>
              </li>
            ))}
          </ul>
          {ready && (
            <dl className="mt-6 space-y-2">
              <div className="flex justify-between text-ivory/80">
                <dt>{t("shippingLine")}</dt>
                <dd>{ready.shippingCents ? formatCents(ready.shippingCents) : t("free")}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-4 hairline-t">
                <dt className="label text-muted">{t("total")}</dt>
                <dd className="tabular font-serif text-40 text-ivory">{formatCents(ready.totalCents)}</dd>
              </div>
            </dl>
          )}
          {ready && (
            <p className="mt-6 text-14 text-muted">
              {t("held", {
                time: new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(
                  new Date(ready.expiresAt),
                ),
              })}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="container-site py-8">
      <p role="alert" className="max-w-xl border border-gold/40 p-6 text-20 text-ivory/85">
        {text}
      </p>
    </div>
  );
}
