"use client";

import { useActionState } from "react";
import { receiveAction } from "@/app/(admin)/purchases/actions";
import type { FormState } from "@/lib/form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

interface Line { id: string; product_name: string; ref_number: string; quantity: number; received_qty: number }

export function ReceiveForm({ purchaseId, lines }: { purchaseId: string; lines: Line[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(receiveAction.bind(null, purchaseId), {});
  const open = lines.filter((l) => l.received_qty < l.quantity);
  return (
    <form action={action} key={state.ok} className="space-y-4 p-5">
      {open.map((l) => (
        <Field key={l.id} label={`${l.product_name} · ${l.ref_number} (${l.quantity - l.received_qty} to receive)`} hint="One serial per line, or scan them in one after another">
          <Textarea name={`serials:${l.id}`} rows={Math.min(4, l.quantity - l.received_qty)} className="font-mono" />
        </Field>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Condition">
          <Select name="condition" defaultValue="new">
            <option value="new">New</option>
            <option value="pre_owned">Pre-owned</option>
          </Select>
        </Field>
        <Field label="Location in store"><Input name="location_note" placeholder="e.g. Safe A" /></Field>
      </div>
      <div className="flex gap-6">
        <Checkbox name="has_box" label="Box" defaultChecked />
        <Checkbox name="has_papers" label="Papers" defaultChecked />
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Receiving…" : "Receive into stock"}</Button>
    </form>
  );
}
