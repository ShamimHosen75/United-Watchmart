import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag, UserRound } from "lucide-react";
import { listBranches, listProducts, listStaff, listStock } from "@/lib/data";
import { getViewing } from "@/lib/data/clients";
import { linkCustomerAction } from "../actions";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ViewingForm } from "@/components/viewings/viewing-form";
import { ReserveForm } from "@/components/viewings/reserve-form";
import { dateTime, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Viewing" };

export default async function ViewingPage({ params }: PageProps<"/viewings/[id]">) {
  const { id } = await params;
  const viewing = await getViewing(id);
  if (!viewing) notFound();
  const [products, branches, staff, stock] = await Promise.all([
    listProducts(), listBranches(), listStaff(),
    viewing.product_id ? listStock({ product: viewing.product_id, branch: "all", status: "available" }) : Promise.resolve([]),
  ]);
  const options = stock.filter((s) => s.status === "in_stock" || s.id === viewing.stock_item_id);
  const open = viewing.status === "new" || viewing.status === "confirmed";
  const sellHref = `/orders/new?${new URLSearchParams({
    ...(viewing.stock_item_id ? { stock: viewing.stock_item_id } : {}),
    ...(viewing.customer_id ? { customer: viewing.customer_id } : {}),
  })}`;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/viewings" className="text-muted hover:text-text">← Viewings</Link></p>
      <PageHeader
        title={`${viewing.name}${viewing.product_name ? ` · ${viewing.product_name}` : ""}`}
        description={`Requested ${dateTime(viewing.created_at)} via ${titleCase(viewing.source)}`}
        actions={
          <>
            <StatusBadge status={viewing.status} />
            {viewing.customer_id ? (
              <ButtonLink href={`/customers/${viewing.customer_id}`} variant="secondary"><UserRound className="size-4" />Client profile</ButtonLink>
            ) : (
              <form action={linkCustomerAction.bind(null, viewing.id)}>
                <Button variant="secondary"><UserRound className="size-4" />Save as client</Button>
              </form>
            )}
            {open && <ButtonLink href={sellHref}><ShoppingBag className="size-4" />Sell</ButtonLink>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title="Appointment" subtitle="Confirm the time, pick a host and keep notes" />
          <ViewingForm viewing={viewing} products={products} branches={branches} staff={staff} />
        </Card>
        <div className="space-y-6">
          {viewing.product_id && (
            <Card>
              <CardHeader title="Hold a watch" subtitle="Reserve a piece so it is not sold before the visit" />
              <ReserveForm viewingId={viewing.id} options={options} current={viewing.stock_item_id} />
            </Card>
          )}
          {viewing.message && (
            <Card className="p-5 text-sm">
              <p className="mb-1 text-xs text-muted">Client wrote</p>
              <p>{viewing.message}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
