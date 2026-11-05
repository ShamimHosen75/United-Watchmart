import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { TransferForm } from "@/components/supply/transfer-form";
import { getBranchScope, listBranches, listStock } from "@/lib/data";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New transfer" };

export default async function NewTransferPage({ searchParams }: PageProps<"/transfers/new">) {
  const sp = await searchParams;
  const [branches, stock, scope] = await Promise.all([listBranches(), listStock({ branch: "all", status: "in_stock" }), getBranchScope()]);
  const items = (param(sp.stock) ?? "").split(",").filter(Boolean);
  const from = stock.find((s) => s.id === items[0])?.branch_id ?? (scope !== "all" ? scope : undefined);
  return (
    <>
      <PageHeader title="New transfer" />
      <TransferForm branches={branches.filter((b) => b.is_active)} stock={stock} defaults={{ from, items }} />
    </>
  );
}
