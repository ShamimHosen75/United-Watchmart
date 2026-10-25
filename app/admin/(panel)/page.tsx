import type { Metadata } from "next";
import Link from "next/link";
import { AttentionBadge, StatusBadge, dateTime, ghostButtonClass, inputClass, money } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { orderStatus, type OrderStatus } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin/session";
import { PAGE_SIZE, expireStaleOrders, listOrders } from "@/lib/shop/orders";
import { cancelIntents } from "@/lib/stripe/server";

export const metadata: Metadata = { title: "Orders" };

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

const tabs: (OrderStatus | "all")[] = ["all", "paid", "shipped", "delivered", "pending", "refunded", "canceled", "expired"];

export default async function OrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (orderStatus.enumValues as readonly string[]).includes(sp.status ?? "") ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.slice(0, 80) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await getDb();
  await cancelIntents(await expireStaleOrders(db));
  const { rows, total } = await listOrders(db, { status, q, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, q, page: undefined, ...next };
    Object.entries(merged).forEach(([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)));
    const s = params.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-40">Orders</h1>
        <form className="flex gap-2" action="/admin">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search orders
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Ref, name or email" className={`${inputClass} mt-0 w-64`} />
          <button className={ghostButtonClass}>Search</button>
        </form>
      </div>

      <nav aria-label="Filter by status" className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (tab === "all" && !status) || tab === status;
          return (
            <Link
              key={tab}
              href={href({ status: tab === "all" ? undefined : tab })}
              aria-current={active ? "page" : undefined}
              className="label border border-gold/25 px-3 py-1.5 text-ivory/75 hover:border-gold aria-[current=page]:border-gold aria-[current=page]:bg-gold aria-[current=page]:text-bg"
            >
              {tab}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-start">
          <caption className="sr-only">Orders, newest first</caption>
          <thead>
            <tr className="hairline-b">
              {["Order", "Date", "Customer", "Watches", "Total", "Status"].map((h) => (
                <th key={h} scope="col" className="label py-3 pe-4 text-start font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-muted">
                  No orders{status ? ` with status “${status}”` : ""}{q ? ` matching “${q}”` : ""}.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="hairline-b align-top">
                <td className="py-4 pe-4">
                  <Link href={`/admin/orders/${o.id}`} className="tabular text-gold-light underline-offset-4 hover:underline">
                    {o.ref}
                  </Link>
                </td>
                <td className="py-4 pe-4 text-14 text-ivory/80">{dateTime(o.createdAt)}</td>
                <td className="py-4 pe-4">
                  <div>{o.name ?? "—"}</div>
                  <div className="text-14 text-muted">{o.email ?? ""}</div>
                </td>
                <td className="py-4 pe-4 text-14">
                  {o.items.map((i) => (
                    <div key={i.id}>
                      {i.name} × {i.quantity}
                    </div>
                  ))}
                </td>
                <td className="tabular py-4 pe-4">{money(o.totalCents)}</td>
                <td className="py-4 pe-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={o.status} />
                    {o.stockIssue && <AttentionBadge />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center gap-4">
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className={ghostButtonClass}>
              Previous
            </Link>
          )}
          <span className="label tabular text-muted">
            Page {page} of {pages} · {total} orders
          </span>
          {page < pages && (
            <Link href={href({ page: page + 1 })} className={ghostButtonClass}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
