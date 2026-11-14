import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/data";
import { HIGH_VALUE, listRiskOrders } from "@/lib/data/risk";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { money, relative, titleCase } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";
import { reviewOrderAction } from "./actions";

export const metadata: Metadata = { title: "Risk review" };

const TABS = [
  { value: "open", label: "To review" },
  { value: "held", label: "On hold" },
  { value: "approved", label: "Approved" },
  { value: "cancelled", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

export default async function RiskReviewPage({ searchParams }: PageProps<"/risk-review">) {
  const tab = param((await searchParams).tab) ?? "open";
  const [rows, me] = await Promise.all([listRiskOrders(), getCurrentUser()]);
  const canReview = Boolean(me && ["owner", "admin", "manager"].includes(me.role));
  const statusOf = (r: (typeof rows)[number]) => r.review?.status ?? "pending";
  const inTab = (t: string) => rows.filter((r) => t === "all" || (t === "open" ? statusOf(r) === "pending" : statusOf(r) === t));
  const list = inTab(tab);

  return (
    <>
      <PageHeader
        title="Risk review"
        description={`Online, phone and WhatsApp orders that need a second look before a watch leaves the boutique: high value (over ${money(HIGH_VALUE)}), unpaid, first-time buyers or heavy discounts.`}
      />
      <Card>
        <nav aria-label="Filter" className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3">
          {TABS.map((t) => (
            <Link key={t.value} href={`/risk-review?tab=${t.value}`} aria-current={tab === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", tab === t.value ? "border-text font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{inTab(t.value).length}</span>
            </Link>
          ))}
        </nav>
        {list.length === 0 ? <EmptyState title="Nothing to review">Orders that trip a risk rule show up here.</EmptyState> : (
          <Table>
            <thead><tr><Th>Order</Th><Th>Customer</Th><Th className="text-right">Total</Th><Th>Risk</Th><Th>Why</Th><Th>Decision</Th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.order.id} className="align-top">
                  <Td>
                    <Link href={`/orders/${r.order.id}`} className="font-medium hover:underline">{r.order.number}</Link>
                    <span className="block text-xs text-muted">{titleCase(r.order.channel)} · {relative(r.order.placed_at)}</span>
                  </Td>
                  <Td>
                    {r.customer ? <Link href={`/customers/${r.customer.id}`} className="hover:underline">{r.customer.full_name}</Link> : <span className="text-muted">Walk-in</span>}
                    <span className="block text-xs text-muted">{r.customer?.phone ?? r.customer?.email ?? ""}</span>
                  </Td>
                  <Td className="text-right font-medium">
                    {money(r.order.total)}
                    {r.order.total > r.order.amount_paid && <span className="block text-xs font-normal text-danger">{money(r.order.total - r.order.amount_paid)} due</span>}
                  </Td>
                  <Td><Badge tone={r.score >= 60 ? "danger" : r.score >= 40 ? "warning" : "neutral"}>{r.score >= 60 ? "High" : r.score >= 40 ? "Medium" : "Low"} · {r.score}</Badge></Td>
                  <Td><ul className="space-y-0.5 text-xs text-muted">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul></Td>
                  <Td className="min-w-64">
                    <div className="mb-1.5"><StatusBadge status={statusOf(r)} />{r.review?.note && <span className="ml-2 text-xs text-muted">“{r.review.note}”</span>}</div>
                    {canReview && (
                      <form className="flex flex-wrap gap-1.5">
                        <input name="note" placeholder="Note (optional)" aria-label={`Note for ${r.order.number}`} className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs" />
                        {(["approved", "held", "cancelled"] as const).filter((s) => s !== statusOf(r)).map((s) => (
                          <Button key={s} formAction={reviewOrderAction.bind(null, r.order.id, s)} variant={s === "approved" ? "primary" : "secondary"} className="h-7 px-2.5 text-xs">
                            {s === "approved" ? "Approve" : s === "held" ? "Hold" : "Reject"}
                          </Button>
                        ))}
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">Cancelling here records the decision only. Cancel or refund the order itself from its order page.</p>
      </Card>
    </>
  );
}
