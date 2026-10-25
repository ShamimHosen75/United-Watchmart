"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { submitEnquiry } from "@/lib/enquiry/action";
import {
  enquirySchema,
  type EnquiryField,
  type EnquiryInput,
  type EnquiryResult,
  type EnquiryValues,
} from "@/lib/enquiry/schema";
import { Field, inputClass } from "./Field";

type WatchOption = { slug: string; name: string; ref: string };
type Props = { watches: WatchOption[]; locale: Locale };

// Cloudflare's published test site key (always passes) is used only outside production.
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === "production" ? "" : "1x00000000000000000000AA");

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function EnquiryForm({ watches, locale }: Props) {
  const t = useTranslations("form");
  const root = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const turnstile = useRef<TurnstileInstance | undefined>(undefined);

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [token, setToken] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput, unknown, EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", email: "", phone: "", watch: "", date: "", message: "", website: "" },
    mode: "onTouched",
  });

  // Pre-select a watch from ?watch=<slug> (set by "Request a viewing" on watch pages).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("watch");
    if (slug && watches.some((w) => w.slug === slug)) setValue("watch", slug);
    if (dateRef.current) dateRef.current.min = today();
  }, [setValue, watches]);

  // Load the Turnstile script only when the form is about to be seen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowCaptcha(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const err = (key?: string) => (key ? t(`errors.${key}` as "errors.invalid") : undefined);

  const onSubmit = async (values: EnquiryValues) => {
    setFormError(null);
    if (!token) {
      setFormError(t("errors.captcha"));
      return;
    }

    let result: EnquiryResult;
    try {
      result = await submitEnquiry({ ...values, token, locale });
    } catch {
      result = { ok: false, error: "server" };
    }

    // Tokens are single-use: get a fresh one for any retry.
    turnstile.current?.reset();
    setToken("");

    if (result.ok) {
      setSent({ name: values.name, email: values.email });
      return;
    }
    if (result.fields) {
      for (const [field, message] of Object.entries(result.fields)) {
        setError(field as EnquiryField, { message });
      }
    }
    setFormError(t(`errors.${result.error}`));
  };

  if (sent) {
    return (
      <div role="status" className="border border-hairline p-8 lg:p-10">
        <h3 ref={successRef} tabIndex={-1} className="text-40 focus:outline-none">
          {t("successTitle", { name: sent.name })}
        </h3>
        <p className="mt-4 text-ivory/80">{t("successBody", { email: sent.email })}</p>
        <button
          type="button"
          onClick={() => {
            reset();
            setSent(null);
          }}
          className="label mt-8 min-h-11 text-gold hover:text-gold-light"
        >
          {t("again")}
        </button>
      </div>
    );
  }

  const dateField = register("date");

  return (
    <div ref={root}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
        <Field id="enq-name" label={t("name")} error={err(errors.name?.message)}>
          {(a11y) => <input {...a11y} {...register("name")} autoComplete="name" className={inputClass} />}
        </Field>

        <Field id="enq-email" label={t("email")} error={err(errors.email?.message)}>
          {(a11y) => (
            <input
              {...a11y}
              {...register("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              className={`${inputClass} rtl:text-right`}
            />
          )}
        </Field>

        <Field id="enq-phone" label={t("phone")} error={err(errors.phone?.message)}>
          {(a11y) => (
            <input
              {...a11y}
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} rtl:text-right`}
            />
          )}
        </Field>

        <Field id="enq-watch" label={t("watch")} error={err(errors.watch?.message)}>
          {(a11y) => (
            <select {...a11y} {...register("watch")} className={`${inputClass} cursor-pointer bg-surface`}>
              <option value="">{t("watchPlaceholder")}</option>
              {watches.map((w) => (
                <option key={w.slug} value={w.slug}>
                  {w.name} · {w.ref}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id="enq-date" label={t("date")} error={err(errors.date?.message)}>
          {(a11y) => (
            <input
              {...a11y}
              {...dateField}
              ref={(el) => {
                dateField.ref(el);
                dateRef.current = el;
              }}
              type="date"
              className={`${inputClass} [color-scheme:dark]`}
            />
          )}
        </Field>

        <Field id="enq-message" label={t("message")} error={err(errors.message?.message)} className="sm:col-span-2">
          {(a11y) => (
            <textarea
              {...a11y}
              {...register("message")}
              rows={4}
              placeholder={t("messagePlaceholder")}
              className={`${inputClass} resize-y`}
            />
          )}
        </Field>

        {/* Honeypot: hidden from people, keyboards and assistive tech. Clipped in place
            (not pushed off-screen, which would widen right-to-left pages). */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="enq-website">{t("honeypot")}</label>
          <input id="enq-website" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>

        <div className="min-h-[65px] sm:col-span-2">
          {showCaptcha && SITE_KEY ? (
            <Turnstile
              ref={turnstile}
              siteKey={SITE_KEY}
              onSuccess={setToken}
              onExpire={() => setToken("")}
              onError={() => setToken("")}
              options={{ theme: "dark", language: locale, size: "flexible" }}
            />
          ) : (
            <p className="text-14 text-muted">{t("captchaLoading")}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            data-magnetic
            className="label inline-flex min-h-12 items-center justify-center gap-3 bg-gold px-8 py-3 text-bg transition-colors hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? t("sending") : t("submit")}
          </button>
          <p className="text-14 text-muted">{t("privacy")}</p>
        </div>

        <p role="alert" aria-live="assertive" className="text-[#f2a7a0] empty:hidden sm:col-span-2">
          {formError}
        </p>
      </form>
    </div>
  );
}
