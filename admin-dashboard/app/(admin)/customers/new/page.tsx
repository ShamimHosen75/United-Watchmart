import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { listBranches } from "@/lib/data";

export const metadata: Metadata = { title: "Add client" };

export default async function NewCustomerPage() {
  return (
    <>
      <PageHeader title="Add client" />
      <CustomerForm branches={await listBranches()} />
    </>
  );
}
