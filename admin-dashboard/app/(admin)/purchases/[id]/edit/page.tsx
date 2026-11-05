import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { PurchaseForm } from "@/components/supply/purchase-form";
import { listBranches, listProducts } from "@/lib/data";
import { getPurchase, listSuppliers } from "@/lib/data/supply";

export const metadata: Metadata = { title: "Edit purchase" };

export default async function EditPurchasePage({ params }: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params;
  const [purchase, suppliers, branches, products] = await Promise.all([getPurchase(id), listSuppliers(), listBranches(), listProducts()]);
  if (!purchase) notFound();
  if (!["draft", "ordered"].includes(purchase.status) || purchase.received_qty > 0) redirect(`/purchases/${id}`);
  return (
    <>
      <PageHeader title={`Edit ${purchase.number}`} />
      <PurchaseForm purchase={purchase} items={purchase.items} suppliers={suppliers} branches={branches} products={products} defaults={{}} />
    </>
  );
}
