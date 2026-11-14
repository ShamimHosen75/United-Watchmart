import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getResource } from "@/lib/resources";
import { optionsFor } from "@/lib/data/resources";
import { getCurrentUser } from "@/lib/data";
import { PageHeader } from "@/components/ui/card";
import { ResourceForm } from "@/components/resources/resource-form";

export async function generateMetadata({ params }: PageProps<"/[resource]/new">): Promise<Metadata> {
  const def = getResource((await params).resource);
  return { title: def ? `Add ${def.singular}` : "Not found" };
}

export default async function NewResourcePage({ params }: PageProps<"/[resource]/new">) {
  const def = getResource((await params).resource);
  if (!def || def.noCreate) notFound();
  const [options, me] = await Promise.all([optionsFor(def), getCurrentUser()]);
  return (
    <>
      <Link href={`/${def.key}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ChevronLeft className="size-4" />{def.title}</Link>
      <PageHeader title={`Add ${def.singular}`} />
      <ResourceForm def={def} options={options} canEdit={Boolean(me && def.editRoles.includes(me.role))} />
    </>
  );
}
