import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/watches/product-form";
import { listBrands, listCollections } from "@/lib/data";
import { getSettings } from "@/lib/data/business";

export const metadata: Metadata = { title: "New watch" };

export default async function NewWatchPage() {
  const [brands, collections, settings] = await Promise.all([listBrands(), listCollections(), getSettings()]);
  return (
    <>
      <PageHeader title="New watch" description="Add a model to the catalogue. Physical pieces are added in Inventory by serial number." />
      <ProductForm brands={brands} collections={collections} defaultWarranty={settings.default_warranty_months} />
    </>
  );
}
