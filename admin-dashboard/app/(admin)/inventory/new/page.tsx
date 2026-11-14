import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { AddStockForm } from "@/components/inventory/add-stock-form";
import { getBranchScope, listBranches, listProducts } from "@/lib/data";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Add stock" };

export default async function AddStockPage({ searchParams }: PageProps<"/inventory/new">) {
  const sp = await searchParams;
  const [products, branches, scope] = await Promise.all([listProducts({ status: "" }), listBranches(), getBranchScope()]);
  const branch = param(sp.branch) ?? (scope !== "all" ? scope : undefined);
  return (
    <>
      <PageHeader title="Add stock" description="Register a physical watch by its serial number. Bulk receiving from suppliers arrives with Purchases." />
      <AddStockForm
        products={products.filter((p) => p.status !== "archived")}
        branches={branches.filter((b) => b.is_active)}
        defaults={{ product: param(sp.product), branch }}
      />
    </>
  );
}
