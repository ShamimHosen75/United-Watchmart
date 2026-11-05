"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import {
  changePassword, deleteCampaign, deleteCatalogueEntry, getCampaign, markCampaignSent, personalise, saveCampaign, saveCatalogueEntry,
  saveSettings, segmentRecipients, updateOwnProfile,
} from "@/lib/data/business";
import { emailConfigured, sendEmails } from "@/lib/email";
import { errorMessage, fieldErrors, formValues, type FormState } from "@/lib/form";

const hasRole = async (roles: string[]) => {
  const u = await getCurrentUser();
  return Boolean(u?.is_active && roles.includes(u.role));
};
const text = z.string().trim().transform((v) => (v === "" ? null : v));

/* Account */

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = z.object({ full_name: z.string().trim().min(2, "Enter your name."), phone: text }).safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  try { await updateOwnProfile(parsed.data); } catch (e) { return { error: errorMessage(e, "Could not save."), values: raw }; }
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 10) return { error: "Use at least 10 characters." };
  if (pw !== String(formData.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  try { await changePassword(pw); } catch (e) { return { error: errorMessage(e, "Could not change the password.") }; }
  return { ok: "Password changed." };
}

/* Store */

const storeSchema = z.object({
  store_name: z.string().trim().min(2, "Enter the store name."),
  legal_name: text,
  phone: text,
  email: z.union([z.literal(""), z.email("Enter a valid email.")]).transform((v) => v || null),
  address: text,
  website_url: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Start with https://" })]).transform((v) => v || null),
  whatsapp_number: text,
  tax_rate: z.coerce.number().min(0, "0 or more.").max(50, "50% at most."),
  default_warranty_months: z.coerce.number().int("Whole months.").min(0).max(120, "120 months at most."),
  low_stock_threshold: z.coerce.number().int("Whole number.").min(0).max(100),
  invoice_footer: text,
});

export async function saveStoreAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasRole(["owner", "admin"]))) return { error: "Only an owner or admin can change store settings." };
  const raw = formValues(formData);
  const parsed = storeSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  try { await saveSettings(parsed.data); } catch (e) { return { error: errorMessage(e, "Could not save."), values: raw }; }
  revalidatePath("/", "layout");
  return { ok: "Store settings saved." };
}

/* Notifications */

export async function saveNotificationsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasRole(["owner", "admin"]))) return { error: "Only an owner or admin can change notifications." };
  const raw = formValues(formData);
  const parsed = z.object({
    notify_email: z.union([z.literal(""), z.email("Enter a valid email.")]),
    repair_quote_template: z.string().trim().max(1000),
    repair_ready_template: z.string().trim().max(1000),
  }).safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  const viewing_email = formData.get("viewing_email") === "on";
  if (viewing_email && !parsed.data.notify_email) return { error: "Add the address to send viewing requests to.", values: raw };
  try { await saveSettings({ notifications: { ...parsed.data, viewing_email } }); } catch (e) { return { error: errorMessage(e, "Could not save."), values: raw }; }
  revalidatePath("/settings/notifications");
  return { ok: "Notifications saved." };
}

/* Catalogue */

export async function saveCatalogueAction(kind: "brands" | "collections", id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasRole(["owner", "admin", "manager"]))) return { error: "Only a manager can change the catalogue." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a name." };
  try { await saveCatalogueEntry(kind, id, name); } catch (e) { return { error: errorMessage(e, "Could not save.") }; }
  revalidatePath("/settings/catalogue");
  revalidatePath("/watches");
  return { ok: id ? "Renamed." : "Added." };
}

export async function deleteCatalogueAction(kind: "brands" | "collections", id: string): Promise<FormState> {
  if (!(await hasRole(["owner", "admin", "manager"]))) return { error: "Only a manager can change the catalogue." };
  try { await deleteCatalogueEntry(kind, id); } catch (e) { return { error: errorMessage(e, "Could not delete.") }; }
  revalidatePath("/settings/catalogue");
  return { ok: "Deleted." };
}

/* Marketing */

const campaignSchema = z.object({
  name: z.string().trim().min(2, "Name the campaign."),
  channel: z.enum(["email", "whatsapp"]),
  subject: z.string().trim().optional().transform((v) => v || null),
  message: z.string().trim().min(5, "Write the message.").max(4000),
  vip: z.literal("on").optional(),
  birthday_month: z.literal("on").optional(),
  tag: z.string().trim().max(40),
  branch_id: z.string(),
  brand_id: z.string(),
});

export async function saveCampaignAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasRole(["owner", "admin", "manager"]))) return { error: "Only a manager can create campaigns." };
  const raw = formValues(formData);
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;
  if (d.channel === "email" && !d.subject) return { error: "Emails need a subject.", fieldErrors: { subject: "Add a subject." }, values: raw };
  const segment = {
    ...(d.vip ? { vip: true } : {}), ...(d.birthday_month ? { birthday_month: true } : {}),
    ...(d.tag ? { tag: d.tag } : {}), ...(d.branch_id ? { branch_id: d.branch_id } : {}), ...(d.brand_id ? { brand_id: d.brand_id } : {}),
  };
  let saved: string;
  try {
    saved = await saveCampaign(id, { name: d.name, channel: d.channel, subject: d.channel === "email" ? d.subject : null, message: d.message, segment });
  } catch (e) {
    return { error: errorMessage(e, "Could not save."), values: raw };
  }
  revalidatePath("/settings/marketing");
  redirect(`/settings/marketing/${saved}`);
}

export async function deleteCampaignAction(id: string): Promise<void> {
  if (!(await hasRole(["owner", "admin", "manager"]))) return;
  await deleteCampaign(id);
  revalidatePath("/settings/marketing");
  redirect("/settings/marketing");
}

/** Email: sends through Resend. WhatsApp: staff send each message by hand, then mark the campaign as sent. */
export async function sendCampaignAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await hasRole(["owner", "admin", "manager"]))) return { error: "Only a manager can send campaigns." };
  const c = await getCampaign(id);
  if (!c) return { error: "Campaign not found." };
  if (c.status === "sent") return { error: "This campaign was already sent." };
  if (formData.get("confirm") !== "on") return { error: "Tick the box to confirm." };
  const recipients = await segmentRecipients(c.segment, c.channel);
  if (!recipients.length) return { error: "No clients match this audience." };
  let count = recipients.length;
  if (c.channel === "email") {
    if (!emailConfigured) return { error: "Email isn't set up yet. See Settings → Integrations." };
    try {
      count = await sendEmails(recipients.map((r) => ({ to: r.email!, subject: c.subject ?? c.name, text: personalise(c.message, r.full_name) })));
    } catch (e) {
      return { error: errorMessage(e, "Sending failed.") };
    }
  }
  await markCampaignSent(id, count);
  revalidatePath(`/settings/marketing/${id}`);
  revalidatePath("/settings/marketing");
  return { ok: c.channel === "email" ? `Sent to ${count} clients.` : `Marked as sent to ${count} clients.` };
}
