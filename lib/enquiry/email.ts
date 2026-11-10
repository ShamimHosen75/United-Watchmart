import { getTranslations } from "next-intl/server";
import { getWatch } from "@/data/products";
import { emailConfig } from "@/lib/email/config";
import { emailHtml, emailText, type Row } from "@/lib/email/layout";
import { sendMail } from "@/lib/email/send";
import { formatPrice } from "@/lib/format";
import type { EnquiryValues } from "./schema";

type Locale = "en";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Sends the boutique notification and the customer confirmation. Throws on failure. */
export async function sendEnquiryEmails(data: EnquiryValues, locale: Locale) {
  const cfg = emailConfig();
  if (!cfg.dryRun && !cfg.boutique) throw new Error("BOUTIQUE_EMAIL is not set");
  const watch = getWatch(data.watch);
  const watchLabel = watch ? `${watch.name} (${watch.ref}) · ${formatPrice(watch.priceUsd)}` : data.watch;

  // Boutique email is always in English.
  const boutiqueRows: Row[] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone", data.phone || "—"],
    ["Watch", watchLabel],
    ["Preferred date", formatDate(data.date)],
    ["Message", data.message || "—"],
  ];
  const boutiqueTitle = `Viewing request: ${watch?.name ?? data.watch}`;
  const boutiqueIntro = `${data.name} would like to see a watch in person.`;

  // Customer confirmation.
  const t = await getTranslations({ locale, namespace: "email" });
  const customerRows: Row[] = [
    [t("watch"), watch ? `${watch.name} · ${watch.ref}` : data.watch],
    [t("date"), formatDate(data.date)],
  ];
  const customerTitle = t("title", { name: data.name });
  const customerIntro = t("intro");

  await sendMail(
    [
      {
        to: cfg.boutique,
        replyTo: data.email,
        subject: boutiqueTitle,
        html: emailHtml({ title: boutiqueTitle, intro: boutiqueIntro, rows: boutiqueRows }),
        text: emailText(boutiqueTitle, boutiqueIntro, boutiqueRows),
      },
      {
        to: data.email,
        replyTo: cfg.boutique || undefined,
        subject: t("subject"),
        html: emailHtml({ title: customerTitle, intro: customerIntro, rows: customerRows }),
        text: emailText(customerTitle, customerIntro, customerRows),
      },
    ],
    "enquiry",
  );
}
