"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { addRepairNote, createRepair, getRepair, updateRepair } from "@/lib/data/service";
import { money as formatMoney } from "@/lib/format";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";
import type { RepairStatus } from "@/lib/types";

const isStaff = async () => Boolean((await getCurrentUser())?.is_active);

const money = z.union([z.literal(""), z.coerce.number().min(0, "Amounts can't be negative.")]).transform((v) => (v === "" ? null : v));
const optDate = z.union([z.literal(""), z.iso.date()]).transform((v) => v || null);
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const intakeSchema = z.object({
  customer_id: z.string().nullable(),
  new_customer: z.object({ full_name: z.string().trim(), phone: z.string().trim(), email: z.string().trim() }).nullable(),
  branch_id: z.string().min(1, "Pick the branch taking the watch in."),
  brand_text: z.string().trim().min(1, "Enter the brand."),
  model_text: z.string().trim().min(1, "Enter the model."),
  serial_number: optText(80),
  issue: z.string().trim().min(3, "Describe what the client reports."),
  intake_notes: optText(2000),
  estimate: money,
  promised_at: optDate,
  technician_id: z.string().transform((v) => v || null),
  under_warranty: z.boolean(),
});

const touch = (id?: string) => {
  for (const p of ["/repairs", "/dashboard", "/customers"]) revalidatePath(p);
  if (id) revalidatePath(`/repairs/${id}`);
};

export async function createRepairAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isStaff())) return { error: "Sign in to log repairs." };
  let json: unknown;
  try { json = JSON.parse(String(formData.get("repair"))); } catch { return { error: "Could not read the form." }; }
  const parsed = intakeSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.customer_id && !d.new_customer?.full_name) return { error: "Pick the client or add a new one." };
  if (!d.customer_id && d.new_customer && !d.new_customer.phone && !d.new_customer.email) return { error: "Add a phone or email so we can tell the client when it's ready." };
  let id: string;
  try { id = await createRepair(d); } catch (e) { return { error: errorMessage(e, "Could not log the repair.") }; }
  touch(id);
  redirect(`/repairs/${id}`);
}

const detailsSchema = z.object({
  issue: z.string().trim().min(3, "Describe the issue."),
  diagnosis: optText(4000),
  intake_notes: optText(2000),
  estimate: money,
  final_cost: money,
  promised_at: optDate,
  technician_id: z.string().transform((v) => v || null),
  under_warranty: z.literal("on").optional().transform(Boolean),
});

export async function updateRepairAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isStaff())) return { error: "Sign in to edit repairs." };
  const values = formValues(formData);
  const parsed = detailsSchema.safeParse(values);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  try { await updateRepair(id, parsed.data); } catch (e) { return { error: errorMessage(e, "Could not save."), values }; }
  touch(id);
  return { ok: "Job details saved." };
}

/** Allowed next steps for each status. Cancelling is possible until the watch is ready. */
const NEXT: Record<RepairStatus, RepairStatus[]> = {
  received: ["diagnosing", "cancelled"],
  diagnosing: ["awaiting_approval", "in_progress", "cancelled"],
  awaiting_approval: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["in_progress"],
  collected: [],
  cancelled: ["received"],
};

export async function setRepairStatusAction(id: string, status: RepairStatus): Promise<void> {
  if (!(await isStaff())) return;
  const r = await getRepair(id);
  if (!r || !NEXT[r.status].includes(status)) return;
  await updateRepair(id, { status });
  touch(id);
}

export async function collectRepairAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isStaff())) return { error: "Sign in to hand watches back." };
  const r = await getRepair(id);
  if (!r) return { error: "Repair not found." };
  if (r.status !== "ready") return { error: "Only a watch marked ready can be collected." };
  const amount = z.coerce.number().min(0).safeParse(formData.get("paid_amount") || 0);
  if (!amount.success) return { error: "Enter a valid amount." };
  const method = z.enum(["card", "cash", "bank_transfer", "mobile_banking", "stripe", "trade_in", "other"]).nullable()
    .safeParse(amount.data > 0 ? formData.get("payment_method") : null);
  if (!method.success) return { error: "Pick how the client paid." };
  const due = r.under_warranty ? 0 : (r.final_cost ?? r.estimate ?? 0);
  if (amount.data + 0.005 < due && formData.get("allow_short") !== "on") {
    return { error: `The bill is ${formatMoney(due)}. Tick "Collect with balance owing" to hand back with less.` };
  }
  try {
    await updateRepair(id, { status: "collected", paid_amount: amount.data, payment_method: method.data });
  } catch (e) {
    return { error: errorMessage(e, "Could not record collection.") };
  }
  touch(id);
  return { ok: "Watch handed back to the client." };
}

export async function addRepairNoteAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isStaff())) return { error: "Sign in to add notes." };
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Write a note first." };
  if (note.length > 2000) return { error: "Keep notes under 2000 characters." };
  try { await addRepairNote(id, note); } catch (e) { return { error: errorMessage(e, "Could not add the note.") }; }
  touch(id);
  return { ok: "Note added." };
}
