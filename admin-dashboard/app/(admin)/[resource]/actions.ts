"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { deleteRecord, saveRecord } from "@/lib/data/resources";
import { getResource, type ResourceDef } from "@/lib/resources";
import { errorMessage, formValues, type FormState } from "@/lib/form";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

/** Turns submitted form values into a row, following the module's field list. */
function parse(def: ResourceDef, fd: FormData): { data: Record<string, unknown>; errors: Record<string, string> } {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = String(fd.get(f.name) ?? "").trim();
    if (f.type === "checkbox") { data[f.name] = fd.get(f.name) === "on"; continue; }
    if (f.type === "tags") { data[f.name] = raw.split(/[,\n]/).map((t) => t.trim()).filter(Boolean); continue; }
    if (raw === "") {
      if (f.required && !(def.slugField === f.name)) errors[f.name] = `${f.label} is required.`;
      data[f.name] = (f.type === "number" || f.type === "money") && typeof f.default === "number" ? f.default : null;
      continue;
    }
    if (f.type === "number" || f.type === "money" || f.numeric) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) errors[f.name] = "Enter a number of 0 or more.";
      data[f.name] = n;
      continue;
    }
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) errors[f.name] = "Enter a valid email.";
    if (f.type === "url" && !/^https?:\/\/\S+$/.test(raw)) errors[f.name] = "Enter a full web address starting with https://";
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) errors[f.name] = "Enter a date.";
    data[f.name] = f.upper ? raw.toUpperCase().replace(/\s+/g, "") : raw;
  }
  if (def.slugField && !data[def.slugField]) data[def.slugField] = slugify(String(data[def.titleField] ?? ""));
  else if (def.slugField) data[def.slugField] = slugify(String(data[def.slugField]));
  if (def.key === "coupons") {
    if (data.code && !/^[A-Z0-9_-]{3,32}$/.test(String(data.code))) errors.code = "Use 3 to 32 letters, numbers, - or _.";
    if (data.discount_type === "percent" && Number(data.value) > 100) errors.value = "A percentage can't be more than 100.";
    if (data.starts_on && data.ends_on && String(data.ends_on) < String(data.starts_on)) errors.ends_on = "Ends before it starts.";
  }
  if (def.key === "shipping-methods" && data.min_days != null && data.max_days != null && Number(data.max_days) < Number(data.min_days))
    errors.max_days = "Must be the same or later than “from”.";
  return { data, errors };
}

async function canEdit(def: ResourceDef) {
  const u = await getCurrentUser();
  return Boolean(u?.is_active && def.editRoles.includes(u.role));
}

function revalidate(def: ResourceDef) {
  revalidatePath(`/${def.key}`);
  if (def.key === "brands" || def.key === "categories") { revalidatePath("/watches"); revalidatePath("/dashboard"); }
}

export async function saveRecordAction(key: string, id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const def = getResource(key);
  if (!def) return { error: "Unknown module." };
  if (!(await canEdit(def))) return { error: `Your role can't edit ${def.title.toLowerCase()}.` };
  const raw = formValues(formData);
  const { data, errors } = parse(def, formData);
  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", fieldErrors: errors, values: raw };
  let saved: string;
  try {
    saved = await saveRecord(def, id, data);
  } catch (e) {
    return { error: errorMessage(e, `Could not save the ${def.singular}.`), values: raw };
  }
  revalidate(def);
  redirect(id ? `/${def.key}/${saved}?saved=1` : `/${def.key}?saved=1`);
}

export async function deleteRecordAction(key: string, id: string): Promise<FormState> {
  const def = getResource(key);
  if (!def) return { error: "Unknown module." };
  if (!(await canEdit(def))) return { error: `Your role can't delete ${def.title.toLowerCase()}.` };
  try { await deleteRecord(def, id); } catch (e) { return { error: errorMessage(e, "Could not delete.") }; }
  revalidate(def);
  redirect(`/${def.key}`);
}

/** Quick status change from a list or detail page (leads, reviews). */
export async function setRecordStatusAction(key: string, id: string, status: string): Promise<void> {
  const def = getResource(key);
  if (!def?.statusField || !(await canEdit(def))) return;
  const field = def.fields.find((f) => f.name === def.statusField);
  if (!field?.options?.some((o) => o.value === status)) return;
  await saveRecord(def, id, { [def.statusField]: status });
  revalidate(def);
}
