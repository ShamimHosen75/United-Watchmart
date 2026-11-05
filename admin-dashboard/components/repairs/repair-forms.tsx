"use client";

import { CURRENCY } from "@/lib/format";
import { useActionState, useState } from "react";
import { addRepairNoteAction, collectRepairAction, updateRepairAction } from "@/app/(admin)/repairs/actions";
import type { FormState } from "@/lib/form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { paymentMethods } from "@/lib/labels";
import { money } from "@/lib/format";
import type { Repair } from "@/lib/types";

const Msg = ({ state }: { state: FormState }) =>
  state.error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>
  : state.ok ? <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success sm:col-span-2">{state.ok}</p> : null;

export function RepairDetailsForm({ repair, technicians, locked }: { repair: Repair; technicians: { id: string; full_name: string }[]; locked: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateRepairAction.bind(null, repair.id), {});
  const v = (k: keyof Repair) => state.values?.[k] ?? (repair[k] == null ? "" : String(repair[k]));
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <fieldset disabled={locked} className="contents">
        <Field label="Issue reported" error={err("issue")} className="sm:col-span-2"><Textarea name="issue" rows={2} defaultValue={v("issue")} /></Field>
        <Field label="Diagnosis and work done" hint="What the technician found and did. Shown on the client's ticket." className="sm:col-span-2"><Textarea name="diagnosis" rows={3} defaultValue={v("diagnosis")} /></Field>
        <Field label="Condition at intake" className="sm:col-span-2"><Textarea name="intake_notes" rows={2} defaultValue={v("intake_notes")} /></Field>
        <Field label={`Estimate (${CURRENCY})`} error={err("estimate")}><Input name="estimate" inputMode="decimal" defaultValue={v("estimate")} /></Field>
        <Field label={`Final cost (${CURRENCY})`} error={err("final_cost")} hint="Fill in when the work is done"><Input name="final_cost" inputMode="decimal" defaultValue={v("final_cost")} /></Field>
        <Field label="Technician"><Select name="technician_id" defaultValue={v("technician_id")}><option value="">Unassigned</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</Select></Field>
        <Field label="Promised by" error={err("promised_at")}><Input name="promised_at" type="date" defaultValue={v("promised_at")} /></Field>
        <div className="sm:col-span-2"><Checkbox name="under_warranty" label="Warranty repair (no charge)" defaultChecked={state.values ? state.values.under_warranty === "on" : repair.under_warranty} /></div>
        <Msg state={state} />
        {!locked && <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button></div>}
      </fieldset>
    </form>
  );
}

export function CollectForm({ repair }: { repair: Repair }) {
  const due = repair.under_warranty ? 0 : (repair.final_cost ?? repair.estimate ?? 0);
  const [state, action, pending] = useActionState<FormState, FormData>(collectRepairAction.bind(null, repair.id), {});
  const [amount, setAmount] = useState(due ? String(due) : "0");
  return (
    <form action={action} className="space-y-3 p-5">
      <p className="text-sm">Amount due: <span className="font-semibold">{repair.under_warranty ? "No charge (warranty)" : money(due)}</span></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Paid now (${CURRENCY})`}><Input name="paid_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Payment method"><Select name="payment_method" defaultValue="card" disabled={!Number(amount)}>{paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
      </div>
      {Number(amount) < due && <Checkbox name="allow_short" label="Collect with balance owing" />}
      <Msg state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Hand back to client"}</Button>
    </form>
  );
}

export function NoteForm({ repairId }: { repairId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addRepairNoteAction.bind(null, repairId), {});
  return (
    <form action={action} className="space-y-2 border-b border-border p-5">
      <label className="sr-only" htmlFor="repair-note">Note</label>
      <Textarea id="repair-note" name="note" rows={2} placeholder="Add a note, e.g. Called client, approved over phone" className="min-h-16" />
      {state.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Adding…" : "Add note"}</Button>
    </form>
  );
}
