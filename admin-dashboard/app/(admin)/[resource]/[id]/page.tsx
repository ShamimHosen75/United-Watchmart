import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MessageCircle } from "lucide-react";
import { getResource } from "@/lib/resources";
import { getRecord, optionsFor } from "@/lib/data/resources";
import { getCurrentUser, listProducts } from "@/lib/data";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { ResourceForm } from "@/components/resources/resource-form";
import { setRecordStatusAction } from "../actions";
import { dateTime, money } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[resource]/[id]">): Promise<Metadata> {
  const def = getResource((await params).resource);
  return { title: def ? `Edit ${def.singular}` : "Not found" };
}

export default async function EditResourcePage({ params, searchParams }: PageProps<"/[resource]/[id]">) {
  const { resource, id } = await params;
  const def = getResource(resource);
  if (!def) notFound();
  const [record, options, me, sp] = await Promise.all([getRecord(def, id), optionsFor(def), getCurrentUser(), searchParams]);
  if (!record) notFound();
  const canEdit = Boolean(me && def.editRoles.includes(me.role));

  const titleField = def.fields.find((f) => f.name === def.titleField)!;
  const title = titleField.type === "relation"
    ? options[titleField.name]?.find((o) => o.value === String(record[titleField.name]))?.label ?? def.singular
    : String(record[def.titleField] ?? def.singular);

  const watches = def.key === "brands" || def.key === "categories"
    ? await listProducts(def.key === "brands" ? {} : { collection: id }).then((list) => def.key === "brands" ? list.filter((p) => p.brand_id === id) : list)
    : null;

  const statusField = def.fields.find((f) => f.name === def.statusField);
  const status = statusField ? String(record[statusField.name] ?? "") : null;
  const phone = typeof record.phone === "string" ? record.phone.replace(/[^\d]/g, "") : "";

  return (
    <>
      <Link href={`/${def.key}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ChevronLeft className="size-4" />{def.title}</Link>
      <PageHeader
        title={title}
        description={typeof record.created_at === "string" ? `Added ${dateTime(record.created_at)}` : undefined}
        actions={status && <StatusBadge status={status} />}
      />
      {sp.saved && <p role="status" className="mb-4 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Saved.</p>}

      {statusField?.options && canEdit && (
        <div className="mb-4 flex max-w-3xl flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted">Mark as</span>
          {statusField.options.filter((o) => o.value !== status).map((o) => (
            <form key={o.value} action={setRecordStatusAction.bind(null, def.key, id, o.value)}>
              <Button variant="secondary" className="h-8 text-xs">{o.label}</Button>
            </form>
          ))}
          {def.key === "checkout-leads" && phone && (
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-2">
              <MessageCircle className="size-3.5" />WhatsApp
            </a>
          )}
          {def.key === "checkout-leads" && typeof record.email === "string" && (
            <a href={`mailto:${record.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-2">
              <Mail className="size-3.5" />Email
            </a>
          )}
        </div>
      )}

      <ResourceForm def={def} record={record} options={options} canEdit={canEdit} />

      {watches && (
        <Card className="mt-6 max-w-3xl">
          <CardHeader title={`Watches in this ${def.singular}`} subtitle={`${watches.length} in the catalogue`} />
          {watches.length === 0 ? <EmptyState title="No watches yet">Pick this {def.singular} when you add or edit a watch.</EmptyState> : (
            <Table>
              <thead><tr><Th>Watch</Th><Th>Status</Th><Th className="text-right">In stock</Th><Th className="text-right">Price</Th></tr></thead>
              <tbody>
                {watches.map((p) => (
                  <tr key={p.id}>
                    <Td><Link href={`/watches/${p.id}`} className="font-medium hover:underline">{p.name}</Link><span className="block text-xs text-muted">{p.ref_number}</span></Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td className="text-right">{p.in_stock}</Td>
                    <Td className="text-right">{money(p.price)}</Td>
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
