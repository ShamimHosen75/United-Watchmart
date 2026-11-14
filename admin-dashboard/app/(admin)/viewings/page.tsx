import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listViewings } from "@/lib/data/clients";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { dateTime, relative, titleCase } from "@/lib/format";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";
import type { ViewingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Viewings" };

const tabs = [
  { value: "open", label: "Upcoming" },
  { value: "new", label: "To confirm" },
  { value: "completed", label: "Completed" },
  { value: "", label: "All" },
] as const;

export default async function ViewingsPage({ searchParams }: PageProps<"/viewings">) {
  const sp = await searchParams;
  const status = (param(sp.status) ?? "open") as ViewingStatus | "" | "open";
  const q = param(sp.q);
  const all = await listViewings({ q });
  const match = (s: string, v: { status: string }) => (s === "" ? true : s === "open" ? v.status === "new" || v.status === "confirmed" : v.status === s);
  const rows = all.filter((v) => match(status, v));
  const href = (s: string) => `/viewings?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Viewings" description="Appointments to see a watch in person, from the website, phone and WhatsApp." actions={<ButtonLink href="/viewings/new"><Plus className="size-4" />Book viewing</ButtonLink>} />
      <Card>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" aria-label="Viewing status">
          {tabs.map((t) => (
            <Link key={t.value} href={href(t.value)} aria-current={status === t.value ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", status === t.value ? "border-accent font-medium" : "border-transparent text-muted hover:text-text")}>
              {t.label} <span className="text-xs text-muted">{all.filter((v) => match(t.value, v)).length}</span>
            </Link>
          ))}
        </nav>
        <FilterBar q={q} placeholder="Search client or watch" resetHref="/viewings"><input type="hidden" name="status" value={status} /></FilterBar>
        {rows.length === 0 ? <EmptyState title="No viewings here" /> : (
          <Table>
            <thead><tr><Th>When</Th><Th>Client</Th><Th>Watch</Th><Th>Branch</Th><Th>Host</Th><Th>Source</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-surface-2/50">
                  <Td className="whitespace-nowrap">
                    <Link href={`/viewings/${v.id}`} className="font-medium hover:underline">{dateTime(v.preferred_at)}</Link>
                    {v.preferred_at && <span className="block text-xs text-muted">{relative(v.preferred_at)}</span>}
                  </Td>
                  <Td>{v.name}<span className="block text-xs text-muted">{v.phone ?? v.email}</span></Td>
                  <Td>{v.product_name ?? <span className="text-muted">Any</span>}{v.reserved_serial && <Badge tone="accent" className="ml-1.5">Held</Badge>}</Td>
                  <Td className="text-muted">{v.branch_name ?? "—"}</Td>
                  <Td className="text-muted">{v.assigned_name ?? "—"}</Td>
                  <Td className="text-muted">{titleCase(v.source)}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
