import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { PointOfSale } from "@/components/orders/pos";
import { getBranchScope, getCurrentUser, listBranches } from "@/lib/data";
import { getTaxRate, listSellableStock } from "@/lib/data/sales";
import { listCustomers } from "@/lib/data/clients";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New sale" };

export default async function NewSalePage({ searchParams }: PageProps<"/orders/new">) {
  const sp = await searchParams;
  const [stock, branches, customers, taxRate, scope, user] = await Promise.all([
    listSellableStock(), listBranches(), listCustomers(), getTaxRate(), getBranchScope(), getCurrentUser(),
  ]);
  const active = branches.filter((b) => b.is_active);
  const items = (param(sp.stock) ?? "").split(",").filter(Boolean);
  const firstItemBranch = stock.find((s) => s.id === items[0])?.branch_id;
  const branch = firstItemBranch ?? (scope !== "all" ? scope : user?.branch_id) ?? active[0]?.id ?? "";

  return (
    <>
      <PageHeader title="New sale" description="Pick watches by serial, add the client and take payment. Stock, invoice and warranty cards update in one step." />
      <PointOfSale
        stock={stock}
        branches={active}
        clients={customers.map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone, email: c.email }))}
        taxRate={taxRate}
        defaults={{ branch, items, customer: param(sp.customer) ?? null }}
      />
    </>
  );
}
