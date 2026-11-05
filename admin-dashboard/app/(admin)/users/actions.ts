"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { createInvite, deleteInvite, updateStaff } from "@/lib/data/business";
import { errorMessage, type FormState } from "@/lib/form";

const role = z.enum(["owner", "admin", "manager", "sales", "technician"]);
const isAdmin = async () => {
  const u = await getCurrentUser();
  return Boolean(u?.is_active && ["owner", "admin"].includes(u.role));
};

export async function updateStaffAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Only an owner or admin can change staff." };
  const parsed = z.object({ role, branch_id: z.string().transform((v) => v || null) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a role." };
  try {
    await updateStaff(id, { ...parsed.data, is_active: formData.get("is_active") === "on" });
  } catch (e) {
    return { error: errorMessage(e, "Could not save.") };
  }
  revalidatePath("/users");
  return { ok: "Saved." };
}

export async function inviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Only an owner or admin can invite staff." };
  const parsed = z.object({
    email: z.email("Enter a valid email."),
    full_name: z.string().trim().min(2, "Enter their name."),
    role,
    branch_id: z.string().transform((v) => v || null),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: Object.fromEntries([...formData].map(([k, v]) => [k, String(v)])) };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  let emailed: boolean;
  try {
    emailed = await createInvite(parsed.data, `${origin}/auth/confirm?next=/settings/account`);
  } catch (e) {
    return { error: errorMessage(e, "Could not save the invite.") };
  }
  revalidatePath("/users");
  return {
    ok: emailed
      ? `Invite emailed to ${parsed.data.email}. They join as ${parsed.data.role} once they set a password.`
      : `Invite saved. When ${parsed.data.email} first signs in, they join as ${parsed.data.role} automatically.`,
  };
}

export async function deleteInviteAction(email: string): Promise<void> {
  if (!(await isAdmin())) return;
  await deleteInvite(email);
  revalidatePath("/users");
}
