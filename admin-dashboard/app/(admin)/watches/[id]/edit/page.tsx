import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/watches/product-form";
import { getProduct, listBrands, listCollections } from "@/lib/data";

export const metadata: Metadata = { title: "Edit watch" };

export default async function EditWatchPage({ params }: PageProps<"/watches/[id]/edit">) {
  const { id } = await params;
  const [product, brands, collections] = await Promise.all([getProduct(id), listBrands(), listCollections()]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Edit ${product.name}`} description={product.ref_number} />
      <ProductForm product={product} brands={brands} collections={collections} />
    </>
  );
}
