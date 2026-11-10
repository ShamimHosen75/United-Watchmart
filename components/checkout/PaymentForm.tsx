"use client";

import { useState } from "react";
import { AddressElement, LinkAuthenticationElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";

type Props = { orderRef: string; locale: "en"; payLabel: string };

/** Contact, shipping and payment, confirmed in one step with stripe.confirmPayment. */
export function PaymentForm({ orderRef, locale, payLabel }: Props) {
  const t = useTranslations("checkout");
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? t("errors.payment"));
      setBusy(false);
      return;
    }

    // Shipping from the Address Element is attached to the payment automatically.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete?ref=${encodeURIComponent(orderRef)}`,
        receipt_email: email || undefined,
      },
    });
    // Only reached on an immediate error; success redirects to return_url.
    setError(confirmError.message ?? t("errors.payment"));
    setBusy(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-12">
      <fieldset>
        <legend className="label mb-4 text-gold">{t("contact")}</legend>
        <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
      </fieldset>
      <fieldset>
        <legend className="label mb-4 text-gold">{t("shipping")}</legend>
        <AddressElement
          options={{ mode: "shipping", fields: { phone: "always" }, validation: { phone: { required: "always" } } }}
        />
      </fieldset>
      <fieldset>
        <legend className="label mb-4 text-gold">{t("payment")}</legend>
        <PaymentElement options={{ layout: "tabs" }} />
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={!stripe || busy}
          data-magnetic
          className="label inline-flex min-h-14 w-full items-center justify-center bg-ivory px-8 text-bg transition-colors hover:bg-gold disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? t("processing") : payLabel}
        </button>
        <p role="alert" aria-live="assertive" className="mt-4 text-danger empty:hidden">
          {error}
        </p>
        <p className="mt-4 text-14 text-muted">{t("secure")}</p>
      </div>
    </form>
  );
}
