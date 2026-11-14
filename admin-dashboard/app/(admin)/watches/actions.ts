"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, saveProduct, type ProductInput } from "@/lib/data";

const optionalText = z.string().trim().transform((v) => (v === "" ? null : v));
const optionalNumber = z.string().trim().transform((v, ctx) => {
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    ctx.addIssue({ code: "custom", message: "Enter a positive number." });
    return z.NEVER;
  }
  return n;
});
const requiredNumber = z.string().trim().min(1, "Required.").pipe(optionalNumber).transform((v) => v ?? 0);

const schema = z.object({
  name: z.string().trim().min(2, "Enter the model name."),
  ref_number: z.string().trim().min(2, "Enter the reference number."),
  sku: z.string().trim().min(2, "Enter a SKU."),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  tagline: optionalText,
  description: optionalText,
  brand_id: optionalText,
  collection_id: optionalText,
  status: z.enum(["draft", "active", "archived"]),
  is_published: z.boolean(),
  case_mm: optionalNumber,
  case_material: optionalText,
  bezel: optionalText,
  dial: optionalText,
  movement: z.enum(["automatic", "manual", "quartz", "solar", "spring_drive", ""]).transform((v) => v || null),
  calibre: optionalText,
  power_reserve_h: optionalNumber,
  water_resistance_m: optionalNumber,
  strap: z.enum(["bracelet", "leather", "rubber", "fabric", "other", ""]).transform((v) => v || null),
  strap_detail: optionalText,
  gender: z.enum(["men", "women", "unisex", ""]).transform((v) => v || null),
  cost_price: requiredNumber,
  price: requiredNumber,
  compare_at_price: optionalNumber,
  warranty_months: requiredNumber,
  images: z.string().transform((v) => v.split(/\s+/).map((s) => s.trim()).filter(Boolean)),
});

export interface ProductFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export async function saveProductAction(id: string | null, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await getCurrentUser();
  if (!user || !["owner", "admin", "manager"].includes(user.role)) return { error: "Only managers and above can edit watches." };

  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse({ ...raw, is_published: formData.get("is_published") === "on" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors, values: raw };
  }

  let savedId: string;
  try {
    savedId = await saveProduct(id, parsed.data as ProductInput);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the watch.", values: raw };
  }
  revalidatePath("/watches");
  revalidatePath("/dashboard");
  redirect(`/watches/${savedId}`);
}
