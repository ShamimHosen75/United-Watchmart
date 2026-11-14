import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { listTransfers } from "@/lib/data/supply";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { dateTime } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";
import type { TransferStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Transfers" };

const tabs = [
  { value: "in_transit", label: "In transit" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
] as const;

export default async function TransfersPage({ searchParams }: PageProps<"/transfers">) {
  const status = (param((await searchParams).status) ?? "in_transit") as TransferStatus | "";
  const all = await listTransfers();
  const rows = all.filter((t) => !status || t.status === status);
  return (
    <>
      <PageHeader title="Transfers" description="Move watches between branches. They show as in transit until the other branch confirms arrival." actions={<ButtonLink href="/transfers/new"><Plus className="size-4" />New transfer</ButtonLink>} />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Transfer status">
          {tabs.map((t) => (
            <Link key={t.value} href={`/transfers?status=${t.value}`} aria-current={status === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", status === t.value ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{all.filter((x) => !t.value || x.status === t.value).length}</span>
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? <EmptyState title="No transfers here" /> : (
          <Table>
            <thead><tr><Th>Transfer</Th><Th>Route</Th><Th>Watches</Th><Th>Sent</Th><Th>Arrived</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-surface-2/50">
                  <Td><Link href={`/transfers/${t.id}`} className="font-medium hover:underline">{t.number}</Link></Td>
                  <Td className="whitespace-nowrap">{t.from_name} <ArrowRight className="inline size-3.5 text-muted" aria-label="to" /> {t.to_name}</Td>
                  <Td className="max-w-64 truncate text-muted">{t.pieces.map((p) => p.product_name).join(", ")}</Td>
                  <Td className="text-muted">{dateTime(t.shipped_at)}</Td>
                  <Td className="text-muted">{dateTime(t.received_at)}</Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
