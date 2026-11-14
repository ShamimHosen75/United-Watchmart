import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { SupplierForm } from "@/components/supply/supplier-form";
import { getSupplier } from "@/lib/data/supply";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function EditSupplierPage({ params }: PageProps<"/suppliers/[id]/edit">) {
  const supplier = await getSupplier((await params).id);
  if (!supplier) notFound();
  return (
    <>
      <PageHeader title={`Edit ${supplier.name}`} />
      <SupplierForm supplier={supplier} />
    </>
  );
}
