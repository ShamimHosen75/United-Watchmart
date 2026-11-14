import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { demo } from "./demo-store";
import { getCurrentUser, listBrands, listCollections } from "./index";
import type { Branch, Campaign, CampaignSegment, Customer, Profile, StaffInvite, StaffRole, StoreSettings } from "@/lib/types";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

/* ------------------------------------------------------------------ */
/* Store settings                                                      */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<StoreSettings> {
  if (isDemoMode) return demo.settings;
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  const s = data as StoreSettings;
  return { ...s, tax_rate: Number(s.tax_rate), notifications: s.notifications ?? {} };
}

export async function saveSettings(patch: Partial<StoreSettings>): Promise<void> {
  if (isDemoMode) {
    Object.assign(demo.settings, patch, patch.notifications ? { notifications: { ...demo.settings.notifications, ...patch.notifications } } : {});
    return;
  }
  const supabase = await createClient();
  let body: Record<string, unknown> = { ...patch };
  if (patch.notifications) body = { ...body, notifications: { ...(await getSettings()).notifications, ...patch.notifications } };
  const { error } = await supabase.from("store_settings").update(body).eq("id", 1);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

export type BranchInput = Omit<Branch, "id">;

export async function saveBranch(id: string | null, input: BranchInput): Promise<string> {
  if (isDemoMode) {
    if (demo.branches.some((b) => b.code.toLowerCase() === input.code.toLowerCase() && b.id !== id)) throw new Error("Another branch already uses that code.");
    if (id) {
      const b = demo.branches.find((x) => x.id === id);
      if (!b) throw new Error("Branch not found.");
      Object.assign(b, input);
      return id;
    }
    const newId = crypto.randomUUID();
    demo.branches.push({ id: newId, ...input });
    return newId;
  }
  const supabase = await createClient();
  const q = id ? supabase.from("branches").update(input).eq("id", id).select("id").single() : supabase.from("branches").insert(input).select("id").single();
  const { data, error } = await q;
  if (error) throw new Error(error.code === "23505" ? "Another branch already uses that code." : error.message);
  return (data as { id: string }).id;
}

/** Counts used on the Branches page. */
export async function branchCounts(): Promise<Record<string, { stock: number; staff: number }>> {
  const out: Record<string, { stock: number; staff: number }> = {};
  let stock: { branch_id: string }[];
  let staff: { branch_id: string | null }[];
  if (isDemoMode) {
    stock = demo.stock.filter((s) => ["in_stock", "reserved", "in_repair"].includes(s.status));
    staff = demo.staff.filter((s) => s.is_active);
  } else {
    const supabase = await createClient();
    const [a, b] = await Promise.all([
      supabase.from("stock_items").select("branch_id").in("status", ["in_stock", "reserved", "in_repair"]),
      supabase.from("profiles").select("branch_id").eq("is_active", true),
    ]);
    stock = (a.data ?? []) as typeof stock;
    staff = (b.data ?? []) as typeof staff;
  }
  for (const s of stock) (out[s.branch_id] ??= { stock: 0, staff: 0 }).stock++;
  for (const s of staff) if (s.branch_id) (out[s.branch_id] ??= { stock: 0, staff: 0 }).staff++;
  return out;
}

/* ------------------------------------------------------------------ */
/* Users and invites                                                   */
/* ------------------------------------------------------------------ */

export async function listAllStaff(): Promise<Profile[]> {
  if (isDemoMode) return [...demo.staff].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data as Profile[];
}

export async function updateStaff(id: string, patch: { role: StaffRole; branch_id: string | null; is_active: boolean }): Promise<void> {
  const me = await getCurrentUser();
  if (!me) throw new Error("Sign in again.");
  const all = await listAllStaff();
  const target = all.find((s) => s.id === id);
  if (!target) throw new Error("Staff member not found.");
  if (id === me.id && (patch.role !== me.role || !patch.is_active)) throw new Error("You can't change your own role or deactivate yourself.");
  if ((target.role === "owner" || patch.role === "owner") && me.role !== "owner") throw new Error("Only an owner can make or change an owner.");
  const ownersAfter = all.filter((s) => (s.id === id ? patch.role === "owner" && patch.is_active : s.role === "owner" && s.is_active)).length;
  if (ownersAfter === 0) throw new Error("Keep at least one active owner.");
  if (isDemoMode) {
    Object.assign(target, patch);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listInvites(): Promise<StaffInvite[]> {
  if (isDemoMode) return demo.invites;
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff_invites").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as StaffInvite[];
}

/** Saves the invite; sends Supabase's invite email when the service role key is set. Returns whether an email went out. */
export async function createInvite(input: { email: string; full_name: string; role: StaffRole; branch_id: string | null }, redirectTo: string): Promise<boolean> {
  const me = await getCurrentUser();
  if (input.role === "owner" && me?.role !== "owner") throw new Error("Only an owner can invite another owner.");
  const email = input.email.toLowerCase();
  if ((await listAllStaff()).some((s) => s.email?.toLowerCase() === email)) throw new Error("That person already has an account. Change their role below.");
  if (isDemoMode) {
    demo.invites = demo.invites.filter((i) => i.email !== email);
    demo.invites.unshift({ ...input, email, created_at: new Date().toISOString(), accepted_at: null });
    return false;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("staff_invites").upsert({ ...input, email, invited_by: me?.id ?? null, accepted_at: null });
  if (error) throw new Error(error.message);
  if (!hasServiceRole) return false;
  const admin = createAdminClient();
  const { error: e2 } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: input.full_name }, redirectTo });
  if (e2) throw new Error(`Invite saved, but the email could not be sent: ${e2.message}`);
  return true;
}

export async function deleteInvite(email: string): Promise<void> {
  if (isDemoMode) {
    demo.invites = demo.invites.filter((i) => i.email !== email);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("staff_invites").delete().eq("email", email);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Account (the signed-in user)                                        */
/* ------------------------------------------------------------------ */

export async function updateOwnProfile(input: { full_name: string; phone: string | null }): Promise<void> {
  const me = await getCurrentUser();
  if (!me) throw new Error("Sign in again.");
  if (isDemoMode) {
    Object.assign(demo.staff.find((s) => s.id === me.id)!, input);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(input).eq("id", me.id);
  if (error) throw new Error(error.message);
}

export async function changePassword(password: string): Promise<void> {
  if (isDemoMode) throw new Error("Passwords can't be changed in demo mode.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Catalogue: brands and collections                                   */
/* ------------------------------------------------------------------ */

type CatalogueKind = "brands" | "collections";

export async function catalogueUsage(): Promise<{ brands: Record<string, number>; collections: Record<string, number> }> {
  let products: { brand_id: string | null; collection_id: string | null }[];
  if (isDemoMode) products = demo.products;
  else {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("brand_id, collection_id");
    products = (data ?? []) as typeof products;
  }
  const brands: Record<string, number> = {};
  const collections: Record<string, number> = {};
  for (const p of products) {
    if (p.brand_id) brands[p.brand_id] = (brands[p.brand_id] ?? 0) + 1;
    if (p.collection_id) collections[p.collection_id] = (collections[p.collection_id] ?? 0) + 1;
  }
  return { brands, collections };
}

export async function saveCatalogueEntry(kind: CatalogueKind, id: string | null, name: string): Promise<void> {
  const slug = slugify(name);
  const list = kind === "brands" ? await listBrands() : await listCollections();
  if (list.some((x) => x.id !== id && (x.name.toLowerCase() === name.toLowerCase() || x.slug === slug))) throw new Error(`"${name}" already exists.`);
  if (isDemoMode) {
    const arr = demo[kind];
    if (id) Object.assign(arr.find((x) => x.id === id)!, { name, slug });
    else arr.push({ id: crypto.randomUUID(), name, slug });
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return;
  }
  const supabase = await createClient();
  const { error } = id ? await supabase.from(kind).update({ name, slug }).eq("id", id) : await supabase.from(kind).insert({ name, slug });
  if (error) throw new Error(error.message);
}

export async function deleteCatalogueEntry(kind: CatalogueKind, id: string): Promise<void> {
  if (isDemoMode) {
    const used = demo.products.some((p) => (kind === "brands" ? p.brand_id : p.collection_id) === id);
    if (used) throw new Error("Still used by watches in the catalogue");
    demo[kind] = demo[kind].filter((x) => x.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) throw new Error(error.message.includes("Still used") ? "Still used by watches in the catalogue" : error.message);
}

/* ------------------------------------------------------------------ */
/* Marketing campaigns                                                 */
/* ------------------------------------------------------------------ */

export async function listCampaigns(): Promise<Campaign[]> {
  if (isDemoMode) return [...demo.campaigns].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  return (await listCampaigns()).find((c) => c.id === id) ?? null;
}

export type CampaignInput = Pick<Campaign, "name" | "channel" | "subject" | "message" | "segment">;

export async function saveCampaign(id: string | null, input: CampaignInput): Promise<string> {
  if (isDemoMode) {
    if (id) {
      const c = demo.campaigns.find((x) => x.id === id);
      if (!c || c.status === "sent") throw new Error("A sent campaign can't be changed.");
      Object.assign(c, input);
      return id;
    }
    const newId = crypto.randomUUID();
    demo.campaigns.push({ ...input, id: newId, status: "draft", recipients: 0, sent_at: null, created_at: new Date().toISOString() });
    return newId;
  }
  const supabase = await createClient();
  const me = await getCurrentUser();
  const { data, error } = id
    ? await supabase.from("campaigns").update(input).eq("id", id).eq("status", "draft").select("id").single()
    : await supabase.from("campaigns").insert({ ...input, created_by: me?.id ?? null }).select("id").single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function deleteCampaign(id: string): Promise<void> {
  if (isDemoMode) {
    demo.campaigns = demo.campaigns.filter((c) => c.id !== id || c.status === "sent");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error(error.message);
}

export async function markCampaignSent(id: string, recipients: number): Promise<void> {
  const patch = { status: "sent" as const, recipients, sent_at: new Date().toISOString() };
  if (isDemoMode) {
    Object.assign(demo.campaigns.find((c) => c.id === id)!, patch);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type Recipient = Pick<Customer, "id" | "full_name" | "email" | "phone">;

/** Clients who opted in to marketing and match the segment, with a usable email or phone for the channel. */
export async function segmentRecipients(segment: CampaignSegment, channel: Campaign["channel"]): Promise<Recipient[]> {
  let customers: Customer[];
  let buyers: Set<string> | null = null;
  if (isDemoMode) {
    customers = demo.customers;
    if (segment.brand_id) {
      const productIds = new Set(demo.products.filter((p) => p.brand_id === segment.brand_id).map((p) => p.id));
      const orderIds = new Set(demo.orderItems.filter((i) => productIds.has(i.product_id)).map((i) => i.order_id));
      buyers = new Set(demo.orders.filter((o) => orderIds.has(o.id) && o.customer_id && o.status !== "refunded" && o.status !== "cancelled").map((o) => o.customer_id!));
    }
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("customers").select("*").eq("marketing_opt_in", true).limit(10000);
    if (error) throw error;
    customers = data as Customer[];
    if (segment.brand_id) {
      const { data: rows } = await supabase
        .from("order_items")
        .select("orders!inner(customer_id, status), products!inner(brand_id)")
        .eq("products.brand_id", segment.brand_id)
        .not("orders.status", "in", "(refunded,cancelled)");
      type R = { orders: { customer_id: string | null } };
      buyers = new Set(((rows ?? []) as unknown as R[]).map((r) => r.orders.customer_id).filter(Boolean) as string[]);
    }
  }
  const month = new Date().getMonth() + 1;
  return customers
    .filter((c) => c.marketing_opt_in)
    .filter((c) => (channel === "email" ? Boolean(c.email) : Boolean(c.phone)))
    .filter((c) => !segment.vip || c.is_vip)
    .filter((c) => !segment.tag || c.tags.some((t) => t.toLowerCase() === segment.tag!.toLowerCase()))
    .filter((c) => !segment.birthday_month || (c.birthday && Number(c.birthday.slice(5, 7)) === month))
    .filter((c) => !segment.branch_id || c.preferred_branch_id === segment.branch_id)
    .filter((c) => !buyers || buyers.has(c.id))
    .map(({ id, full_name, email, phone }) => ({ id, full_name, email, phone }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

/** Fills {first_name} and {name} in a campaign message. */
export const personalise = (text: string, name: string) =>
  text.replaceAll("{first_name}", name.split(" ")[0] ?? name).replaceAll("{name}", name);
