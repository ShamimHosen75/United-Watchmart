import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Send, X } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { getPurchase } from "@/lib/data/supply";
import { purchaseStatusAction } from "../actions";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { ReceiveForm } from "@/components/supply/receive-form";
import { date, money } from "@/lib/format";

export const metadata: Metadata = { title: "Purchase" };

export default async function PurchasePage({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params;
  const [po, user] = await Promise.all([getPurchase(id), getCurrentUser()]);
  if (!po) notFound();
  const manager = user && ["owner", "admin", "manager"].includes(user.role);
  const editable = manager && (po.status === "draft" || po.status === "ordered") && po.received_qty === 0;
  const receivable = manager && (po.status === "ordered" || po.status === "partially_received");

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/purchases" className="text-muted hover:text-text">← Purchases</Link></p>
      <PageHeader
        title={po.number}
        description={`${po.supplier_name} → ${po.branch_name}`}
        actions={
          <>
            <StatusBadge status={po.status} />
            {editable && <ButtonLink href={`/purchases/${id}/edit`} variant="secondary"><Pencil className="size-4" />Edit</ButtonLink>}
            {manager && po.status === "draft" && (
              <form action={purchaseStatusAction.bind(null, id, "ordered")}><Button><Send className="size-4" />Place order</Button></form>
            )}
            {editable && (
              <form action={purchaseStatusAction.bind(null, id, "cancelled")}><Button variant="ghost"><X className="size-4" />Cancel order</Button></form>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Lines" subtitle="Landed cost includes each watch's share of shipping" />
            <Table>
              <thead><tr><Th>Watch</Th><Th className="text-right">Qty</Th><Th className="text-right">Received</Th><Th className="text-right">Unit cost</Th><Th className="text-right">Landed</Th><Th className="text-right">Line</Th></tr></thead>
              <tbody>
                {po.items.map((i) => (
                  <tr key={i.id}>
                    <Td><Link href={`/watches/${i.product_id}`} className="font-medium hover:underline">{i.product_name}</Link><span className="block text-xs text-muted">{i.ref_number}</span></Td>
                    <Td className="text-right">{i.quantity}</Td>
                    <Td className={`text-right ${i.received_qty >= i.quantity ? "text-success" : ""}`}>{i.received_qty}</Td>
                    <Td className="text-right">{money(i.unit_cost)}</Td>
                    <Td className="text-right text-muted">{money(i.landed_cost)}</Td>
                    <Td className="text-right font-medium">{money(i.quantity * i.unit_cost)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto max-w-xs space-y-1.5 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(po.shipping_cost)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{money(po.total)}</dd></div>
            </dl>
          </Card>
          {receivable && (
            <Card>
              <CardHeader title="Receive delivery" subtitle="Each serial becomes a watch in stock at the receiving branch" />
              <ReceiveForm purchaseId={id} lines={po.items} />
            </Card>
          )}
          {po.received.length > 0 && (
            <Card>
              <CardHeader title="Received watches" />
              <ul className="divide-y divide-border">
                {po.received.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/inventory/${s.id}`} className="hover:underline"><span className="font-mono text-xs font-medium">{s.serial_number}</span> <span className="text-muted">· {s.product_name}</span></Link>
                    <span className="text-muted">{money(s.cost_price)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader title="Details" />
          <dl className="divide-y divide-border text-sm">
            {([["Supplier", <Link key="s" href={`/suppliers/${po.supplier_id}`} className="hover:underline">{po.supplier_name}</Link>], ["Deliver to", po.branch_name], ["Ordered", date(po.ordered_at)], ["Expected", date(po.expected_at)], ["Received", date(po.received_at)], ["Watches", `${po.received_qty} of ${po.ordered_qty} received`]] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {po.notes && <p className="border-t border-border p-5 text-sm text-muted">{po.notes}</p>}
        </Card>
      </div>
    </>
  );
}
