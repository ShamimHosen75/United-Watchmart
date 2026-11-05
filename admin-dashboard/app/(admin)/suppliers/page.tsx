import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listSuppliers } from "@/lib/data/supply";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { date, money } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const q = param((await searchParams).q);
  const rows = await listSuppliers(q);
  return (
    <>
      <PageHeader title="Suppliers" description="Brands, distributors and parts suppliers you buy from." actions={<ButtonLink href="/suppliers/new"><Plus className="size-4" />Add supplier</ButtonLink>} />
      <Card>
        <FilterBar q={q} placeholder="Search supplier, contact or country" resetHref="/suppliers" />
        {rows.length === 0 ? <EmptyState title="No suppliers yet" /> : (
          <Table>
            <thead><tr><Th>Supplier</Th><Th>Contact</Th><Th>Terms</Th><Th className="text-right">Orders</Th><Th className="text-right">Bought</Th><Th>Last order</Th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2/50">
                  <Td>
                    <Link href={`/suppliers/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                    <span className="block text-xs text-muted">{s.country}</span>
                  </Td>
                  <Td className="text-muted">{s.contact_name}<span className="block text-xs">{s.email ?? s.phone}</span></Td>
                  <Td className="text-muted">{s.payment_terms ?? "—"}</Td>
                  <Td className="text-right">{s.purchases}{s.open_orders > 0 && <Badge tone="info" className="ml-1.5">{s.open_orders} open</Badge>}</Td>
                  <Td className="text-right font-medium">{s.spent ? money(s.spent) : "—"}</Td>
                  <Td className="text-muted">{s.is_active ? date(s.last_order) : <Badge>Inactive</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
