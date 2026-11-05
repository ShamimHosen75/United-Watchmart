"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { saveBranch } from "@/lib/data/business";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";

const text = z.string().trim().transform((v) => (v === "" ? null : v));
const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, "2 to 12 letters, digits or dashes, e.g. GUL."),
  name: z.string().trim().min(2, "Enter the branch name."),
  address: text,
  city: text,
  phone: text,
  email: z.union([z.literal(""), z.email("Enter a valid email.")]).transform((v) => v || null),
  opening_hours: text,
});

export async function saveBranchAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !["owner", "admin"].includes(user.role)) return { error: "Only an owner or admin can change branches." };
  const raw = formValues(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  try {
    await saveBranch(id, { ...parsed.data, is_active: formData.get("is_active") === "on" });
  } catch (e) {
    return { error: errorMessage(e, "Could not save the branch."), values: raw };
  }
  revalidatePath("/", "layout");
  redirect("/branches");
}
