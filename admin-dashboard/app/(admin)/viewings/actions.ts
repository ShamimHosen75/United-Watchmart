"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { linkViewingCustomer, reserveForViewing, saveViewing } from "@/lib/data/clients";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";

const text = z.string().trim().transform((v) => (v === "" ? null : v));
const when = z.string().trim().transform((v, ctx) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) { ctx.addIssue({ code: "custom", message: "Pick a date and time." }); return z.NEVER; }
  return d.toISOString();
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter the client's name."),
  email: z.union([z.literal(""), z.email("Enter a valid email.")]),
  phone: text,
  product_id: text,
  branch_id: text,
  preferred_at: when,
  status: z.enum(["new", "confirmed", "completed", "no_show", "cancelled"]),
  source: z.string().trim().min(1),
  message: text,
  staff_notes: text,
  assigned_to: text,
});

const touch = (id?: string) => {
  revalidatePath("/viewings");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  if (id) revalidatePath(`/viewings/${id}`);
};

export async function saveViewingAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const raw = formValues(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  if (!parsed.data.email && !parsed.data.phone) return { error: "Add an email or a phone number.", values: raw };
  let saved: string;
  try {
    saved = await saveViewing(id, parsed.data);
  } catch (e) {
    return { error: errorMessage(e, "Could not save the viewing."), values: raw };
  }
  touch(saved);
  if (!id) redirect(`/viewings/${saved}`);
  return { ok: "Saved." };
}

export async function reserveAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const stock = String(formData.get("stock_item_id") ?? "");
  try {
    await reserveForViewing(id, stock || null);
  } catch (e) {
    return { error: errorMessage(e, "Could not reserve the watch.") };
  }
  touch(id);
  return { ok: stock ? "Watch reserved for this client." : "Reservation released." };
}

export async function linkCustomerAction(id: string): Promise<void> {
  if (!(await getCurrentUser())) return;
  const customerId = await linkViewingCustomer(id);
  touch(id);
  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}
