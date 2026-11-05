import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStockItem, listBranches } from "@/lib/data";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { UpdateStockForm } from "@/components/inventory/update-stock-form";
import { date, dateTime, money, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Stock item" };

export default async function StockItemPage({ params }: PageProps<"/inventory/[id]">) {
  const { id } = await params;
  const [data, branches] = await Promise.all([getStockItem(id), listBranches()]);
  if (!data) notFound();
  const { item, movements } = data;
  const branchName = (bid: string | null) => branches.find((b) => b.id === bid)?.name ?? "—";

  const facts: [string, React.ReactNode][] = [
    ["Watch", <Link key="w" href={`/watches/${item.product_id}`} className="font-medium hover:underline">{item.product_name}</Link>],
    ["Reference", item.ref_number],
    ["Branch", item.branch_name],
    ["Location", item.location_note ?? "—"],
    ["Condition", titleCase(item.condition)],
    ["Box / papers", `${item.has_box ? "Yes" : "No"} / ${item.has_papers ? "Yes" : "No"}`],
    ["Cost price", money(item.cost_price)],
    ["Selling price", money(item.price)],
    ["Received", date(item.received_at)],
    ["Sold", date(item.sold_at)],
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/inventory" className="text-muted hover:text-text">← Inventory</Link></p>
      <PageHeader title={item.serial_number} description={`${item.product_name} · ${item.ref_number}`} actions={
          <>
            <StatusBadge status={item.status} />
            {item.status === "in_stock" && <ButtonLink href={`/transfers/new?stock=${item.id}`} variant="secondary">Transfer</ButtonLink>}
            {(item.status === "in_stock" || item.status === "reserved") && <ButtonLink href={`/orders/new?stock=${item.id}`}>Sell</ButtonLink>}
          </>
        } />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border px-5 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {item.notes && <p className="p-5 text-sm text-muted">{item.notes}</p>}
          </Card>

          <Card>
            <CardHeader title="History" subtitle="Every move and status change is logged automatically" />
            <ol className="space-y-4 p-5">
              {movements.map((m) => (
                <li key={m.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  <div>
                    <p className="font-medium">{titleCase(m.reason)}</p>
                    <p className="text-xs text-muted">
                      {dateTime(m.created_at)}
                      {m.from_status && m.to_status && m.from_status !== m.to_status && ` · ${titleCase(m.from_status)} → ${titleCase(m.to_status)}`}
                      {m.from_branch_id && m.to_branch_id && m.from_branch_id !== m.to_branch_id && ` · ${branchName(m.from_branch_id)} → ${branchName(m.to_branch_id)}`}
                      {!m.from_branch_id && m.to_branch_id && ` · into ${branchName(m.to_branch_id)}`}
                      {m.note && ` · ${m.note}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Update" subtitle="Reserve, send to repair or move to another branch" />
          <UpdateStockForm item={item} branches={branches} />
        </Card>
      </div>
    </>
  );
}
