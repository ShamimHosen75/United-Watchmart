import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getBranchScope, getCurrentUser, inScope, listBranches, listStaff, matchesQuery } from "./index";
import { listWarranties } from "./clients";
import type { Customer, PaymentMethod, Repair, RepairEvent, RepairStatus } from "@/lib/types";

export const OPEN_STATUSES: RepairStatus[] = ["received", "diagnosing", "awaiting_approval", "in_progress", "ready"];

export interface RepairRow extends Repair {
  customer_name: string;
  customer_phone: string | null;
  branch_name: string;
  technician_name: string | null;
  overdue: boolean;
}

export interface RepairDetail extends RepairRow {
  customer: Customer | null;
  events: (RepairEvent & { by: string | null })[];
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const normRepair = (r: Repair): Repair => ({ ...r, estimate: num(r.estimate), final_cost: num(r.final_cost), paid_amount: Number(r.paid_amount ?? 0) });

async function rows(): Promise<RepairRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  let repairs: Repair[];
  let customers: Pick<Customer, "id" | "full_name" | "phone">[];
  if (isDemoMode) {
    repairs = demo.repairs;
    customers = demo.customers;
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("repairs").select("*, customers(id, full_name, phone)").order("received_at", { ascending: false }).limit(1000);
    if (error) throw error;
    type J = Repair & { customers: Pick<Customer, "id" | "full_name" | "phone"> };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    repairs = (data as J[]).map(({ customers: _c, ...r }) => normRepair(r));
    customers = (data as J[]).map((r) => r.customers);
  }
  const [branches, staff] = await Promise.all([listBranches(), listStaff()]);
  return repairs.map((r) => {
    const c = customers.find((x) => x.id === r.customer_id);
    return {
      ...r,
      customer_name: c?.full_name ?? "",
      customer_phone: c?.phone ?? null,
      branch_name: branches.find((b) => b.id === r.branch_id)?.name ?? "",
      technician_name: staff.find((s) => s.id === r.technician_id)?.full_name ?? null,
      overdue: OPEN_STATUSES.includes(r.status) && r.status !== "ready" && !!r.promised_at && r.promised_at < today,
    };
  });
}

export async function listRepairs(filters: { q?: string; status?: RepairStatus | "" | "open"; technician?: string } = {}): Promise<RepairRow[]> {
  const scope = await getBranchScope();
  return (await rows())
    .filter((r) => inScope(scope, r.branch_id))
    .filter((r) => !filters.technician || r.technician_id === filters.technician)
    .filter((r) => !filters.status ? true : filters.status === "open" ? OPEN_STATUSES.includes(r.status) : r.status === filters.status)
    .filter((r) => matchesQuery(filters.q, r.number, r.customer_name, r.customer_phone, r.brand_text, r.model_text, r.serial_number))
    .sort((a, b) => (a.promised_at ?? "9").localeCompare(b.promised_at ?? "9"));
}

