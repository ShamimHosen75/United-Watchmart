import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { listCustomers } from "@/lib/data/clients";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { date, money } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const vip = param(sp.vip) === "1";
  const sort = param(sp.sort) ?? "name";
  const rows = (await listCustomers({ q, vip })).sort((a, b) =>
    sort === "spent" ? b.spent - a.spent : sort === "recent" ? (b.last_purchase ?? "").localeCompare(a.last_purchase ?? "") : 0,
  );

  return (
    <>
      <PageHeader title="Customers" description="Your client book: who bought what, and what they are looking for." actions={<ButtonLink href="/customers/new"><Plus className="size-4" />Add client</ButtonLink>} />
      <Card>
        <FilterBar q={q} placeholder="Search name, phone, email or tag" resetHref="/customers">
          <FilterSelect name="vip" label="VIP" value={vip ? "1" : ""} options={[{ value: "1", label: "VIP only" }]} />
          <select name="sort" defaultValue={sort} aria-label="Sort" className="h-9 rounded-lg border border-border bg-surface pr-8 pl-3 text-sm">
            <option value="name">Sort: name</option>
            <option value="spent">Sort: total spent</option>
            <option value="recent">Sort: last purchase</option>
          </select>
        </FilterBar>
        {rows.length === 0 ? <EmptyState title="No clients found" /> : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Contact</Th><Th>City</Th><Th className="text-right">Orders</Th><Th className="text-right">Spent</Th><Th>Last purchase</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/50">
                  <Td>
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
                      {c.full_name}{c.is_vip && <Star className="size-3.5 fill-accent text-accent" aria-label="VIP" />}
                    </Link>
                    {c.tags.length > 0 && <span className="mt-1 flex gap-1">{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</span>}
                  </Td>
                  <Td className="text-muted">{c.phone}<span className="block text-xs">{c.email}</span></Td>
                  <Td className="text-muted">{c.city ?? "—"}</Td>
                  <Td className="text-right">{c.orders}</Td>
                  <Td className="text-right font-medium">{c.spent ? money(c.spent) : "—"}</Td>
                  <Td className="text-muted">{date(c.last_purchase)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{rows.length} client{rows.length === 1 ? "" : "s"}</p>
      </Card>
    </>
  );
}
