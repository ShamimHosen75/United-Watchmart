"use client";

import { useActionState } from "react";
import { updateStockAction, type FormState } from "@/app/(admin)/inventory/actions";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Branch, StockRow } from "@/lib/types";

const statuses = [
  ["in_stock", "In stock"], ["reserved", "Reserved for a client"], ["in_repair", "In repair"], ["in_transit", "In transit"],
  ["returned", "Returned"], ["written_off", "Written off"], ["sold", "Sold"],
] as const;

export function UpdateStockForm({ item, branches }: { item: StockRow; branches: Branch[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateStockAction.bind(null, item.id), {});
  return (
    <form action={action} className="space-y-4 p-5">
      <Field label="Status">
        <Select name="status" defaultValue={item.status}>
          {statuses.map(([value, label]) => (
            <option key={value} value={value} disabled={value === "sold" && item.status !== "sold"}>{label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Branch">
        <Select name="branch_id" defaultValue={item.branch_id}>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Location in store"><Input name="location_note" defaultValue={item.location_note ?? ""} /></Field>
      <Field label="Notes"><Textarea name="notes" rows={2} defaultValue={item.notes ?? ""} /></Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
