import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { ViewingForm } from "@/components/viewings/viewing-form";
import { listBranches, listProducts, listStaff } from "@/lib/data";

export const metadata: Metadata = { title: "Book viewing" };

export default async function NewViewingPage() {
  const [products, branches, staff] = await Promise.all([listProducts({ status: "active" }), listBranches(), listStaff()]);
  return (
    <>
      <PageHeader title="Book viewing" description="For requests by phone, WhatsApp or in person. Website requests arrive here on their own." />
      <Card className="max-w-3xl"><ViewingForm products={products} branches={branches} staff={staff} /></Card>
    </>
  );
}
