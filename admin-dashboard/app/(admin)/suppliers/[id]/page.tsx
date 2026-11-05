import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Pencil } from "lucide-react";
import { getSupplier, listPurchases } from "@/lib/data/supply";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { date, money } from "@/lib/format";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();
  const purchases = await listPurchases({ supplier: id });
  const live = purchases.filter((p) => p.status !== "draft" && p.status !== "cancelled");
  const open = live.filter((p) => p.status === "ordered" || p.status === "partially_received");

  const facts: [string, string | null][] = [
    ["Contact", supplier.contact_name], ["Email", supplier.email], ["Phone", supplier.phone], ["Address", supplier.address],
    ["Country", supplier.country], ["Payment terms", supplier.payment_terms],
  ];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/suppliers" className="text-muted hover:text-text">← Suppliers</Link></p>
      <PageHeader
        title={supplier.name}
        description={supplier.is_active ? undefined : "Inactive"}
        actions={
          <>
            <ButtonLink href={`/suppliers/${id}/edit`} variant="secondary"><Pencil className="size-4" />Edit</ButtonLink>
            <ButtonLink href={`/purchases/new?supplier=${id}`}><ClipboardList className="size-4" />New purchase</ButtonLink>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted">Bought to date</p><p className="mt-2 text-2xl font-semibold">{money(live.reduce((t, p) => t + p.total, 0))}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Open orders</p><p className="mt-2 text-2xl font-semibold">{open.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">On order</p><p className="mt-2 text-2xl font-semibold">{money(open.reduce((t, p) => t + p.total, 0))}</p></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title="Purchase orders" />
          {purchases.length === 0 ? <EmptyState title="No purchases yet" /> : (
            <ul className="divide-y divide-border">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <Link href={`/purchases/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="font-medium">{p.number}</span> <span className="text-muted">· {p.ordered_qty} watch{p.ordered_qty === 1 ? "" : "es"} · {p.branch_name}</span>
                    <span className="block text-xs text-muted">Ordered {date(p.ordered_at)}{p.expected_at && ` · expected ${date(p.expected_at)}`}</span>
                  </Link>
                  <StatusBadge status={p.status} />
                  <span className="w-24 text-right font-medium">{money(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Details" />
          <dl className="divide-y divide-border">
            {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-5 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right">{v ?? "—"}</dd></div>)}
          </dl>
          {supplier.notes && <p className="border-t border-border p-5 text-sm text-muted">{supplier.notes}</p>}
        </Card>
      </div>
    </>
  );
}
