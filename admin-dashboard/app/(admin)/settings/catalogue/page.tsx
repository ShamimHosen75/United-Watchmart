import { redirect } from "next/navigation";

/** Brands and categories now have their own modules. */
export default function CatalogueSettings() {
  redirect("/brands");
}
