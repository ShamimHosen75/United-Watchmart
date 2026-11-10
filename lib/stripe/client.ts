"use client";

import { loadStripe, type Appearance, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

/** Stripe.js, loaded once and only on the checkout page. Null when no publishable key is set. */
export function getStripeJs() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  promise ??= loadStripe(key);
  return promise;
}

/** Payment, Address and Link elements styled to match the site. */
export function elementsOptions(clientSecret: string, locale: "en"): StripeElementsOptions {
  const font = "Manrope";
  const appearance: Appearance = {
    theme: "night",
    variables: {
      colorPrimary: "#c9a35c",
      colorBackground: "#1a120a",
      colorText: "#efe6d6",
      colorTextSecondary: "#a8997f",
      colorTextPlaceholder: "#7d705c",
      colorDanger: "#f2a7a0",
      colorIcon: "#c9a35c",
      fontFamily: `${font}, system-ui, sans-serif`,
      fontSizeBase: "15px",
      borderRadius: "0px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": { border: "1px solid rgba(201, 163, 92, 0.35)", boxShadow: "none", padding: "14px" },
      ".Input:focus": { borderColor: "#c9a35c", boxShadow: "0 0 0 1px #c9a35c" },
      ".Label": { textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "12px", color: "#a8997f" },
      ".Tab": { border: "1px solid rgba(201, 163, 92, 0.25)", boxShadow: "none" },
      ".Tab--selected": { borderColor: "#c9a35c", boxShadow: "0 0 0 1px #c9a35c" },
    },
  };
  return {
    clientSecret,
    appearance,
    locale,
    fonts: [
      {
        cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap",
      },
    ],
  };
}
