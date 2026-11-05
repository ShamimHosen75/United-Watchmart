import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getBranchScope, listProducts, listStock, type StockFilters } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { date, money, titleCase } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Inventory" };

const tabs = [
  { value: "available", label: "Available" },
  { value: "in_stock", label: "In stock" },
  { value: "reserved", label: "Reserved" },
  { value: "in_repair", label: "In repair" },
  { value: "sold", label: "Sold" },
  { value: "", label: "All" },
] as const;

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const sp = await searchParams;
  const status = (param(sp.status) ?? "available") as StockFilters["status"];
  const filters: StockFilters = { q: param(sp.q), product: param(sp.product), status };
  const [rows, allRows, products, scope] = await Promise.all([
    listStock(filters),
    listStock({ q: filters.q, product: filters.product }),
    listProducts(),
    getBranchScope(),
  ]);
  const count = (s: string) =>
    s === "" ? allRows.length : s === "available" ? allRows.filter((r) => r.status === "in_stock" || r.status === "reserved").length : allRows.filter((r) => r.status === s).length;
  const href = (s: string) => {
    const q = new URLSearchParams();
    if (filters.q) q.set("q", filters.q);
    if (filters.product) q.set("product", filters.product);
    q.set("status", s);
    return `/inventory?${q}`;
  };
  const value = rows.filter((r) => r.status === "in_stock" || r.status === "reserved").reduce((t, r) => t + r.price, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every physical watch, tracked by serial number."
        actions={<ButtonLink href={`/inventory/new${scope !== "all" ? `?branch=${scope}` : ""}`}><Plus className="size-4" />Add stock</ButtonLink>}
      />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Stock status">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={href(t.value)}
              aria-current={status === t.value ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap",
                status === t.value ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text",
              )}
            >
              {t.label} <span className="text-xs text-muted">{count(t.value)}</span>
            </Link>
          ))}
        </nav>
        <FilterBar q={filters.q} placeholder="Search serial, model, reference or location" resetHref="/inventory">
          <input type="hidden" name="status" value={status} />
          <FilterSelect name="product" label="Watch" value={filters.product} options={products.map((p) => ({ value: p.id, label: p.name }))} />
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here">No watches match these filters in the selected branch.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Serial</Th>
                <Th>Watch</Th>
                <Th>Branch</Th>
                <Th>Location</Th>
                <Th>Condition</Th>
                <Th>Box / papers</Th>
                <Th>Received</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50">
                  <Td><Link href={`/inventory/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.serial_number}</Link></Td>
                  <Td>
                    <Link href={`/watches/${r.product_id}`} className="hover:underline">{r.product_name}</Link>
                    <span className="block text-xs text-muted">{r.ref_number}</span>
                  </Td>
                  <Td>{r.branch_name}</Td>
                  <Td className="text-muted">{r.location_note ?? "—"}</Td>
                  <Td className="text-muted">{titleCase(r.condition)}</Td>
                  <Td className="text-muted">{r.has_box ? "Box" : "—"} / {r.has_papers ? "Papers" : "—"}</Td>
                  <Td className="text-muted">{date(r.received_at)}</Td>
                  <Td className="text-right">{money(r.price)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">
          {rows.length} piece{rows.length === 1 ? "" : "s"}{value > 0 && ` · ${money(value)} at retail (available)`}
        </p>
      </Card>
    </>
  );
}
