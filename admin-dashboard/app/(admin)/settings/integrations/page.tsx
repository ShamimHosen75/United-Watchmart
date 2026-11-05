import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { emailConfigured } from "@/lib/email";
import { hasServiceRole } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/business";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const s = await getSettings();
  const allowed = process.env.ALLOWED_ORIGIN;
  const items = [
    {
      name: "Supabase database", on: !isDemoMode,
      what: "Stores everything: stock, sales, clients, repairs and staff accounts.",
      how: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then run the migrations listed in the README.",
    },
    {
      name: "Staff invite emails", on: hasServiceRole,
      what: "Lets Users → Invite send the sign-up email directly.",
      how: "Set SUPABASE_SERVICE_ROLE_KEY on the server only. Never prefix it with NEXT_PUBLIC_.",
    },
    {
      name: "Resend email", on: emailConfigured,
      what: "Sends email campaigns and the new-viewing-request alert.",
      how: "Create a Resend account, verify your domain, then set RESEND_API_KEY and RESEND_FROM (e.g. United WatchMart <hello@yourdomain.com>).",
    },
    {
      name: "Website viewing form", on: Boolean(allowed),
      what: `Your website posts "Request a viewing" forms to ${origin}/api/public/viewing-requests.`,
      how: allowed ? `Accepting requests from ${allowed}.` : "Set ALLOWED_ORIGIN to your website's address (e.g. https://unitedwatchmart.com) so browsers may post to it.",
    },
    {
      name: "Website content refresh", on: Boolean(process.env.SITE_REVALIDATE_URL),
      what: `Your website reads published pages from ${origin}/api/public/content/home (and the other pages). Publishing can refresh the site at once.`,
      how: process.env.SITE_REVALIDATE_URL ? `Publishing calls ${process.env.SITE_REVALIDATE_URL}.` : "Set SITE_REVALIDATE_URL and SITE_REVALIDATE_SECRET, and add the refresh route from docs/website-content.md to the website.",
    },
    {
      name: "WhatsApp", on: Boolean(s.whatsapp_number),
      what: "Repair updates and WhatsApp campaigns open WhatsApp with the message written. Staff press send.",
      how: s.whatsapp_number ? `Business number: ${s.whatsapp_number}. Change it in Store and invoice.` : "Add your business number in Store and invoice.",
    },
  ];
  return (
    <div className="space-y-4">
      {items.map((i) => (
        <Card key={i.name} className="flex gap-4 p-5">
          {i.on ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{i.name}</h2>{i.on ? <Badge tone="success">Connected</Badge> : <Badge>Not set up</Badge>}</div>
            <p className="mt-1 text-sm text-muted">{i.what}</p>
            <p className="mt-2 text-sm break-words">{i.how}</p>
          </div>
        </Card>
      ))}
      <p className="text-xs text-muted">Keys are read from the server&apos;s environment and are never shown or stored in the database.</p>
    </div>
  );
}
