import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { getProduct, listBrands, listCollections, listStock } from "@/lib/data";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { date, money, titleCase } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/watches/[id]">): Promise<Metadata> {
  const product = await getProduct((await params).id);
  return { title: product?.name ?? "Watch" };
}

export default async function WatchPage({ params }: PageProps<"/watches/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const [stock, brands, collections] = await Promise.all([listStock({ product: id, branch: "all" }), listBrands(), listCollections()]);

  const available = stock.filter((s) => s.status === "in_stock");
  const sold = stock.filter((s) => s.status === "sold");
  const margin = product.price ? ((product.price - product.cost_price) / product.price) * 100 : 0;
  const byBranch = Object.entries(
    available.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.branch_name]: (acc[s.branch_name] ?? 0) + 1 }), {}),
  );

  const specs: [string, string | number | null][] = [
    ["Case", product.case_mm ? `${product.case_mm} mm ${product.case_material ?? ""}` : product.case_material],
    ["Bezel", product.bezel],
    ["Dial", product.dial],
    ["Movement", product.movement ? `${titleCase(product.movement)}${product.calibre ? ` · ${product.calibre}` : ""}` : product.calibre],
    ["Power reserve", product.power_reserve_h ? `${product.power_reserve_h} h` : null],
    ["Water resistance", product.water_resistance_m ? `${product.water_resistance_m} m` : null],
    ["Strap", [product.strap && titleCase(product.strap), product.strap_detail].filter(Boolean).join(" · ") || null],
    ["Brand", brands.find((b) => b.id === product.brand_id)?.name ?? null],
    ["Collection", collections.find((c) => c.id === product.collection_id)?.name ?? null],
    ["Warranty", `${product.warranty_months} months`],
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/watches" className="text-muted hover:text-text">← Watches</Link></p>
      <PageHeader
        title={product.name}
        description={`${product.ref_number} · SKU ${product.sku}`}
        actions={
          <>
            <ButtonLink href={`/purchases/new?product=${product.id}`} variant="secondary">Reorder</ButtonLink>
            <ButtonLink href={`/inventory/new?product=${product.id}`} variant="secondary"><Plus className="size-4" />Add a piece</ButtonLink>
            <ButtonLink href={`/watches/${product.id}/edit`}><Pencil className="size-4" />Edit</ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Specifications" />
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {specs.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border px-5 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{val ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {product.description && <p className="p-5 text-sm leading-relaxed text-muted">{product.description}</p>}
          </Card>

          <Card>
            <CardHeader title="Pieces" subtitle="Every physical watch of this model, by serial number" />
            {stock.length === 0 ? (
              <EmptyState title="No pieces yet">Add one with “Add a piece”.</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr><Th>Serial</Th><Th>Branch</Th><Th>Condition</Th><Th>Received</Th><Th>Status</Th></tr>
                </thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-2/50">
                      <Td><Link href={`/inventory/${s.id}`} className="font-mono text-xs font-medium hover:underline">{s.serial_number}</Link></Td>
                      <Td>{s.branch_name}</Td>
                      <Td className="text-muted">{titleCase(s.condition)}</Td>
                      <Td className="text-muted">{date(s.received_at)}</Td>
                      <Td><StatusBadge status={s.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Overview" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Status</span><span className="flex gap-1.5"><StatusBadge status={product.status} />{product.is_published && <Badge tone="info">On website</Badge>}</span></div>
              <div className="flex justify-between"><span className="text-muted">Price</span><span className="font-semibold">{money(product.price)}</span></div>
              {product.compare_at_price && <div className="flex justify-between"><span className="text-muted">Compare-at</span><span className="line-through">{money(product.compare_at_price)}</span></div>}
              <div className="flex justify-between"><span className="text-muted">Cost</span><span>{money(product.cost_price)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Margin</span><span>{margin.toFixed(1)}%</span></div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Stock" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Available</span><span className="font-semibold">{available.length}</span></div>
              <div className="flex justify-between"><span className="text-muted">Sold (all time)</span><span>{sold.length}</span></div>
              {byBranch.map(([name, n]) => (
                <div key={name} className="flex justify-between border-t border-border pt-3"><span className="text-muted">{name}</span><span>{n}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
