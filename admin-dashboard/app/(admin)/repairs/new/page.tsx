import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { IntakeForm } from "@/components/repairs/intake-form";
import { getBranchScope, getCurrentUser, listBranches, listProducts, listStaff } from "@/lib/data";
import { listCustomers, listWarranties } from "@/lib/data/clients";
import { isoDateFromToday } from "@/lib/format";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "New repair" };

export default async function NewRepairPage({ searchParams }: PageProps<"/repairs/new">) {
  const sp = await searchParams;
  const [branches, customers, warranties, products, staff, scope, user] = await Promise.all([
    listBranches(), listCustomers(), listWarranties(), listProducts(), listStaff(), getBranchScope(), getCurrentUser(),
  ]);
  const active = branches.filter((b) => b.is_active);
  const branch = (scope !== "all" ? scope : user?.branch_id) ?? active[0]?.id ?? "";
  const owned = warranties
    .filter((w) => w.customer_id && w.state !== "void")
    .map((w) => {
      const p = products.find((x) => x.ref_number === w.ref_number);
      return { customer_id: w.customer_id!, brand: p?.brand_name ?? "", model: w.product_name, serial: w.serial_number, warranty_until: w.ends_on, active: w.state === "active" };
    });
  const technicians = staff.filter((s) => s.is_active && ["technician", "manager", "owner", "admin"].includes(s.role))
    .sort((a, b) => Number(b.role === "technician") - Number(a.role === "technician"));

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/repairs" className="text-muted hover:text-text">← Repairs</Link></p>
      <PageHeader title="New repair" description="Log the watch in front of the client. A job number and ticket are created straight away." />
      <IntakeForm
        clients={customers.map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone, email: c.email }))}
        owned={owned}
        branches={active}
        technicians={technicians}
        defaults={{ branch, customer: param(sp.customer) ?? null, promised: isoDateFromToday(10) }}
      />
    </>
  );
}
