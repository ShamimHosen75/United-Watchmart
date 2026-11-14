import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { SupplierForm } from "@/components/supply/supplier-form";

export const metadata: Metadata = { title: "Add supplier" };

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="Add supplier" />
      <SupplierForm />
    </>
  );
}
