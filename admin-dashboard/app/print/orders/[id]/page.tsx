import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listBranches } from "@/lib/data";
import { getOrder } from "@/lib/data/sales";
import { getSettings } from "@/lib/data/business";
import { PrintButton } from "@/components/orders/print-button";
import { date, money } from "@/lib/format";
import { paymentLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/print/orders/[id]">) {
  const { id } = await params;
  const [order, branches, settings] = await Promise.all([getOrder(id), listBranches(), getSettings()]);
  if (!order) notFound();
  const branch = branches.find((b) => b.id === order.branch_id);
  const balance = order.total - order.amount_paid;

  return (
    <div className="mx-auto max-w-3xl p-8 text-sm print:p-0">
      <div className="mb-8 flex justify-end gap-2 print:hidden"><PrintButton /></div>

      <header className="flex items-start justify-between border-b border-black/10 pb-6">
        <div>
          <p className="font-serif text-3xl">{settings.store_name}</p>
          {settings.legal_name && <p className="text-xs text-black/50">{settings.legal_name}</p>}
          <p className="mt-1 text-black/60">{branch?.name}{branch?.address && `, ${branch.address}`}{branch?.city && `, ${branch.city}`}</p>
          {branch?.phone && <p className="text-black/60">{branch.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs tracking-[0.12em] text-black/50 uppercase">{order.status === "refunded" ? "Refunded invoice" : order.status === "cancelled" ? "Cancelled" : "Invoice"}</p>
          <p className="text-lg font-semibold">{order.number}</p>
          <p className="text-black/60">{date(order.placed_at)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className="mb-1 text-xs tracking-[0.12em] text-black/50 uppercase">Billed to</p>
          {order.customer ? (
            <>
              <p className="font-medium">{order.customer.full_name}</p>
              {order.customer.phone && <p>{order.customer.phone}</p>}
              {order.customer.email && <p>{order.customer.email}</p>}
              {order.customer.address && <p>{order.customer.address}</p>}
            </>
          ) : <p>Walk-in client</p>}
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs tracking-[0.12em] text-black/50 uppercase">Served by</p>
          <p>{order.staff_name ?? "—"}</p>
        </div>
      </section>

      <table className="w-full">
        <thead>
          <tr className="border-y border-black/10 text-left text-xs text-black/50">
            <th className="py-2 font-medium">Watch</th><th className="py-2 font-medium">Serial</th><th className="py-2 text-right font-medium">Price</th><th className="py-2 text-right font-medium">Discount</th><th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-black/5">
              <td className="py-3"><p className="font-medium">{i.product_name}</p><p className="text-xs text-black/50">Ref. {i.ref_number}</p></td>
              <td className="py-3 font-mono text-xs">{i.serial_number}</td>
              <td className="py-3 text-right">{money(i.unit_price)}</td>
              <td className="py-3 text-right">{i.discount ? `− ${money(i.discount)}` : "—"}</td>
              <td className="py-3 text-right">{money(i.unit_price - i.discount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-64 space-y-1.5">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-black/60">Discounts</dt><dd>− {money(order.discount)}</dd></div>}
          {order.tax > 0 && <div className="flex justify-between"><dt className="text-black/60">Tax</dt><dd>{money(order.tax)}</dd></div>}
          <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          {order.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-black/60"><dt>{paymentLabel(p.method)} {date(p.paid_at)}</dt><dd>{money(p.amount)}</dd></div>
          ))}
          {balance > 0 && order.status === "pending" && <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{money(balance)}</dd></div>}
        </dl>
      </div>

      {order.warranties.filter((w) => w.status === "active").length > 0 && (
        <section className="mt-10 break-inside-avoid">
          <p className="mb-3 text-xs tracking-[0.12em] text-black/50 uppercase">Warranty</p>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {order.warranties.filter((w) => w.status === "active").map((w) => {
              const item = order.items.find((i) => i.stock_item_id === w.stock_item_id);
              return (
                <div key={w.id} className="rounded-lg border border-black/15 p-4">
                  <p className="font-serif text-lg">{item?.product_name}</p>
                  <p className="text-xs text-black/60">Ref. {item?.ref_number} · Serial {item?.serial_number}</p>
                  <p className="mt-3 text-xs">Card <span className="font-semibold">{w.card_number}</span></p>
                  <p className="text-xs">Valid {date(w.starts_on)} to {date(w.ends_on)}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-black/50">The warranty covers manufacturing defects. It does not cover damage from accidents, misuse, water entry after opening the case, or normal wear of straps and crystals.</p>
        </section>
      )}

      <footer className="mt-12 border-t border-black/10 pt-4 text-center text-xs whitespace-pre-line text-black/50">
        {settings.invoice_footer ?? `Thank you for choosing ${settings.store_name}.`}
        {settings.website_url && <span className="block">{settings.website_url}</span>}
      </footer>
    </div>
  );
}
