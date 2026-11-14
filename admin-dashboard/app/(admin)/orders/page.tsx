import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listOrders, type OrderFilters } from "@/lib/data/sales";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { dateTime, money } from "@/lib/format";
import { channels } from "@/lib/labels";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Orders" };

const tabs = [
  { value: "", label: "All" },
  { value: "open", label: "Balance due" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const sp = await searchParams;
  const status = (param(sp.status) ?? "") as OrderFilters["status"];
  const filters: OrderFilters = { q: param(sp.q), channel: (param(sp.channel) ?? "") as OrderFilters["channel"] };
  const all = await listOrders(filters);
  const count = (s: string) => (s === "" ? all.length : s === "open" ? all.filter((o) => o.status === "pending").length : all.filter((o) => o.status === s).length);
  const rows = all.filter((o) => !status || (status === "open" ? o.status === "pending" : o.status === status));
  const href = (s: string) => {
    const q = new URLSearchParams();
    if (filters.q) q.set("q", filters.q);
    if (filters.channel) q.set("channel", filters.channel);
    if (s) q.set("status", s);
    return `/orders${q.size ? `?${q}` : ""}`;
  };
  const revenue = rows.filter((o) => o.status === "completed" || o.status === "pending" || o.status === "paid").reduce((t, o) => t + o.total, 0);

  return (
    <>
      <PageHeader title="Orders" description="Every sale, its payments and the watches sold." actions={<ButtonLink href="/orders/new"><Plus className="size-4" />New sale</ButtonLink>} />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Order status">
          {tabs.map((t) => (
            <Link key={t.value} href={href(t.value)} aria-current={status === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", status === t.value ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{count(t.value)}</span>
            </Link>
          ))}
        </nav>
        <FilterBar q={filters.q} placeholder="Search order number, client or watch" resetHref="/orders">
          {status && <input type="hidden" name="status" value={status} />}
          <FilterSelect name="channel" label="Channel" value={filters.channel} options={channels.map((c) => ({ value: c.value, label: c.label }))} />
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState title="No orders here" />
        ) : (
          <Table>
            <thead>
              <tr><Th>Order</Th><Th>Date</Th><Th>Client</Th><Th>Watches</Th><Th>Branch</Th><Th className="text-right">Total</Th><Th className="text-right">Due</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2/50">
                  <Td><Link href={`/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></Td>
                  <Td className="whitespace-nowrap text-muted">{dateTime(o.placed_at)}</Td>
                  <Td>{o.customer_id ? <Link href={`/customers/${o.customer_id}`} className="hover:underline">{o.customer_name}</Link> : <span className="text-muted">Walk-in</span>}</Td>
                  <Td className="max-w-56 truncate">{o.items_label}</Td>
                  <Td className="text-muted">{o.branch_name}</Td>
                  <Td className="text-right font-medium">{money(o.total)}</Td>
                  <Td className="text-right">{o.status === "pending" ? <span className="text-warning">{money(o.total - o.amount_paid)}</span> : <span className="text-muted">—</span>}</Td>
                  <Td><StatusBadge status={o.status === "pending" ? "balance_due" : o.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{rows.length} order{rows.length === 1 ? "" : "s"} · {money(revenue)} in sales</p>
      </Card>
    </>
  );
}