export async function getRepair(id: string): Promise<RepairDetail | null> {
  const row = (await rows()).find((r) => r.id === id);
  if (!row) return null;
  const staff = await listStaff();
  let events: RepairEvent[];
  let customer: Customer | null;
  if (isDemoMode) {
    events = demo.repairEvents.filter((e) => e.repair_id === id);
    customer = demo.customers.find((c) => c.id === row.customer_id) ?? null;
  } else {
    const supabase = await createClient();
    const [e, c] = await Promise.all([
      supabase.from("repair_events").select("*").eq("repair_id", id).order("created_at"),
      supabase.from("customers").select("*").eq("id", row.customer_id).maybeSingle(),
    ]);
    if (e.error) throw e.error;
    events = e.data as RepairEvent[];
    customer = c.data as Customer | null;
  }
  return {
    ...row,
    customer,
    events: events
      .map((e) => ({ ...e, by: staff.find((s) => s.id === e.created_by)?.full_name ?? null }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** Looks up an active warranty for a serial (to flag warranty repairs at intake). */
export async function findWarrantyBySerial(serial: string) {
  if (!serial.trim()) return null;
  const list = await listWarranties({ q: serial.trim() });
  return list.find((w) => w.serial_number.toLowerCase() === serial.trim().toLowerCase() && w.state === "active") ?? null;
}

export interface RepairInput {
  customer_id: string | null;
  new_customer: { full_name: string; phone: string; email: string } | null;
  branch_id: string;
  brand_text: string;
  model_text: string;
  serial_number: string | null;
  issue: string;
  intake_notes: string | null;
  estimate: number | null;
  promised_at: string | null;
  technician_id: string | null;
  under_warranty: boolean;
}

export async function createRepair(input: RepairInput): Promise<string> {
  const { saveCustomer } = await import("./clients");
  let customerId = input.customer_id;
  if (!customerId) {
    if (!input.new_customer?.full_name) throw new Error("Pick or add the client.");
    customerId = await saveCustomer(null, {
      full_name: input.new_customer.full_name, phone: input.new_customer.phone || null, email: input.new_customer.email || null,
      address: null, city: null, country: null, birthday: null, wrist_size_mm: null, preferred_branch_id: input.branch_id,
      is_vip: false, marketing_opt_in: false, tags: [], notes: null,
    });
  }
  const warranty = input.serial_number ? await findWarrantyBySerial(input.serial_number) : null;
  const record = {
    customer_id: customerId, branch_id: input.branch_id, stock_item_id: warranty?.stock_item_id ?? null,
    brand_text: input.brand_text, model_text: input.model_text, serial_number: input.serial_number, issue: input.issue,
    intake_notes: input.intake_notes, estimate: input.estimate, promised_at: input.promised_at, technician_id: input.technician_id,
    under_warranty: input.under_warranty || Boolean(warranty), status: "received" as const,
  };
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("repairs").insert(record).select("id").single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  demo.counters.repair += 1;
  demo.repairs.push({
    ...record, id, number: `SRV-${String(demo.counters.repair).padStart(6, "0")}`, diagnosis: null, final_cost: null,
    paid_amount: 0, payment_method: null, received_at: now, approved_at: null, completed_at: null, collected_at: null,
  });
  const user = await getCurrentUser();
  demo.repairEvents.push({ id: crypto.randomUUID(), repair_id: id, kind: "status", from_status: null, to_status: "received", note: "Watch received", created_by: user?.id ?? null, created_at: now });
  return id;
}

export type RepairPatch = Partial<Pick<Repair, "diagnosis" | "estimate" | "final_cost" | "technician_id" | "promised_at" | "intake_notes" | "issue" | "under_warranty">>;

export async function updateRepair(id: string, patch: RepairPatch & { status?: RepairStatus; paid_amount?: number; payment_method?: PaymentMethod | null }): Promise<void> {
  if (!isDemoMode) {
    const supabase = await createClient();
    const { error } = await supabase.from("repairs").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const r = demo.repairs.find((x) => x.id === id);
  if (!r) throw new Error("Repair not found.");
  const before = r.status;
  Object.assign(r, patch);
  if (patch.status && patch.status !== before) {
    const now = new Date().toISOString();
    const user = await getCurrentUser();
    demo.repairEvents.push({ id: crypto.randomUUID(), repair_id: id, kind: "status", from_status: before, to_status: patch.status, note: null, created_by: user?.id ?? null, created_at: now });
    if (before === "awaiting_approval" && patch.status === "in_progress") r.approved_at ??= now;
    if (patch.status === "ready") r.completed_at ??= now;
    if (patch.status === "collected") r.collected_at ??= now;
  }
}

export async function addRepairNote(id: string, note: string): Promise<void> {
  const user = await getCurrentUser();
  if (!isDemoMode) {
    const supabase = await createClient();
    const { error } = await supabase.from("repair_events").insert({ repair_id: id, kind: "note", note, created_by: user?.id ?? null });
    if (error) throw new Error(error.message);
    return;
  }
  demo.repairEvents.push({ id: crypto.randomUUID(), repair_id: id, kind: "note", from_status: null, to_status: null, note, created_by: user?.id ?? null, created_at: new Date().toISOString() });
}

/** Workshop numbers for the dashboard and board. */
export async function workshopStats() {
  const list = await listRepairs({ status: "open" });
  return {
    open: list.length,
    overdue: list.filter((r) => r.overdue).length,
    ready: list.filter((r) => r.status === "ready").length,
    awaiting: list.filter((r) => r.status === "awaiting_approval").length,
  };
}
