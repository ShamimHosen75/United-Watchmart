import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { PurchaseForm } from "@/components/supply/purchase-form";
import { getBranchScope, listBranches, listProducts } from "@/lib/data";
import { listSuppliers } from "@/lib/data/supply";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New purchase" };

export default async function NewPurchasePage({ searchParams }: PageProps<"/purchases/new">) {
  const sp = await searchParams;
  const [suppliers, branches, products, scope] = await Promise.all([listSuppliers(), listBranches(), listProducts(), getBranchScope()]);
  return (
    <>
      <PageHeader title="New purchase" description="Save a draft while you agree prices, then place the order. Receive it when the watches arrive." />
      <PurchaseForm
        suppliers={suppliers}
        branches={branches.filter((b) => b.is_active)}
        products={products.filter((p) => p.status !== "archived")}
        defaults={{ supplier: param(sp.supplier), product: param(sp.product), branch: scope !== "all" ? scope : undefined }}
      />
    </>
  );
}
