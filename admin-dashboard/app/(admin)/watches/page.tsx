import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Watch } from "lucide-react";
import { listBrands, listCollections, listProducts, type ProductFilters } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { money, titleCase } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Watches" };

export default async function WatchesPage({ searchParams }: PageProps<"/watches">) {
  const sp = await searchParams;
  const filters: ProductFilters = {
    q: param(sp.q),
    status: (param(sp.status) ?? "") as ProductFilters["status"],
    collection: param(sp.collection),
    brand: param(sp.brand),
    strap: (param(sp.strap) ?? "") as ProductFilters["strap"],
  };
  const [products, collections, brands] = await Promise.all([listProducts(filters), listCollections(), listBrands()]);

  return (
    <>
      <PageHeader
        title="Watches"
        description="Your catalogue of models. Stock counts follow the branch picked at the top."
        actions={<ButtonLink href="/watches/new"><Plus className="size-4" />New watch</ButtonLink>}
      />
      <Card>
        <FilterBar q={filters.q} placeholder="Search name, reference or SKU" resetHref="/watches">
          <FilterSelect name="brand" label="Brand" value={filters.brand} options={brands.map((b) => ({ value: b.id, label: b.name }))} />
          <FilterSelect name="collection" label="Category" value={filters.collection} options={collections.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect name="strap" label="Strap" value={filters.strap} options={["bracelet", "leather", "rubber", "fabric", "other"].map((s) => ({ value: s, label: titleCase(s) }))} />
          <FilterSelect name="status" label="Status" value={filters.status} options={["active", "draft", "archived"].map((s) => ({ value: s, label: titleCase(s) }))} />
        </FilterBar>
        {products.length === 0 ? (
          <EmptyState title="No watches match">Try another search or reset the filters.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Watch</Th>
                <Th>Brand</Th>
                <Th>Category</Th>
                <Th>Movement</Th>
                <Th>Strap</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">In stock</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2/50">
                  <Td>
                    <Link href={`/watches/${p.id}`} className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="size-full object-cover" />
                        ) : (
                          <Watch className="size-4 text-muted" aria-hidden />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium hover:underline">{p.name}</span>
                        <span className="block text-xs text-muted">{p.ref_number} · {p.sku}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>{p.brand_name ?? <span className="text-muted">—</span>}</Td>
                  <Td className="text-muted">{p.collection_name ?? "—"}</Td>
                  <Td className="text-muted">{p.movement ? titleCase(p.movement) : "—"}</Td>
                  <Td className="text-muted">{p.strap ? titleCase(p.strap) : "—"}</Td>
                  <Td className="text-right font-medium">{money(p.price)}</Td>
                  <Td className="text-right">
                    <Badge tone={p.in_stock === 0 ? "danger" : p.in_stock <= 1 ? "warning" : "success"}>{p.in_stock}</Badge>
                    {p.reserved > 0 && <span className="ml-1 text-xs text-muted">+{p.reserved} held</span>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={p.status} />
                      {p.is_published && <Badge tone="info">Web</Badge>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{products.length} watch{products.length === 1 ? "" : "es"}</p>
      </Card>
    </>
  );
}
