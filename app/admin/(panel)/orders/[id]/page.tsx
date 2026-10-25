import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AttentionBadge,
  Flash,
  StatusBadge,
  buttonClass,
  dateTime,
  ghostButtonClass,
  inputClass,
  money,
} from "@/components/admin/ui";
import { addOrderNote, cancelOrder, deliverOrder, refundOrder, resendConfirmation, shipOrder } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { getOrder } from "@/lib/shop/orders";

export const metadata: Metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> };

const doneText: Record<string, string> = {
  shipped: "Marked as shipped. The customer has been emailed.",
  delivered: "Marked as delivered.",
  canceled: "Order canceled and stock released.",
  refunded: "Refund issued in Stripe.",
  note: "Note added.",
  resent: "Confirmation email sent again.",
};
const errorText: Record<string, string> = {
  ship: "Enter a carrier and a tracking number.",
  state: "That action is not possible for this order's current status.",
  confirm: "Tick the confirmation box to issue a refund.",
  refund: "Stripe could not issue the refund. Check the Stripe dashboard.",
  stripe: "Stripe is not configured.",
  note: "The note is empty or too long.",
  email: "The email could not be sent. Check the email settings.",
};

export default async function OrderPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { done, error } = await searchParams;
  const found = await getOrder(await getDb(), id);
  if (!found) notFound();
  const { order, items, events } = found;

  const a = order.shippingAddress;
  const stripeBase = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live") ? "" : "/test";
  const canRefund = ["paid", "shipped", "delivered"].includes(order.status);

  return (
    <>
      <Link href="/admin" className="label text-muted hover:text-ivory">
        ← All orders
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="tabular text-40">{order.ref}</h1>
        <StatusBadge status={order.status} />
        {order.stockIssue && <AttentionBadge />}
      </div>
      <p className="mt-2 text-14 text-muted">
        Created {dateTime(order.createdAt)} · {order.locale === "ar" ? "Arabic" : "English"} site
      </p>

      <div className="mt-8">
        {done && doneText[done] && <Flash kind="ok" text={doneText[done]} />}
        {error && errorText[error] && <Flash kind="error" text={errorText[error]} />}
        {order.stockIssue && (
          <Flash
            kind="error"
            text="This order was paid after its stock hold ended, or the amount differs. Check inventory and the Stripe payment before shipping."
          />
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-7">
          <section aria-labelledby="items">
            <h2 id="items" className="label text-gold">
              Watches
            </h2>
            <table className="mt-3 w-full">
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="hairline-b">
                    <td className="py-3">
                      {i.name} <span className="label tabular text-muted">{i.ref}</span>
                    </td>
                    <td className="tabular py-3 text-end text-ivory/80">
                      {i.quantity} × {money(i.unitPriceCents)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 text-muted">Shipping</td>
                  <td className="tabular py-3 text-end">{order.shippingCents ? money(order.shippingCents) : "Complimentary"}</td>
                </tr>
                <tr className="hairline-t">
                  <td className="label py-3 text-muted">Total</td>
                  <td className="tabular py-3 text-end text-28 text-gold-light">{money(order.totalCents)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section aria-labelledby="customer" className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 id="customer" className="label text-gold">
                Customer
              </h2>
              <p className="mt-3">{order.name ?? "—"}</p>
              {order.email && (
                <a href={`mailto:${order.email}`} className="text-gold-light underline-offset-4 hover:underline">
                  {order.email}
                </a>
              )}
              <p className="text-ivory/80">{order.phone ?? ""}</p>
            </div>
            <div>
              <h2 className="label text-gold">Ship to</h2>
              {a ? (
                <address className="mt-3 not-italic text-ivory/85">
                  {a.line1}
                  {a.line2 && <br />}
                  {a.line2}
                  <br />
                  {[a.postalCode, a.city].filter(Boolean).join(" ")}
                  {a.state && <br />}
                  {a.state}
                  <br />
                  {a.country}
                </address>
              ) : (
                <p className="mt-3 text-muted">Not provided yet.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="payment">
            <h2 id="payment" className="label text-gold">
              Payment
            </h2>
            <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-y-2 text-14">
              <dt className="text-muted">Payment intent</dt>
              <dd>
                {order.paymentIntentId ? (
                  <a
                    href={`https://dashboard.stripe.com${stripeBase}/payments/${order.paymentIntentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tabular text-gold-light underline-offset-4 hover:underline"
                  >
                    {order.paymentIntentId}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-muted">Paid</dt>
              <dd>{dateTime(order.paidAt)}</dd>
              <dt className="text-muted">Shipped</dt>
              <dd>
                {dateTime(order.shippedAt)}
                {order.trackingNumber ? ` · ${order.carrier} ${order.trackingNumber}` : ""}
              </dd>
              <dt className="text-muted">Delivered</dt>
              <dd>{dateTime(order.deliveredAt)}</dd>
              {order.status === "pending" && (
                <>
                  <dt className="text-muted">Hold ends</dt>
                  <dd>{dateTime(order.expiresAt)}</dd>
                </>
              )}
            </dl>
          </section>

          <section aria-labelledby="timeline">
            <h2 id="timeline" className="label text-gold">
              Timeline
            </h2>
            <ol className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[9.5rem_1fr] gap-4 text-14">
                  <span className="tabular text-muted">{dateTime(e.createdAt)}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside aria-label="Actions" className="space-y-8 lg:col-span-4 lg:col-start-9">
          {order.status === "paid" && (
            <form action={shipOrder} className="bg-surface p-6">
              <h2 className="label text-gold">Mark as shipped</h2>
              <input type="hidden" name="id" value={order.id} />
              <label className="mt-4 block text-14 text-muted">
                Carrier
                <input name="carrier" required minLength={2} placeholder="e.g. Brink's, DHL Express" className={inputClass} />
              </label>
              <label className="mt-3 block text-14 text-muted">
                Tracking number
                <input name="tracking" required minLength={3} className={inputClass} />
              </label>
              <button className={`${buttonClass} mt-5 w-full`}>Mark shipped and email customer</button>
            </form>
          )}

          {order.status === "shipped" && (
            <form action={deliverOrder} className="bg-surface p-6">
              <h2 className="label text-gold">Delivery</h2>
              <input type="hidden" name="id" value={order.id} />
              <button className={`${buttonClass} mt-4 w-full`}>Mark as delivered</button>
            </form>
          )}

          {order.status === "pending" && (
            <form action={cancelOrder} className="bg-surface p-6">
              <h2 className="label text-gold">Cancel checkout</h2>
              <p className="mt-2 text-14 text-muted">Releases the held stock. The customer has not paid.</p>
              <input type="hidden" name="id" value={order.id} />
              <button className={`${ghostButtonClass} mt-4 w-full`}>Cancel and release stock</button>
            </form>
          )}

          {canRefund && (
            <form action={refundOrder} className="border border-[#f2a7a0]/40 p-6">
              <h2 className="label text-[#f2a7a0]">Refund</h2>
              <p className="mt-2 text-14 text-muted">Refunds the full {money(order.totalCents)} through Stripe.</p>
              <input type="hidden" name="id" value={order.id} />
              <label className="mt-4 flex items-center gap-3 text-14">
                <input type="checkbox" name="restock" value="yes" defaultChecked={order.status === "paid"} className="size-4 accent-[#c9a35c]" />
                Return the watches to stock
              </label>
              <label className="mt-2 flex items-center gap-3 text-14">
                <input type="checkbox" name="confirm" value="yes" required className="size-4 accent-[#c9a35c]" />
                I understand this cannot be undone
              </label>
              <button className={`${ghostButtonClass} mt-5 w-full border-[#f2a7a0]/60`}>Issue full refund</button>
            </form>
          )}

          {order.status !== "pending" && order.email && (
            <form action={resendConfirmation}>
              <input type="hidden" name="id" value={order.id} />
              <button className={`${ghostButtonClass} w-full`}>Resend order confirmation</button>
            </form>
          )}

          <form action={addOrderNote} className="bg-surface p-6">
            <h2 className="label text-gold">Add a note</h2>
            <input type="hidden" name="id" value={order.id} />
            <label htmlFor="note" className="sr-only">
              Note
            </label>
            <textarea id="note" name="note" required maxLength={1000} rows={3} className={`${inputClass} py-2`} />
            <button className={`${ghostButtonClass} mt-4 w-full`}>Save note</button>
          </form>
        </aside>
      </div>
    </>
  );
}
