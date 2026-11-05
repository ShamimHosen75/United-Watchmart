"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { saveCustomer } from "@/lib/data/clients";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";

const text = z.string().trim().transform((v) => (v === "" ? null : v));
const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the client's name."),
  email: z.union([z.literal(""), z.email("Enter a valid email.")]).transform((v) => v || null),
  phone: text,
  address: text,
  city: text,
  country: text,
  birthday: z.union([z.literal(""), z.iso.date("Use a valid date.")]).transform((v) => v || null),
  wrist_size_mm: z.string().trim().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 100 || n > 260) { ctx.addIssue({ code: "custom", message: "Between 100 and 260 mm." }); return z.NEVER; }
    return n;
  }),
  preferred_branch_id: text,
  tags: z.string().transform((v) => v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)),
  notes: text,
});

export async function saveCustomerAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const raw = formValues(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  let saved: string;
  try {
    saved = await saveCustomer(id, {
      ...parsed.data,
      is_vip: formData.get("is_vip") === "on",
      marketing_opt_in: formData.get("marketing_opt_in") === "on",
    });
  } catch (e) {
    return { error: errorMessage(e, "Could not save the client."), values: raw };
  }
  revalidatePath("/customers");
  redirect(`/customers/${saved}`);
}
