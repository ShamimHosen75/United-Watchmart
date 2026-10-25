"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** UI only for now: no data leaves the browser. */
export function NewsletterForm() {
  const t = useTranslations("footer");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p role="status" className="text-gold-light">
        {t("subscribed")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex border-b border-gold/40 focus-within:border-gold"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        {t("newsletterLabel")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        autoComplete="email"
        dir="ltr"
        placeholder={t("newsletterPlaceholder")}
        className="min-h-12 w-full bg-transparent text-ivory placeholder:text-muted/70 focus:outline-none rtl:text-right"
      />
      <button type="submit" className="label shrink-0 px-2 text-gold transition-colors hover:text-gold-light">
        {t("subscribe")}
      </button>
    </form>
  );
}
