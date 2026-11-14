import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, CalendarClock, DollarSign, Receipt, Wrench } from "lucide-react";
import { getDashboard, getCurrentUser } from "@/lib/data";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { date, dateTime, money, relative, titleCase } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [d, user] = await Promise.all([getDashboard(), getCurrentUser()]);
  const change = d.salesPrevMonth ? ((d.salesMonth - d.salesPrevMonth) / d.salesPrevMonth) * 100 : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const maxCollection = Math.max(1, ...d.salesByCollection.map((c) => c.total));

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.full_name.split(" ")[0] ?? ""}`}
        description="Here is how the boutiques are doing."
        actions={
          <>
            <ButtonLink href="/inventory/new" variant="secondary">Add stock</ButtonLink>
            <ButtonLink href="/orders/new">New sale</ButtonLink>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Active products", value: d.catalogue.active, href: "/watches?status=active" },
          { label: "Draft products", value: d.catalogue.draft, href: "/watches?status=draft" },
          { label: "Low-stock SKUs", value: d.catalogue.lowStock, href: "/watches?status=active", tone: d.catalogue.lowStock ? "text-warning" : "" },
          { label: "Sold-out SKUs", value: d.catalogue.soldOut, href: "/watches?status=active", tone: d.catalogue.soldOut ? "text-danger" : "" },
          { label: "Orders (all time)", value: d.catalogue.ordersAllTime, href: "/orders" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40">
            <p className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{k.label}</p>
            <p className={`mt-2 text-3xl font-semibold tracking-tight ${k.tone ?? ""}`}>{k.value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={DollarSign} label="Sales today" value={money(d.salesToday)} sub={`${d.ordersToday} order${d.ordersToday === 1 ? "" : "s"}`} />
        <StatCard
          icon={Receipt}
          label="Sales, last 30 days"
          value={money(d.salesMonth)}
          sub={
            <>
              {change !== null && (
                <span className={change >= 0 ? "text-success" : "text-danger"}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
                </span>
              )}{" "}
              {d.ordersMonth} orders · avg {money(d.avgOrder)}
            </>
          }
        />
        <StatCard icon={Boxes} label="Watches in stock" value={String(d.unitsInStock)} sub={`${money(d.stockRetailValue)} retail · ${money(d.stockCostValue)} cost`} href="/inventory" />
        <StatCard icon={CalendarClock} label="Open viewings / repairs" value={`${d.openViewings} / ${d.activeRepairs}`} sub="Requests to handle · jobs in the workshop" href="/repairs" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <Card className="xl:col-span-2">
          <CardHeader title="Sales" subtitle="Paid and completed orders, last 30 days" />
          <div className="p-4"><SalesChart data={d.salesByDay} /></div>
        </Card>
        <Card>
          <CardHeader title="By collection" subtitle="Last 30 days" />
          {d.salesByCollection.length === 0 ? (
            <EmptyState title="No sales yet" />
          ) : (
            <ul className="space-y-4 p-5">
              {d.salesByCollection.map((c) => (
                <li key={c.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-medium">{money(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.total / maxCollection) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent orders" action={<Link href="/orders" className="text-xs font-medium text-accent-strong">All orders</Link>} />
          {d.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <ul className="divide-y divide-border">
              {d.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <Link href={`/orders/${o.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="font-medium">{o.product_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted">{o.number} · {o.customer_name ?? "Walk-in"} · {titleCase(o.channel)}</p>
                  </Link>
                  <span className="hidden text-xs text-muted sm:block">{relative(o.placed_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-20 text-right font-medium">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Low stock" subtitle="Active watches at or below the threshold" action={<Link href="/watches" className="text-xs font-medium text-accent-strong">All watches</Link>} />
          {d.lowStock.length === 0 ? (
            <EmptyState title="Stock looks healthy" />
          ) : (
            <ul className="divide-y divide-border">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link href={`/watches/${p.id}`} className="hover:underline">
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">{p.ref_number}</span>
                  </Link>
                  <Badge tone={p.in_stock === 0 ? "danger" : "warning"}>{p.in_stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Upcoming viewings" subtitle="From the website and phone" action={<Link href="/viewings" className="text-xs font-medium text-accent-strong">All viewings</Link>} />
          {d.upcomingViewings.length === 0 ? (
            <EmptyState title="No viewings booked" />
          ) : (
            <ul className="divide-y divide-border">
              {d.upcomingViewings.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <CalendarClock className="size-4 shrink-0 text-muted" aria-hidden />
                  <Link href={`/viewings/${v.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="font-medium">{v.name} · {v.product_name ?? "Any watch"}</p>
                    <p className="text-xs text-muted">{dateTime(v.preferred_at)} · {v.branch_name ?? "Branch not set"}</p>
                  </Link>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Workshop" subtitle="Repairs ordered by promised date" action={<Link href="/repairs" className="text-xs text-accent-strong hover:underline">Open board</Link>} />
          {d.repairsDue.length === 0 ? (
            <EmptyState title="No open repairs" />
          ) : (
            <ul className="divide-y divide-border">
              {d.repairsDue.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Wrench className="size-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href={`/repairs/${r.id}`} className="font-medium hover:underline">{r.brand_text} {r.model_text}</Link>
                    <p className="truncate text-xs text-muted">{r.number} · {r.customer_name} · due {date(r.promised_at)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
