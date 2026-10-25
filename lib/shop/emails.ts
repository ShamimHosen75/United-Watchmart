import { getTranslations } from "next-intl/server";
import type { Order, OrderItem } from "@/lib/db/schema";
import { emailConfig } from "@/lib/email/config";
import { emailHtml, emailText, type Row } from "@/lib/email/layout";
import { sendMail, type Mail } from "@/lib/email/send";
import { formatCents } from "@/lib/format";
import { siteUrl } from "@/lib/seo";

type Locale = "en" | "ar";

const address = (o: Order) => {
  const a = o.shippingAddress;
  if (!a) return "—";
  return [o.name, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), a.state, a.country]
    .filter(Boolean)
    .join("\n");
};

const asLocale = (l: string): Locale => (l === "ar" ? "ar" : "en");

/** Confirmation to the customer (their language) and a notification to the boutique (English). */
export async function sendOrderEmails(order: Order, items: OrderItem[]) {
  const cfg = emailConfig();
  const locale = asLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const mails: Mail[] = [];

  const lines: Row[] = items.map((i) => [`${i.name} · ${i.ref}`, `${i.quantity} × ${formatCents(i.unitPriceCents)}`]);

  if (order.email) {
    const title = t("orderTitle", { name: order.name ?? "" }).replace(/\s+\./, ".");
    const intro = t("orderIntro");
    const rows: Row[] = [
      [t("orderRef"), order.ref],
      ...lines,
      [t("orderTotal"), formatCents(order.totalCents)],
      [t("orderShipTo"), address(order)],
    ];
    mails.push({
      to: order.email,
      replyTo: cfg.boutique || undefined,
      subject: t("orderSubject", { ref: order.ref }),
      html: emailHtml({ dir: locale === "ar" ? "rtl" : "ltr", title, intro, rows, footer: t("orderFooter") }),
      text: emailText(title, intro, rows, t("orderFooter")),
    });
  }

  if (cfg.boutique || cfg.dryRun) {
    const title = `New order ${order.ref}`;
    const intro = `${order.name ?? "A customer"} paid ${formatCents(order.totalCents)}.${order.stockIssue ? " ATTENTION: check stock and amount." : ""}`;
    const rows: Row[] = [
      ["Order", order.ref],
      ...lines,
      ["Total", formatCents(order.totalCents)],
      ["Email", order.email ?? "—"],
      ["Phone", order.phone ?? "—"],
      ["Ship to", address(order)],
      ["Admin", `${siteUrl}/admin/orders/${order.id}`],
    ];
    mails.push({
      to: cfg.boutique,
      replyTo: order.email ?? undefined,
      subject: title,
      html: emailHtml({ dir: "ltr", title, intro, rows }),
      text: emailText(title, intro, rows),
    });
  }

  if (mails.length) await sendMail(mails, "order");
}

/** Tells the customer their order has shipped. */
export async function sendShippedEmail(order: Order) {
  if (!order.email) return;
  const cfg = emailConfig();
  const locale = asLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const title = t("shippedTitle");
  const intro = t("shippedIntro");
  const rows: Row[] = [
    [t("orderRef"), order.ref],
    [t("carrier"), order.carrier ?? "—"],
    [t("tracking"), order.trackingNumber ?? "—"],
    [t("orderShipTo"), address(order)],
  ];
  await sendMail(
    [
      {
        to: order.email,
        replyTo: cfg.boutique || undefined,
        subject: t("shippedSubject", { ref: order.ref }),
        html: emailHtml({ dir: locale === "ar" ? "rtl" : "ltr", title, intro, rows }),
        text: emailText(title, intro, rows),
      },
    ],
    "shipped",
  );
}
