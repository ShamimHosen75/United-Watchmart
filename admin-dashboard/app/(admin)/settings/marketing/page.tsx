import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listCampaigns } from "@/lib/data/business";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { date } from "@/lib/format";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const campaigns = await listCampaigns();
  return (
    <Card>
      <CardHeader title="Campaigns" subtitle="Email or WhatsApp messages to clients who agreed to marketing." action={<ButtonLink href="/settings/marketing/new"><Plus className="size-4" />New campaign</ButtonLink>} />
      {campaigns.length === 0 ? <EmptyState title="No campaigns yet">Start with a service reminder or a new arrival.</EmptyState> : (
        <Table>
          <thead><tr><Th>Campaign</Th><Th>Channel</Th><Th>Created</Th><Th>Sent</Th><Th className="text-right">Recipients</Th><Th>Status</Th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2/50">
                <Td><Link href={`/settings/marketing/${c.id}`} className="font-medium hover:underline">{c.name}</Link></Td>
                <Td className="text-muted">{c.channel === "email" ? "Email" : "WhatsApp"}</Td>
                <Td className="text-muted">{date(c.created_at)}</Td>
                <Td className="text-muted">{date(c.sent_at)}</Td>
                <Td className="text-right">{c.status === "sent" ? c.recipients : "—"}</Td>
                <Td>{c.status === "sent" ? <Badge tone="success">Sent</Badge> : <Badge>Draft</Badge>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
