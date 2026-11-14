"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { saveSupplier } from "@/lib/data/supply";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";

const text = z.string().trim().transform((v) => (v === "" ? null : v));
const schema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name."),
  contact_name: text,
  email: z.union([z.literal(""), z.email("Enter a valid email.")]).transform((v) => v || null),
  phone: text,
  address: text,
  country: text,
  payment_terms: text,
  notes: text,
});

export async function saveSupplierAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !["owner", "admin", "manager"].includes(user.role)) return { error: "Only a manager can edit suppliers." };
  const raw = formValues(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  let saved: string;
  try {
    saved = await saveSupplier(id, { ...parsed.data, is_active: formData.get("is_active") === "on" });
  } catch (e) {
    return { error: errorMessage(e, "Could not save the supplier."), values: raw };
  }
  revalidatePath("/suppliers");
  redirect(`/suppliers/${saved}`);
}
