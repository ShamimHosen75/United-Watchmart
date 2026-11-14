import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ShoppingBag, Star } from "lucide-react";
import { listBranches } from "@/lib/data";
import { getCustomer } from "@/lib/data/clients";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { date, dateTime, money } from "@/lib/format";

export const metadata: Metadata = { title: "Client" };

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const [profile, branches] = await Promise.all([getCustomer(id), listBranches()]);
  if (!profile) notFound();
  const { customer: c, orders, owned, viewings, repairs } = profile;
  const live = orders.filter((o) => ["pending", "paid", "completed"].includes(o.status));
  const spent = live.reduce((t, o) => t + o.total, 0);
  const due = live.filter((o) => o.status === "pending").reduce((t, o) => t + o.total - o.amount_paid, 0);
  const today = new Date().toISOString().slice(0, 10);

  const facts: [string, string | null][] = [
    ["Phone", c.phone], ["Email", c.email], ["Address", [c.address, c.city, c.country].filter(Boolean).join(", ") || null],
    ["Birthday", c.birthday ? date(c.birthday) : null], ["Wrist size", c.wrist_size_mm ? `${c.wrist_size_mm} mm` : null],
    ["Preferred branch", branches.find((b) => b.id === c.preferred_branch_id)?.name ?? null],
    ["Marketing", c.marketing_opt_in ? "Opted in" : "Not opted in"], ["Client since", date(c.created_at)],
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/customers" className="text-muted hover:text-text">← Customers</Link></p>
      <PageHeader
        title={c.full_name}
        description={c.tags.length ? c.tags.join(" · ") : undefined}
        actions={
          <>
            {c.is_vip && <Badge tone="accent"><Star className="mr-1 size-3 fill-current" />VIP</Badge>}
            <ButtonLink href={`/customers/${c.id}/edit`} variant="secondary"><Pencil className="size-4" />Edit</ButtonLink>
            <ButtonLink href={`/orders/new?customer=${c.id}`}><ShoppingBag className="size-4" />New sale</ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted">Total spent</p><p className="mt-2 text-2xl font-semibold">{money(spent)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Watches bought</p><p className="mt-2 text-2xl font-semibold">{owned.filter((w) => w.status === "active").length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Balance due</p><p className={`mt-2 text-2xl font-semibold ${due > 0 ? "text-warning" : ""}`}>{money(due)}</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Collection" subtitle="Watches bought here, with warranty status" />
            {owned.length === 0 ? <EmptyState title="No watches yet" /> : (
              <ul className="divide-y divide-border">
                {owned.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span>
                      <span className="font-medium">{w.product_name}</span> <span className="text-muted">· {w.ref_number}</span>
                      <span className="block font-mono text-xs text-muted">{w.serial_number} · {w.card_number} · until {date(w.ends_on)}</span>
                    </span>
                    <StatusBadge status={w.status === "void" ? "void" : w.ends_on < today ? "expired" : "active"} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Orders" />
            {orders.length === 0 ? <EmptyState title="No orders yet" /> : (
              <ul className="divide-y divide-border">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <Link href={`/orders/${o.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="font-medium">{o.number}</span> <span className="text-muted">· {o.items_label}</span>
                      <span className="block text-xs text-muted">{dateTime(o.placed_at)} · {o.branch_name}</span>
                    </Link>
                    <StatusBadge status={o.status === "pending" ? "balance_due" : o.status} />
                    <span className="w-20 text-right font-medium">{money(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-border">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right">{v ?? "—"}</dd></div>
              ))}
            </dl>
            {c.notes && <p className="border-t border-border p-5 text-sm text-muted">{c.notes}</p>}
          </Card>
          <Card>
            <CardHeader title="Viewings" />
            {viewings.length === 0 ? <p className="p-5 text-sm text-muted">None</p> : (
              <ul className="divide-y divide-border">
                {viewings.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <Link href={`/viewings/${v.id}`} className="hover:underline">{v.product_name ?? "Any watch"}<span className="block text-xs text-muted">{dateTime(v.preferred_at)}</span></Link>
                    <StatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Repairs" action={<Link href={`/repairs/new?customer=${c.id}`} className="text-xs text-accent-strong hover:underline">New repair</Link>} />
            {repairs.length === 0 ? <p className="p-5 text-sm text-muted">None</p> : (
              <ul className="divide-y divide-border">
                {repairs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <Link href={`/repairs/${r.id}`} className="hover:underline">{r.brand_text} {r.model_text}<span className="block text-xs text-muted">{r.number}</span></Link>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
