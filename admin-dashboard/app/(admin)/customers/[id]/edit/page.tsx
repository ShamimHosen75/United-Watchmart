import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { listBranches } from "@/lib/data";
import { getCustomer } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const [profile, branches] = await Promise.all([getCustomer(id), listBranches()]);
  if (!profile) notFound();
  return (
    <>
      <PageHeader title={`Edit ${profile.customer.full_name}`} />
      <CustomerForm customer={profile.customer} branches={branches} />
    </>
  );
}
