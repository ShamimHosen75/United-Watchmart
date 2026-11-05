import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, LayoutGrid, List, Plus, ShieldCheck } from "lucide-react";
import { listStaff } from "@/lib/data";
import { listRepairs, OPEN_STATUSES, type RepairRow } from "@/lib/data/service";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { date, money, titleCase } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";
import type { RepairStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Repairs" };

const columnLabels: Record<string, string> = {
  received: "Received", diagnosing: "Diagnosing", awaiting_approval: "Awaiting approval", in_progress: "In progress", ready: "Ready to collect",
};

export default async function RepairsPage({ searchParams }: PageProps<"/repairs">) {
  const sp = await searchParams;
  const view = param(sp.view) === "list" ? "list" : "board";
  const q = param(sp.q);
  const technician = param(sp.technician);
  const status = (param(sp.status) ?? "") as RepairStatus | "";
  const [all, staff] = await Promise.all([listRepairs({ q, technician }), listStaff()]);
  const open = all.filter((r) => OPEN_STATUSES.includes(r.status));
  const overdue = open.filter((r) => r.overdue).length;
  const listRows = all.filter((r) => !status || r.status === status);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q, technician, status, view, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/repairs${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Repairs"
        description="Servicing and repair jobs, from intake to hand-back."
        actions={<ButtonLink href="/repairs/new"><Plus className="size-4" />New repair</ButtonLink>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {([
          ["Open jobs", open.length, ""],
          ["Overdue", overdue, overdue ? "text-danger" : ""],
          ["Awaiting client approval", open.filter((r) => r.status === "awaiting_approval").length, ""],
          ["Ready to collect", open.filter((r) => r.status === "ready").length, ""],
        ] as const).map(([label, value, tone]) => (
          <Card key={label} className="px-4 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className={cn("mt-1 text-2xl font-semibold", tone)}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <FilterBar q={q} placeholder="Search job, client, phone, watch or serial" resetHref={`/repairs${view === "list" ? "?view=list" : ""}`}>
          <FilterSelect name="technician" label="Technician" value={technician} options={staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }))} />
          {view === "list" && <FilterSelect name="status" label="Status" value={status} options={[...OPEN_STATUSES, "collected", "cancelled"].map((s) => ({ value: s, label: titleCase(s) }))} />}
          <input type="hidden" name="view" value={view} />
          <div className="ml-auto flex rounded-lg border border-border p-0.5" role="group" aria-label="View">
            <Link href={qs({ view: "board", status: undefined })} aria-current={view === "board" ? "page" : undefined} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs", view === "board" ? "bg-surface-2 font-medium" : "text-muted")}><LayoutGrid className="size-3.5" />Board</Link>
            <Link href={qs({ view: "list" })} aria-current={view === "list" ? "page" : undefined} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs", view === "list" ? "bg-surface-2 font-medium" : "text-muted")}><List className="size-3.5" />List</Link>
          </div>
        </FilterBar>
      </Card>

      {view === "board" ? (
        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
          {OPEN_STATUSES.map((s) => {
            const jobs = open.filter((r) => r.status === s);
            return (
              <section key={s} aria-label={columnLabels[s]} className="min-w-56 rounded-xl bg-surface-2/60 p-2 lg:min-w-0">
                <h2 className="flex items-center justify-between px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  {columnLabels[s]} <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium">{jobs.length}</span>
                </h2>
                <ul className="space-y-2">
                  {jobs.map((r) => <JobCard key={r.id} r={r} />)}
                  {jobs.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted">Nothing here</li>}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <Card>
          {listRows.length === 0 ? <EmptyState title="No repairs match" /> : (
            <Table>
              <thead><tr><Th>Job</Th><Th>Watch</Th><Th>Client</Th><Th>Technician</Th><Th>Received</Th><Th>Promised</Th><Th className="text-right">Estimate</Th><Th>Status</Th></tr></thead>
              <tbody>
                {listRows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/repairs/${r.id}`} className="font-medium hover:underline">{r.number}</Link><span className="block text-xs text-muted">{r.branch_name}</span></Td>
                    <Td>{r.brand_text} {r.model_text}{r.serial_number && <span className="block font-mono text-xs text-muted">{r.serial_number}</span>}</Td>
                    <Td>{r.customer_name}<span className="block text-xs text-muted">{r.customer_phone}</span></Td>
                    <Td className="text-muted">{r.technician_name ?? "Unassigned"}</Td>
                    <Td className="text-muted">{date(r.received_at)}</Td>
                    <Td className={r.overdue ? "font-medium text-danger" : "text-muted"}>{date(r.promised_at)}{r.overdue && " · late"}</Td>
                    <Td className="text-right">{r.under_warranty ? <span className="text-xs text-muted">Warranty</span> : money(r.final_cost ?? r.estimate)}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}

function JobCard({ r }: { r: RepairRow }) {
  return (
    <li>
      <Link href={`/repairs/${r.id}`} className={cn("block rounded-lg border bg-surface p-3 text-sm shadow-sm transition-colors hover:border-accent", r.overdue ? "border-danger/40" : "border-border")}>
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="font-medium">{r.number}</span>
          {r.under_warranty && <span className="inline-flex items-center gap-1 text-success"><ShieldCheck className="size-3.5" />Warranty</span>}
        </div>
        <p className="mt-1 font-medium">{r.brand_text} {r.model_text}</p>
        <p className="line-clamp-2 text-xs text-muted">{r.issue}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="truncate">{r.customer_name}</span>
          <span className={cn("shrink-0", r.overdue ? "inline-flex items-center gap-1 font-medium text-danger" : "text-muted")}>
            {r.overdue && <AlertTriangle className="size-3.5" aria-label="Overdue" />}{r.promised_at ? `Due ${date(r.promised_at)}` : "No date"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{r.technician_name ?? "Unassigned"}</p>
      </Link>
    </li>
  );
}
