"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addStockItem, getCurrentUser, getStockItem, updateStockItem } from "@/lib/data";

const optionalText = z.string().trim().transform((v) => (v === "" ? null : v));

const addSchema = z.object({
  product_id: z.string().min(1, "Pick a watch."),
  branch_id: z.string().min(1, "Pick a branch."),
  serial_number: z.string().trim().min(3, "Enter the serial number.").max(64),
  condition: z.enum(["new", "pre_owned", "display"]),
  cost_price: z.string().trim().transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) { ctx.addIssue({ code: "custom", message: "Enter a positive number." }); return z.NEVER; }
    return n;
  }),
  location_note: optionalText,
  notes: optionalText,
});

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  ok?: string;
}

export async function addStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = addSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors, values: raw };
  }
  let id: string;
  try {
    id = await addStockItem({
      ...parsed.data,
      has_box: formData.get("has_box") === "on",
      has_papers: formData.get("has_papers") === "on",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add the watch.", values: raw };
  }
  revalidatePath("/inventory");
  revalidatePath("/watches");
  revalidatePath("/dashboard");
  if (formData.get("intent") === "another") {
    return { ok: `Added ${parsed.data.serial_number}.`, values: { ...raw, serial_number: "", notes: "" } };
  }
  redirect(`/inventory/${id}`);
}

const updateSchema = z.object({
  status: z.enum(["in_stock", "reserved", "sold", "in_repair", "in_transit", "returned", "written_off"]),
  branch_id: z.string().min(1),
  location_note: optionalText,
  notes: optionalText,
});

export async function updateStockAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const parsed = updateSchema.safeParse(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await getStockItem(id);
  if (!current) return { error: "Watch not found." };
  if (parsed.data.status === "sold" && current.item.status !== "sold") {
    return { error: "Record sales with New sale in Orders so the invoice and warranty card are created too." };
  }
  try {
    await updateStockItem(id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update." };
  }
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}
