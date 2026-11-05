"use client";

import { CURRENCY } from "@/lib/format";
import { useActionState, useState } from "react";
import { ShieldCheck, UserPlus, Users, Watch } from "lucide-react";
import { createRepairAction } from "@/app/(admin)/repairs/actions";
import type { FormState } from "@/lib/form";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { date } from "@/lib/format";

interface Client { id: string; full_name: string; phone: string | null; email: string | null }
export interface OwnedPick { customer_id: string; brand: string; model: string; serial: string; warranty_until: string; active: boolean }

export function IntakeForm({ clients, owned, branches, technicians, defaults }: {
  clients: Client[];
  owned: OwnedPick[];
  branches: { id: string; name: string }[];
  technicians: { id: string; full_name: string }[];
  defaults: { branch: string; customer: string | null; promised: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRepairAction, {});
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState<string | null>(defaults.customer);
  const [clientQuery, setClientQuery] = useState("");
  const [newClient, setNewClient] = useState({ full_name: "", phone: "", email: "" });
  const [f, setF] = useState({
    branch_id: defaults.branch, brand_text: "", model_text: "", serial_number: "", issue: "", intake_notes: "",
    estimate: "", promised_at: defaults.promised, technician_id: "", under_warranty: false,
  });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const customer = clients.find((c) => c.id === customerId);
  const ql = clientQuery.toLowerCase();
  const results = clientQuery
    ? clients.filter((c) => [c.full_name, c.phone, c.email].some((v) => v?.toLowerCase().includes(ql))).slice(0, 6)
    : [];
  const theirWatches = mode === "existing" && customerId ? owned.filter((o) => o.customer_id === customerId) : [];
  const serialMatch = f.serial_number.trim() && owned.find((o) => o.serial.toLowerCase() === f.serial_number.trim().toLowerCase() && o.active);

  const payload = JSON.stringify({
    customer_id: mode === "existing" ? customerId : null,
    new_customer: mode === "new" ? newClient : null,
    ...f,
    under_warranty: f.under_warranty || Boolean(serialMatch),
  });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      <input type="hidden" name="repair" value={payload} />
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="Watch" subtitle="What the client handed over" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {theirWatches.length > 0 && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-medium text-muted">Bought from us</p>
                <div className="flex flex-wrap gap-2">
                  {theirWatches.map((o) => (
                    <button key={o.serial} type="button" onClick={() => set({ brand_text: o.brand, model_text: o.model, serial_number: o.serial, under_warranty: o.active })}
                      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs hover:border-accent", f.serial_number === o.serial ? "border-accent bg-accent-soft" : "border-border")}>
                      <Watch className="size-4 text-muted" aria-hidden />
                      <span><span className="block font-medium">{o.brand} {o.model}</span><span className="font-mono text-muted">{o.serial}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field label="Brand"><Input value={f.brand_text} onChange={(e) => set({ brand_text: e.target.value })} placeholder="e.g. Omega" required /></Field>
            <Field label="Model"><Input value={f.model_text} onChange={(e) => set({ model_text: e.target.value })} placeholder="e.g. Seamaster 300M" required /></Field>
            <Field label="Serial number" hint={serialMatch ? undefined : "Optional, but needed to check the warranty"} className="sm:col-span-2">
              <Input value={f.serial_number} onChange={(e) => set({ serial_number: e.target.value })} className="font-mono" />
              {serialMatch && (
                <span className="mt-1 flex items-center gap-1 text-xs text-success"><ShieldCheck className="size-3.5" />Our warranty is active until {date(serialMatch.warranty_until)}. This job will be marked as a warranty repair.</span>
              )}
            </Field>
            <Field label="What the client reports" className="sm:col-span-2"><Textarea rows={3} value={f.issue} onChange={(e) => set({ issue: e.target.value })} placeholder="e.g. Loses 30 seconds a day, crown feels loose" required /></Field>
            <Field label="Condition at intake" hint="Scratches, strap wear, missing parts. Protects you if the client disputes it later." className="sm:col-span-2">
              <Textarea rows={2} value={f.intake_notes} onChange={(e) => set({ intake_notes: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Job" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Branch"><Select value={f.branch_id} onChange={(e) => set({ branch_id: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="Technician"><Select value={f.technician_id} onChange={(e) => set({ technician_id: e.target.value })}><option value="">Assign later</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</Select></Field>
            <Field label={`Estimate (${CURRENCY})`} hint="What you quoted the client. Leave blank until diagnosed."><Input inputMode="decimal" value={f.estimate} onChange={(e) => set({ estimate: e.target.value })} /></Field>
            <Field label="Promised by"><Input type="date" value={f.promised_at} onChange={(e) => set({ promised_at: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Checkbox label="Warranty repair (no charge to the client)" checked={f.under_warranty || Boolean(serialMatch)} disabled={Boolean(serialMatch)} onChange={(e) => set({ under_warranty: e.target.checked })} /></div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Client" />
          <div className="p-5">
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-xs">
              {([["existing", "Existing", Users], ["new", "New", UserPlus]] as const).map(([m, label, Icon]) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                  className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5", mode === m ? "bg-surface font-medium shadow-sm" : "text-muted")}>
                  <Icon className="size-3.5" aria-hidden />{label}
                </button>
              ))}
            </div>
            {mode === "existing" ? (
              customer ? (
                <div className="flex items-start justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-xs text-muted">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" className="text-xs text-accent-strong" onClick={() => setCustomerId(null)}>Change</button>
                </div>
              ) : (
                <>
                  <Input aria-label="Search clients" placeholder="Name, phone or email" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
                  <ul className="mt-2 space-y-1">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => { setCustomerId(c.id); setClientQuery(""); }}>
                          {c.full_name} <span className="text-xs text-muted">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : (
              <div className="space-y-3">
                <Field label="Full name"><Input value={newClient.full_name} onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })} /></Field>
                <Field label="Phone"><Input type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></Field>
              </div>
            )}
          </div>
        </Card>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">{pending ? "Logging…" : "Log repair"}</Button>
          <ButtonLink href="/repairs" variant="ghost">Cancel</ButtonLink>
        </div>
      </div>
    </form>
  );
}
