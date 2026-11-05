import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { BranchForm } from "@/components/business/branch-form";

export const metadata: Metadata = { title: "Add branch" };

export default function NewBranchPage() {
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/branches" className="text-muted hover:text-text">← Branches</Link></p>
      <PageHeader title="Add branch" />
      <BranchForm />
    </>
  );
}
