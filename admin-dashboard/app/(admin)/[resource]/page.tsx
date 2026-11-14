import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getResource } from "@/lib/resources";
import { catalogueCounts, listRecords, optionsFor } from "@/lib/data/resources";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Value, type Lookups } from "@/components/resources/value";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";

export async function generateMetadata({ params }: PageProps<"/[resource]">): Promise<Metadata> {
  return { title: getResource((await params).resource)?.title ?? "Not found" };
}

export default async function ResourceListPage({ params, searchParams }: PageProps<"/[resource]">) {
  const def = getResource((await params).resource);
  if (!def) notFound();
  const sp = await searchParams;
  const q = param(sp.q);
  const status = param(sp.status);
  const statusField = def.fields.find((f) => f.name === def.statusField);

  const [rows, all, options, counts] = await Promise.all([
    listRecords(def, q, status),
    statusField ? listRecords(def) : Promise.resolve([]),
    optionsFor(def),
    def.key === "brands" || def.key === "categories" ? catalogueCounts() : Promise.resolve(null),
  ]);
  const lookups: Lookups = Object.fromEntries(Object.entries(options).map(([k, list]) => [k, new Map(list.map((o) => [o.value, o.label]))]));
  const fields = def.columns.map((c) => def.fields.find((f) => f.name === c) ?? { name: c, type: "created" as const, label: "Added" });
  const titleField = def.fields.find((f) => f.name === def.titleField)!;
  const imageField = def.fields.find((f) => f.type === "image");
  const extra = counts
    ? [
        { label: "Watches", value: (id: string) => counts.products[id] ?? 0, href: (id: string) => `/watches?${def.key === "brands" ? "brand" : "collection"}=${id}` },
        { label: "In stock", value: (id: string) => counts.inStock[id] ?? 0, href: null },
      ]
    : [];
  const base = `/${def.key}`;
  const qs = (s?: string) => { const u = new URLSearchParams(); if (q) u.set("q", q); if (s) u.set("status", s); const t = u.toString(); return t ? `${base}?${t}` : base; };

  return (
    <>
      <PageHeader
        title={def.title}
        description={def.description}
        actions={!def.noCreate && <ButtonLink href={`${base}/new`}><Plus className="size-4" />Add {def.singular}</ButtonLink>}
      />
      {sp.saved && <p role="status" className="mb-4 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Saved.</p>}
      <Card>
        {statusField?.options && (
          <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3">
            {[{ value: "", label: "All" }, ...statusField.options].map((o) => {
              const n = o.value ? all.filter((r) => r[statusField.name] === o.value).length : all.length;
              const active = (status ?? "") === o.value;
              return (
                <Link key={o.value} href={qs(o.value || undefined)} aria-current={active ? "page" : undefined}
                  className={cn("-mb-px border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap", active ? "border-text font-medium" : "border-transparent text-muted hover:text-text")}>
                  {o.label} <span className="text-xs text-muted">{n}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <FilterBar q={q} placeholder={`Search ${def.title.toLowerCase()}`} resetHref={base}>
          {status && <input type="hidden" name="status" value={status} />}
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState title={q || status ? "Nothing matches" : `No ${def.title.toLowerCase()} yet`}>
            {!q && !status && !def.noCreate && <Link href={`${base}/new`} className="text-accent-strong underline">Add the first {def.singular}</Link>}
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{titleField.label.replace(" name", "")}</Th>
                {fields.map((f) => <Th key={f.name} className={f.type === "money" || f.type === "number" ? "text-right" : undefined}>{"label" in f ? ("short" in f && f.short) || f.label : "Added"}</Th>)}
                {extra.map((e) => <Th key={e.label} className="text-right">{e.label}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50">
                  <Td>
                    <Link href={`${base}/${r.id}`} className="flex items-center gap-3">
                      {imageField && (
                        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2 text-xs font-semibold text-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r[imageField.name] ? <img src={String(r[imageField.name])} alt="" className="size-full object-cover" /> : String(r[def.titleField] ?? "?").slice(0, 1)}
                        </span>
                      )}
                      <span>
                        <span className="font-medium hover:underline"><Value field={titleField} value={r[def.titleField]} lookups={lookups} /></span>
                        {def.subtitleField && r[def.subtitleField] != null && <span className="block max-w-xs truncate text-xs text-muted">{String(r[def.subtitleField])}</span>}
                      </span>
                    </Link>
                  </Td>
                  {fields.map((f) => (
                    <Td key={f.name} className={f.type === "money" || f.type === "number" ? "text-right" : undefined}>
                      <Value field={f} value={f.type === "created" ? r.created_at : r[f.name]} lookups={lookups} />
                    </Td>
                  ))}
                  {extra.map((e) => (
                    <Td key={e.label} className="text-right">
                      {e.href ? <Link href={e.href(r.id)} className="hover:underline">{e.value(r.id)}</Link> : e.value(r.id)}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
