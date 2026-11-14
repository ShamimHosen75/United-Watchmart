"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { receivePurchase, savePurchase, setPurchaseStatus } from "@/lib/data/supply";
import { errorMessage, type FormState } from "@/lib/form";

const isManager = async () => {
  const u = await getCurrentUser();
  return Boolean(u && ["owner", "admin", "manager"].includes(u.role));
};

const purchaseSchema = z.object({
  id: z.string().nullable(),
  supplier_id: z.string().min(1, "Pick a supplier."),
  branch_id: z.string().min(1, "Pick the receiving branch."),
  status: z.enum(["draft", "ordered"]),
  ordered_at: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
  expected_at: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
  shipping_cost: z.coerce.number().min(0, "Shipping can't be negative."),
  notes: z.string().trim().max(2000).transform((v) => v || null),
  items: z.array(z.object({
    product_id: z.string().min(1, "Pick a watch on every line."),
    quantity: z.coerce.number().int("Whole numbers only.").min(1, "Quantity must be at least 1.").max(500),
    unit_cost: z.coerce.number().min(0, "Cost can't be negative."),
  })).min(1, "Add at least one watch."),
});

const touch = (id?: string) => {
  for (const p of ["/purchases", "/suppliers", "/inventory", "/watches", "/dashboard"]) revalidatePath(p);
  if (id) revalidatePath(`/purchases/${id}`);
};

export async function savePurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isManager())) return { error: "Only a manager can create purchase orders." };
  let json: unknown;
  try { json = JSON.parse(String(formData.get("purchase"))); } catch { return { error: "Could not read the form." }; }
  const parsed = purchaseSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = { ...parsed.data, ordered_at: parsed.data.status === "ordered" ? parsed.data.ordered_at ?? new Date().toISOString().slice(0, 10) : parsed.data.ordered_at };
  let id: string;
  try { id = await savePurchase(data); } catch (e) { return { error: errorMessage(e, "Could not save the purchase.") }; }
  touch(id);
  redirect(`/purchases/${id}`);
}

export async function purchaseStatusAction(id: string, status: "ordered" | "cancelled"): Promise<void> {
  if (!(await isManager())) return;
  await setPurchaseStatus(id, status);
  touch(id);
}

export async function receiveAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isManager())) return { error: "Only a manager can receive purchases." };
  const lines = [...formData.entries()]
    .filter(([k]) => k.startsWith("serials:"))
    .map(([k, v]) => ({ purchase_item_id: k.slice(8), serials: String(v).split(/[\s,]+/).map((s) => s.trim()).filter(Boolean) }))
    .filter((l) => l.serials.length > 0);
  if (!lines.length) return { error: "Type or scan at least one serial number." };
  const all = lines.flatMap((l) => l.serials.map((s) => s.toLowerCase()));
  if (new Set(all).size !== all.length) return { error: "The same serial is listed twice." };
  const condition = z.enum(["new", "pre_owned", "display"]).safeParse(formData.get("condition"));
  let n: number;
  try {
    n = await receivePurchase(id, {
      lines, condition: condition.success ? condition.data : "new",
      has_box: formData.get("has_box") === "on", has_papers: formData.get("has_papers") === "on",
      location_note: String(formData.get("location_note") ?? "").trim(),
    });
  } catch (e) {
    return { error: errorMessage(e, "Could not receive the watches.") };
  }
  touch(id);
  return { ok: `${n} watch${n === 1 ? "" : "es"} added to stock.` };
}
