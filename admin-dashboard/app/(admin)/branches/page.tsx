import type { Metadata } from "next";
import { Clock, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { getCurrentUser, listBranches } from "@/lib/data";
import { branchCounts } from "@/lib/data/business";
import { Card, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesPage() {
  const [branches, counts, user] = await Promise.all([listBranches(), branchCounts(), getCurrentUser()]);
  const admin = user && ["owner", "admin"].includes(user.role);
  return (
    <>
      <PageHeader
        title="Branches"
        description="Your showrooms. Stock, staff, sales and repairs all belong to a branch."
        actions={admin && <ButtonLink href="/branches/new"><Plus className="size-4" />Add branch</ButtonLink>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted">{b.code}</p>
                <h2 className="font-serif text-xl font-semibold">{b.name}</h2>
              </div>
              {b.is_active ? <Badge tone="success">Open</Badge> : <Badge>Closed</Badge>}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              {(b.address || b.city) && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{[b.address, b.city].filter(Boolean).join(", ")}</li>}
              {b.phone && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden />{b.phone}</li>}
              {b.email && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden />{b.email}</li>}
              {b.opening_hours && <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden />{b.opening_hours}</li>}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted">
                {counts[b.id]?.stock ?? 0} watches · {counts[b.id]?.staff ?? 0} staff
              </span>
              {admin && <ButtonLink href={`/branches/${b.id}`} variant="ghost"><Pencil className="size-4" />Edit</ButtonLink>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
