import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { getCurrentUser, listBranches, listBrands } from "@/lib/data";
import { getCampaign, personalise, segmentRecipients } from "@/lib/data/business";
import { emailConfigured } from "@/lib/email";
import { deleteCampaignAction } from "../../actions";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignForm, SendCampaign } from "@/components/business/campaign-forms";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Campaign" };

export default async function CampaignPage({ params }: PageProps<"/settings/marketing/[id]">) {
  const { id } = await params;
  const [c, branches, brands, me] = await Promise.all([getCampaign(id), listBranches(), listBrands(), getCurrentUser()]);
  if (!c) notFound();
  const manager = Boolean(me && ["owner", "admin", "manager"].includes(me.role));
  const recipients = await segmentRecipients(c.segment, c.channel);
  const s = c.segment;
  const audience = [
    s.vip && "VIP", s.birthday_month && "birthday this month", s.tag && `tagged "${s.tag}"`,
    s.branch_id && `prefers ${branches.find((b) => b.id === s.branch_id)?.name}`, s.brand_id && `bought ${brands.find((b) => b.id === s.brand_id)?.name}`,
  ].filter(Boolean).join(", ") || "all opted-in clients";
  const sample = recipients[0];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/settings/marketing" className="text-muted hover:text-text">← Campaigns</Link></p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-2xl font-semibold">{c.name}</h2>
        {c.status === "sent" ? <Badge tone="success">Sent {dateTime(c.sent_at)} to {c.recipients}</Badge> : <Badge>Draft</Badge>}
        {c.status === "draft" && manager && (
          <form action={deleteCampaignAction.bind(null, c.id)} className="ml-auto"><Button variant="ghost"><Trash2 className="size-4" />Delete draft</Button></form>
        )}
      </div>
      <div className="grid gap-6 2xl:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <div className="space-y-6">
          {c.status === "draft" && manager ? (
            <Card><CardHeader title="Message and audience" /><CampaignForm campaign={c} branches={branches} brands={brands} /></Card>
          ) : (
            <Card>
              <CardHeader title={c.channel === "email" ? `Email · ${c.subject}` : "WhatsApp message"} subtitle={`Audience: ${audience}`} />
              <p className="p-5 text-sm whitespace-pre-line">{c.message}</p>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Reaches ${recipients.length} client${recipients.length === 1 ? "" : "s"}`} subtitle={`Audience: ${audience}${c.channel === "email" ? ", with an email address" : ", with a phone number"}`} />
            {sample && (
              <div className="border-b border-border p-5 text-sm">
                <p className="mb-1 text-xs text-muted">Preview for {sample.full_name}</p>
                {c.subject && <p className="font-medium">{c.subject}</p>}
                <p className="whitespace-pre-line text-muted">{personalise(c.message, sample.full_name)}</p>
              </div>
            )}
            {c.status === "draft" && manager && <SendCampaign id={c.id} channel={c.channel} count={recipients.length} ready={emailConfigured} />}
          </Card>
          <Card>
            <CardHeader title="Recipients" />
            {recipients.length === 0 ? <EmptyState title="Nobody matches yet">Loosen the audience or ask clients to opt in.</EmptyState> : (
              <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                {recipients.map((r) => {
                  const phone = r.phone?.replace(/[^\d]/g, "");
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <Link href={`/customers/${r.id}`} className="min-w-0 hover:underline"><span className="block truncate">{r.full_name}</span><span className="block truncate text-xs text-muted">{c.channel === "email" ? r.email : r.phone}</span></Link>
                      {c.channel === "whatsapp" && phone && (
                        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(personalise(c.message, r.full_name))}`} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center gap-1 text-xs text-accent-strong hover:underline">
                          <MessageCircle className="size-3.5" />Send
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
