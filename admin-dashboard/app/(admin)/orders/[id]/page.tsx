import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { getOrder } from "@/lib/data/sales";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { AddPaymentForm, RefundForm } from "@/components/orders/order-forms";
import { date, dateTime, money, titleCase } from "@/lib/format";
import { paymentLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const order = await getOrder(id);
  if (!order) notFound();
  const balance = Math.round((order.total - order.amount_paid) * 100) / 100;
  const open = order.status === "pending" || order.status === "paid";
  const canRefund = user && ["owner", "admin", "manager"].includes(user.role) && order.status !== "refunded" && order.status !== "cancelled";

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/orders" className="text-muted hover:text-text">← Orders</Link></p>
      {sp.new && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-5 py-4 text-sm text-success">
          <CheckCircle2 className="size-5" aria-hidden />
          <span className="flex-1">Sale recorded. {order.warranties.length} warranty card{order.warranties.length === 1 ? "" : "s"} issued.</span>
          <Link href={`/print/orders/${order.id}`} target="_blank" className="font-medium underline">Print invoice</Link>
        </div>
      )}
      <PageHeader
        title={order.number}
        description={`${dateTime(order.placed_at)} · ${order.branch_name} · ${titleCase(order.channel)}${order.staff_name ? ` · by ${order.staff_name}` : ""}`}
        actions={
          <>
            <StatusBadge status={order.status === "pending" ? "balance_due" : order.status} />
            <ButtonLink href={`/print/orders/${order.id}`} target="_blank" variant="secondary"><Printer className="size-4" />Invoice</ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Watches" />
            <Table>
              <thead><tr><Th>Watch</Th><Th>Serial</Th><Th className="text-right">Price</Th><Th className="text-right">Discount</Th><Th className="text-right">Line total</Th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <Td><Link href={`/watches/${i.product_id}`} className="font-medium hover:underline">{i.product_name}</Link><span className="block text-xs text-muted">{i.ref_number}</span></Td>
                    <Td>{i.stock_item_id ? <Link href={`/inventory/${i.stock_item_id}`} className="font-mono text-xs hover:underline">{i.serial_number}</Link> : "—"}</Td>
                    <Td className="text-right">{money(i.unit_price)}</Td>
                    <Td className="text-right text-muted">{i.discount ? `− ${money(i.discount)}` : "—"}</Td>
                    <Td className="text-right font-medium">{money(i.unit_price - i.discount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto max-w-xs space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discounts</dt><dd>− {money(order.discount)}</dd></div>}
              {order.tax > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{money(order.tax)}</dd></div>}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd>{money(order.amount_paid)}</dd></div>
              {balance > 0 && open && <div className="flex justify-between font-semibold text-warning"><dt>Balance due</dt><dd>{money(balance)}</dd></div>}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            {order.payments.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No payments yet.</p> : (
              <ul className="divide-y divide-border">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                    <span>{paymentLabel(p.method)}{p.reference && <span className="text-muted"> · {p.reference}</span>}<span className="block text-xs text-muted">{dateTime(p.paid_at)}</span></span>
                    <span className="font-medium">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Warranty cards" />
            <ul className="divide-y divide-border">
              {order.warranties.map((w) => (
                <li key={w.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span><span className="font-medium">{w.card_number}</span><span className="block text-xs text-muted">{date(w.starts_on)} to {date(w.ends_on)}</span></span>
                  <StatusBadge status={w.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Client" />
            {order.customer ? (
              <div className="space-y-1 p-5 text-sm">
                <Link href={`/customers/${order.customer.id}`} className="font-medium hover:underline">{order.customer.full_name}</Link>
                {order.customer.phone && <p className="text-muted">{order.customer.phone}</p>}
                {order.customer.email && <p className="text-muted">{order.customer.email}</p>}
              </div>
            ) : <p className="p-5 text-sm text-muted">Walk-in sale</p>}
            {order.notes && <p className="border-t border-border p-5 text-sm text-muted">{order.notes}</p>}
          </Card>
          {open && balance > 0 && (
            <Card>
              <CardHeader title="Take a payment" subtitle={`${money(balance)} still due`} />
              <AddPaymentForm orderId={order.id} balance={balance} />
            </Card>
          )}
          {order.refunded_at && (
            <Card className="p-5 text-sm">
              <p className="font-medium">{order.status === "refunded" ? "Refunded" : "Cancelled"} {dateTime(order.refunded_at)}</p>
              {order.refund_reason && <p className="mt-1 text-muted">{order.refund_reason}</p>}
            </Card>
          )}
          {canRefund && (
            <Card>
              <CardHeader title={order.amount_paid > 0 ? "Refund" : "Cancel"} />
              <RefundForm orderId={order.id} hasPayments={order.amount_paid > 0} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
