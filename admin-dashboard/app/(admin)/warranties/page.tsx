import type { Metadata } from "next";
import Link from "next/link";
import { listWarranties, type WarrantyRow } from "@/lib/data/clients";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { date, isoDateFromToday } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Warranties" };

const tabs = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "void", label: "Void" },
  { value: "", label: "All" },
] as const;

export default async function WarrantiesPage({ searchParams }: PageProps<"/warranties">) {
  const sp = await searchParams;
  const state = (param(sp.state) ?? "active") as WarrantyRow["state"] | "";
  const q = param(sp.q);
  const all = await listWarranties({ q });
  const rows = all.filter((w) => !state || w.state === state);
  const soon = isoDateFromToday(60);

  return (
    <>
      <PageHeader title="Warranties" description="Issued automatically with every sale. Look one up by card number, serial or client." />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Warranty status">
          {tabs.map((t) => (
            <Link key={t.value} href={`/warranties?state=${t.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={state === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", state === t.value ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{all.filter((w) => !t.value || w.state === t.value).length}</span>
            </Link>
          ))}
        </nav>
        <FilterBar q={q} placeholder="Card number, serial, watch or client" resetHref="/warranties"><input type="hidden" name="state" value={state} /></FilterBar>
        {rows.length === 0 ? <EmptyState title="No warranties found" /> : (
          <Table>
            <thead><tr><Th>Card</Th><Th>Watch</Th><Th>Serial</Th><Th>Client</Th><Th>Order</Th><Th>Valid until</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="hover:bg-surface-2/50">
                  <Td className="font-medium">{w.card_number}</Td>
                  <Td>{w.product_name}<span className="block text-xs text-muted">{w.ref_number}</span></Td>
                  <Td><Link href={`/inventory/${w.stock_item_id}`} className="font-mono text-xs hover:underline">{w.serial_number}</Link></Td>
                  <Td>{w.customer_id ? <Link href={`/customers/${w.customer_id}`} className="hover:underline">{w.customer_name}</Link> : <span className="text-muted">Walk-in</span>}</Td>
                  <Td>{w.order_id ? <Link href={`/orders/${w.order_id}`} className="hover:underline">{w.order_number}</Link> : "—"}</Td>
                  <Td className={w.state === "active" && w.ends_on <= soon ? "text-warning" : "text-muted"}>{date(w.ends_on)}</Td>
                  <Td><StatusBadge status={w.state} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{rows.length} warrant{rows.length === 1 ? "y" : "ies"}. Dates in amber end within 60 days.</p>
      </Card>
    </>
  );
}
