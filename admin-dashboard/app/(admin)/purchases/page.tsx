import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listPurchases } from "@/lib/data/supply";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { date, money } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";
import type { PurchaseStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Purchases" };

const tabs = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "ordered", label: "On order" },
  { value: "partially_received", label: "Part received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function PurchasesPage({ searchParams }: PageProps<"/purchases">) {
  const sp = await searchParams;
  const status = (param(sp.status) ?? "") as PurchaseStatus | "";
  const q = param(sp.q);
  const all = await listPurchases({ q });
  const rows = all.filter((p) => !status || p.status === status);
  const onOrder = all.filter((p) => p.status === "ordered" || p.status === "partially_received").reduce((t, p) => t + p.total, 0);

  return (
    <>
      <PageHeader title="Purchases" description="Purchase orders to suppliers. Receiving a delivery adds each watch to stock by serial." actions={<ButtonLink href="/purchases/new"><Plus className="size-4" />New purchase</ButtonLink>} />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Purchase status">
          {tabs.map((t) => (
            <Link key={t.value} href={`/purchases${t.value ? `?status=${t.value}` : ""}`} aria-current={status === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", status === t.value ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{all.filter((p) => !t.value || p.status === t.value).length}</span>
            </Link>
          ))}
        </nav>
        <FilterBar q={q} placeholder="Search PO number or supplier" resetHref="/purchases">{status && <input type="hidden" name="status" value={status} />}</FilterBar>
        {rows.length === 0 ? <EmptyState title="No purchase orders here" /> : (
          <Table>
            <thead><tr><Th>Order</Th><Th>Supplier</Th><Th>Deliver to</Th><Th>Ordered</Th><Th>Expected</Th><Th className="text-right">Received</Th><Th className="text-right">Total</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const late = (p.status === "ordered" || p.status === "partially_received") && p.expected_at && p.expected_at < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={p.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/purchases/${p.id}`} className="font-medium hover:underline">{p.number}</Link></Td>
                    <Td><Link href={`/suppliers/${p.supplier_id}`} className="hover:underline">{p.supplier_name}</Link></Td>
                    <Td className="text-muted">{p.branch_name}</Td>
                    <Td className="text-muted">{date(p.ordered_at)}</Td>
                    <Td className={late ? "font-medium text-danger" : "text-muted"}>{date(p.expected_at)}{late && " · late"}</Td>
                    <Td className="text-right">{p.received_qty} / {p.ordered_qty}</Td>
                    <Td className="text-right font-medium">{money(p.total)}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{money(onOrder)} currently on order</p>
      </Card>
    </>
  );
}
