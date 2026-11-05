import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listBranches } from "@/lib/data";
import { PageHeader } from "@/components/ui/card";
import { BranchForm } from "@/components/business/branch-form";

export const metadata: Metadata = { title: "Edit branch" };

export default async function EditBranchPage({ params }: PageProps<"/branches/[id]">) {
  const { id } = await params;
  const branch = (await listBranches()).find((b) => b.id === id);
  if (!branch) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/branches" className="text-muted hover:text-text">← Branches</Link></p>
      <PageHeader title={branch.name} description="Closing a branch hides it from pickers. Its history stays." />
      <BranchForm branch={branch} />
    </>
  );
}
