"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { closeTransfer, createTransfer } from "@/lib/data/supply";
import { errorMessage, type FormState } from "@/lib/form";

const touch = (id?: string) => {
  for (const p of ["/transfers", "/inventory", "/watches", "/dashboard"]) revalidatePath(p);
  if (id) revalidatePath(`/transfers/${id}`);
};

export async function createTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const from = String(formData.get("from_branch_id") ?? "");
  const to = String(formData.get("to_branch_id") ?? "");
  const items = formData.getAll("items").map(String);
  if (!from || !to) return { error: "Pick both branches." };
  if (from === to) return { error: "Pick two different branches." };
  if (!items.length) return { error: "Tick at least one watch to send." };
  let id: string;
  try {
    id = await createTransfer({ from_branch_id: from, to_branch_id: to, items, notes: String(formData.get("notes") ?? "").trim() });
  } catch (e) {
    return { error: errorMessage(e, "Could not create the transfer.") };
  }
  touch(id);
  redirect(`/transfers/${id}`);
}

export async function closeTransferAction(id: string, receive: boolean): Promise<void> {
  if (!(await getCurrentUser())) return;
  await closeTransfer(id, receive);
  touch(id);
}
