import type { Metadata } from "next";
import { getCurrentUser, listBrands, listCollections } from "@/lib/data";
import { catalogueUsage } from "@/lib/data/business";
import { Card, CardHeader } from "@/components/ui/card";
import { CatalogueAdd, CatalogueRow } from "@/components/business/settings-forms";

export const metadata: Metadata = { title: "Catalogue settings" };

export default async function CatalogueSettings() {
  const [brands, collections, usage, me] = await Promise.all([listBrands(), listCollections(), catalogueUsage(), getCurrentUser()]);
  const canEdit = Boolean(me && ["owner", "admin", "manager"].includes(me.role));
  const lists = [
    { kind: "brands" as const, title: "Brands", items: brands, used: usage.brands },
    { kind: "collections" as const, title: "Collections", items: collections, used: usage.collections },
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
      {lists.map((l) => (
        <Card key={l.kind}>
          <CardHeader title={l.title} subtitle={canEdit ? "Used to group watches in the catalogue and in reports. In-use entries can't be deleted." : "Only a manager can change these."} />
          {canEdit && <CatalogueAdd kind={l.kind} />}
          <ul className="divide-y divide-border">
            {l.items.map((b) => canEdit
              ? <CatalogueRow key={b.id} kind={l.kind} id={b.id} name={b.name} used={l.used[b.id] ?? 0} />
              : <li key={b.id} className="flex justify-between px-4 py-2.5 text-sm"><span>{b.name}</span><span className="text-xs text-muted">{l.used[b.id] ?? 0}</span></li>)}
          </ul>
        </Card>
      ))}
    </div>
  );
}
