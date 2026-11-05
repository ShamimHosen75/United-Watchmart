import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { getTransfer } from "@/lib/data/supply";
import { closeTransferAction } from "../actions";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { dateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Transfer" };

export default async function TransferPage({ params }: PageProps<"/transfers/[id]">) {
  const { id } = await params;
  const t = await getTransfer(id);
  if (!t) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/transfers" className="text-muted hover:text-text">← Transfers</Link></p>
      <PageHeader
        title={t.number}
        description={`Sent ${dateTime(t.shipped_at)}${t.received_at ? ` · arrived ${dateTime(t.received_at)}` : ""}`}
        actions={
          <>
            <StatusBadge status={t.status} />
            {t.status === "in_transit" && (
              <>
                <form action={closeTransferAction.bind(null, id, false)}><Button variant="ghost"><X className="size-4" />Cancel</Button></form>
                <form action={closeTransferAction.bind(null, id, true)}><Button><Check className="size-4" />Mark as arrived</Button></form>
              </>
            )}
          </>
        }
      />
      <Card className="mb-6 flex items-center justify-center gap-6 p-6 text-lg">
        <span className="font-serif">{t.from_name}</span>
        <ArrowRight className="size-5 text-accent" aria-label="to" />
        <span className="font-serif">{t.to_name}</span>
      </Card>
      <Card>
        <CardHeader title={`${t.pieces.length} watch${t.pieces.length === 1 ? "" : "es"}`} subtitle={t.notes ?? undefined} />
        <ul className="divide-y divide-border">
          {t.pieces.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <Link href={`/inventory/${s.id}`} className="flex-1 hover:underline">
                {s.product_name} <span className="text-muted">· {s.ref_number}</span>
                <span className="block font-mono text-xs text-muted">{s.serial_number}</span>
              </Link>
              <span className="text-muted">{s.branch_name}</span>
              <StatusBadge status={s.status} />
              <span className="w-20 text-right">{money(s.price)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
