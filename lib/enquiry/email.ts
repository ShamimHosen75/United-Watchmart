import { getTranslations } from "next-intl/server";
import { Resend } from "resend";
import { getWatch } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { enquiryConfig } from "./config";
import type { EnquiryValues } from "./schema";

type Locale = "en" | "ar";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const formatDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Minimal dark, gold-accented HTML wrapper that renders well in most mail clients. */
function layout(dir: "ltr" | "rtl", title: string, rows: [string, string][], intro: string) {
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;color:#a8997f;font-size:13px;letter-spacing:.08em;text-transform:uppercase;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;color:#efe6d6;font-size:15px">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html dir="${dir}"><body style="margin:0;background:#0e0803;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0803;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a120a;padding:40px;text-align:${dir === "rtl" ? "right" : "left"}">
<tr><td style="font-family:Georgia,serif;font-size:22px;color:#efe6d6;padding-bottom:24px">United <span style="color:#c9a35c">WatchMart</span></td></tr>
<tr><td style="font-family:Georgia,serif;font-size:28px;color:#efe6d6;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="color:#efe6d6;font-size:15px;line-height:1.6;padding-bottom:24px">${esc(intro)}</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(201,163,92,.3)">${body}</table></td></tr>
</table></td></tr></table></body></html>`;
}

const textVersion = (title: string, intro: string, rows: [string, string][]) =>
  [title, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");

/** Sends the boutique notification and the customer confirmation. Throws on failure. */
export async function sendEnquiryEmails(data: EnquiryValues, locale: Locale) {
  const cfg = enquiryConfig();
  const watch = getWatch(data.watch);
  const watchLabel = watch ? `${watch.name} (${watch.ref}) · ${formatPrice(watch.priceUsd, "en")}` : data.watch;

  // Boutique email is always in English.
  const boutiqueRows: [string, string][] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone", data.phone || "—"],
    ["Watch", watchLabel],
    ["Preferred date", formatDate(data.date, "en")],
    ["Language", locale === "ar" ? "Arabic" : "English"],
    ["Message", data.message || "—"],
  ];
  const boutiqueTitle = `Viewing request: ${watch?.name ?? data.watch}`;
  const boutiqueIntro = `${data.name} would like to see a watch in person.`;

  // Customer confirmation in their language.
  const t = await getTranslations({ locale, namespace: "email" });
  const customerRows: [string, string][] = [
    [t("watch"), watch ? `${watch.name} · ${watch.ref}` : data.watch],
    [t("date"), formatDate(data.date, locale)],
  ];
  const customerTitle = t("title", { name: data.name });
  const customerIntro = t("intro");

  const messages = [
    {
      from: cfg.from,
      to: cfg.boutique,
      replyTo: data.email,
      subject: boutiqueTitle,
      html: layout("ltr", boutiqueTitle, boutiqueRows, boutiqueIntro),
      text: textVersion(boutiqueTitle, boutiqueIntro, boutiqueRows),
    },
    {
      from: cfg.from,
      to: data.email,
      replyTo: cfg.boutique || undefined,
      subject: t("subject"),
      html: layout(locale === "ar" ? "rtl" : "ltr", customerTitle, customerRows, customerIntro),
      text: textVersion(customerTitle, customerIntro, customerRows),
    },
  ];

  if (cfg.dryRun) {
    console.info("[enquiry:dry-run]", JSON.stringify(messages.map(({ to, subject, text }) => ({ to, subject, text }))));
    return;
  }
  if (!cfg.resendKey || !cfg.from || !cfg.boutique) throw new Error("Enquiry email is not configured");

  const resend = new Resend(cfg.resendKey);
  const results = await Promise.all(messages.map((m) => resend.emails.send(m)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Resend: ${failed.error.message}`);
}
