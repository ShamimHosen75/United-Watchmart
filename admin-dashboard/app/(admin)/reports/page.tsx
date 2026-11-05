import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { dailySeries, groupBy, repairsReport, salesLines, stockReport, type Group } from "@/lib/data/reports";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { date, money, titleCase } from "@/lib/format";
import { param } from "@/lib/params";
import { PRESETS, resolveRange } from "@/lib/report-range";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Reports" };

const TABS = [
  { key: "sales", label: "Sales and margin" },
  { key: "stock", label: "Stock value and age" },
  { key: "repairs", label: "Workshop" },
] as const;

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await getCurrentUser();
  if (!user || !["owner", "admin", "manager"].includes(user.role)) {
    return (
      <>
        <PageHeader title="Reports" />
        <Card><EmptyState title="Reports are for managers">Ask an owner or admin if you need access.</EmptyState></Card>
      </>
    );
  }
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp.tab))?.key ?? "sales";
  const range = resolveRange({ from: param(sp.from), to: param(sp.to), preset: param(sp.preset) });
  const qs = (patch: Record<string, string>) => {
    const base: Record<string, string> = { tab, ...(range.preset ? { preset: range.preset } : { from: range.from, to: range.to }) };
    const merged = { ...base, ...patch };
    if (patch.preset) { delete merged.from; delete merged.to; }
    return `/reports?${new URLSearchParams(merged)}`;
  };
  const exportHref = `/api/reports?${new URLSearchParams({ type: tab, from: range.from, to: range.to })}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Figures follow the branch picked in the top bar. Sales count paid and completed orders, net of discounts and before tax."
        actions={<ButtonLink href={exportHref} variant="secondary" prefetch={false}><Download className="size-4" />Export CSV</ButtonLink>}
      />
      <Card className="mb-6">
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Report">
          {TABS.map((t) => (
            <Link key={t.key} href={qs({ tab: t.key })} aria-current={tab === t.key ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", tab === t.key ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label}
            </Link>
          ))}
        </nav>
        {tab !== "stock" && (
          <form className="flex flex-wrap items-center gap-2 p-4">
            <input type="hidden" name="tab" value={tab} />
            <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Period">
              {PRESETS.map((p) => (
                <Link key={p.key} href={qs({ preset: p.key })} aria-current={range.preset === p.key ? "true" : undefined}
                  className={cn("rounded-md px-2.5 py-1 text-xs", range.preset === p.key ? "bg-surface-2 font-medium" : "text-muted hover:text-text")}>{p.label}</Link>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted">From
              <input type="date" name="from" defaultValue={range.from} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text" />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">To
              <input type="date" name="to" defaultValue={range.to} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text" />
            </label>
            <Button type="submit" variant="secondary">Apply</Button>
          </form>
        )}
      </Card>
      {tab === "sales" && <SalesReport range={range} />}
      {tab === "stock" && <StockReport />}
      {tab === "repairs" && <RepairsReport range={range} />}
    </>
  );
}

function Tiles({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value, sub]) => (
        <Card key={label} className="px-4 py-3">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        </Card>
      ))}
    </div>
  );
}

function GroupTable({ title, groups, label }: { title: string; groups: Group[]; label: string }) {
  const max = Math.max(1, ...groups.map((g) => g.revenue));
  return (
    <Card>
      <CardHeader title={title} />
      {groups.length === 0 ? <EmptyState title="No sales in this period" /> : (
        <Table>
          <thead><tr><Th>{label}</Th><Th className="text-right">Units</Th><Th className="text-right">Sales</Th><Th className="text-right">Margin</Th><Th className="text-right">Margin %</Th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <Td>
                  {titleCase(g.key)}
                  <span className="mt-1 block h-1 rounded-full bg-accent/70" style={{ width: `${(g.revenue / max) * 100}%` }} aria-hidden />
                </Td>
                <Td className="text-right">{g.units}</Td>
                <Td className="text-right font-medium">{money(g.revenue)}</Td>
                <Td className="text-right">{money(g.margin)}</Td>
                <Td className="text-right text-muted">{pct(g.margin, g.revenue)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function SalesReport({ range }: { range: { from: string; to: string } }) {
  const { lines, refunds, tax } = await salesLines(range);
  const revenue = lines.reduce((t, l) => t + l.revenue, 0);
  const margin = lines.reduce((t, l) => t + l.margin, 0);
  const orders = new Set(lines.map((l) => l.order_id)).size;
  const byWatch = groupBy(lines, (l) => `${l.brand} ${l.product}`).sort((a, b) => b.margin - a.margin).slice(0, 10);
  return (
    <>
      <Tiles items={[
        ["Sales", money(revenue), `${date(range.from)} to ${date(range.to)}`],
        ["Gross margin", money(margin), `${pct(margin, revenue)} of sales`],
        ["Orders", String(orders), `${lines.length} watches · average ${money(orders ? revenue / orders : 0)}`],
        ["Refunds", money(refunds.amount), `${refunds.count} order${refunds.count === 1 ? "" : "s"} · tax collected ${money(tax)}`],
      ]} />
      <Card className="mb-6">
        <CardHeader title="Sales per day" />
        <div className="p-4"><SalesChart data={dailySeries(lines, range)} label={`Sales per day from ${date(range.from)} to ${date(range.to)}`} /></div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <GroupTable title="By branch" label="Branch" groups={groupBy(lines, (l) => l.branch)} />
        <GroupTable title="By salesperson" label="Staff" groups={groupBy(lines, (l) => l.staff)} />
        <GroupTable title="By brand" label="Brand" groups={groupBy(lines, (l) => l.brand)} />
        <GroupTable title="By collection" label="Collection" groups={groupBy(lines, (l) => l.collection)} />
        <GroupTable title="By channel" label="Channel" groups={groupBy(lines, (l) => l.channel)} />
        <GroupTable title="Most profitable watches" label="Watch" groups={byWatch} />
      </div>
    </>
  );
}

async function StockReport() {
  const s = await stockReport();
  const maxBucket = Math.max(1, ...s.buckets.map((b) => b.pieces));
  return (
    <>
      <Tiles items={[
        ["Watches held", String(s.totals.pieces), "In stock, reserved, in repair or in transit"],
        ["Value at cost", money(s.totals.cost)],
        ["Value at retail", money(s.totals.retail)],
        ["Potential margin", money(s.totals.retail - s.totals.cost), `${pct(s.totals.retail - s.totals.cost, s.totals.retail)} of retail`],
      ]} />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="By branch" />
          <Table>
            <thead><tr><Th>Branch</Th><Th className="text-right">Pieces</Th><Th className="text-right">Cost</Th><Th className="text-right">Retail</Th></tr></thead>
            <tbody>{s.byBranch.map((b) => (
              <tr key={b.branch}><Td>{b.branch}</Td><Td className="text-right">{b.pieces}</Td><Td className="text-right font-medium">{money(b.cost)}</Td><Td className="text-right">{money(b.retail)}</Td></tr>
            ))}</tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Stock age" subtitle="Days since each watch arrived" />
          <ul className="space-y-3 p-5 text-sm">
            {s.buckets.map((b) => (
              <li key={b.label}>
                <div className="flex justify-between"><span>{b.label}</span><span className="text-muted">{b.pieces} · {money(b.cost)} at cost</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-accent" style={{ width: `${(b.pieces / maxBucket) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Slowest movers" subtitle="The ten watches held longest. Consider a transfer, a promotion or a price review." />
        <Table>
          <thead><tr><Th>Watch</Th><Th>Serial</Th><Th>Branch</Th><Th className="text-right">Days held</Th><Th className="text-right">Cost</Th><Th className="text-right">Price</Th></tr></thead>
          <tbody>{s.oldest.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/inventory/${p.id}`} className="font-medium hover:underline">{p.product_name}</Link><span className="block text-xs text-muted">{p.ref_number}</span></Td>
              <Td className="font-mono text-xs">{p.serial_number}</Td>
              <Td className="text-muted">{p.branch_name}</Td>
              <Td className={cn("text-right", p.age > 180 && "font-medium text-danger")}>{p.age}</Td>
              <Td className="text-right">{money(p.cost)}</Td>
              <Td className="text-right">{money(p.price)}</Td>
            </tr>
          ))}</tbody>
        </Table>
      </Card>
    </>
  );
}

async function RepairsReport({ range }: { range: { from: string; to: string } }) {
  const r = await repairsReport(range);
  return (
    <>
      <Tiles items={[
        ["Jobs received", String(r.received), `${r.warranty} under warranty`],
        ["Jobs collected", String(r.collected), `${r.overdue} open job${r.overdue === 1 ? "" : "s"} overdue now`],
        ["Workshop takings", money(r.revenue), "Paid at collection"],
        ["Average turnaround", r.avgDays === null ? "—" : `${r.avgDays.toFixed(1)} days`, "Received to collected"],
      ]} />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="By technician" />
          {r.byTechnician.length === 0 ? <EmptyState title="No jobs collected in this period" /> : (
            <Table>
              <thead><tr><Th>Technician</Th><Th className="text-right">Collected</Th><Th className="text-right">Takings</Th><Th className="text-right">Avg days</Th></tr></thead>
              <tbody>{r.byTechnician.map((t) => (
                <tr key={t.technician}><Td>{t.technician}</Td><Td className="text-right">{t.collected}</Td><Td className="text-right font-medium">{money(t.revenue)}</Td><Td className="text-right">{t.avgDays.toFixed(1)}</Td></tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Collected jobs" />
          {r.jobs.length === 0 ? <EmptyState title="None in this period" /> : (
            <ul className="divide-y divide-border">
              {r.jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <Link href={`/repairs/${j.id}`} className="hover:underline">{j.brand_text} {j.model_text}<span className="block text-xs text-muted">{j.number} · {j.customer_name}</span></Link>
                  <span className="text-right">{j.under_warranty ? <span className="text-xs text-muted">Warranty</span> : money(j.paid_amount)}<span className="block text-xs text-muted">{date(j.collected_at)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
