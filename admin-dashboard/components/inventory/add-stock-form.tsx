"use client";

import { CURRENCY } from "@/lib/format";
import { useActionState } from "react";
import { addStockAction, type FormState } from "@/app/(admin)/inventory/actions";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Branch, Product } from "@/lib/types";

export function AddStockForm({ products, branches, defaults }: { products: Product[]; branches: Branch[]; defaults: { product?: string; branch?: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addStockAction, {});
  const v = (k: string, fallback = "") => state.values?.[k] ?? fallback;
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <Card className="max-w-3xl">
      {/* key resets the uncontrolled inputs after "Save and add another" */}
      <form key={state.ok ?? "form"} action={action} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Watch" error={err("product_id")} className="sm:col-span-2">
          <Select name="product_id" required defaultValue={v("product_id", defaults.product)}>
            <option value="">Choose a model…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ref_number}</option>)}
          </Select>
        </Field>
        <Field label="Serial number" error={err("serial_number")}>
          <Input name="serial_number" required autoFocus autoComplete="off" className="font-mono" defaultValue={v("serial_number")} />
        </Field>
        <Field label="Branch" error={err("branch_id")}>
          <Select name="branch_id" required defaultValue={v("branch_id", defaults.branch)}>
            <option value="">Choose a branch…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Condition">
          <Select name="condition" defaultValue={v("condition", "new")}>
            <option value="new">New</option>
            <option value="pre_owned">Pre-owned</option>
            <option value="display">Display piece</option>
          </Select>
        </Field>
        <Field label={`Cost price (${CURRENCY})`} hint="Leave empty to use the model's default cost" error={err("cost_price")}>
          <Input name="cost_price" inputMode="decimal" defaultValue={v("cost_price")} />
        </Field>
        <Field label="Location in store" hint="e.g. Showcase 3, Safe A">
          <Input name="location_note" defaultValue={v("location_note")} />
        </Field>
        <div className="flex items-end gap-6 pb-2">
          <Checkbox name="has_box" label="Box" defaultChecked={state.values ? state.values.has_box === "on" : true} />
          <Checkbox name="has_papers" label="Papers" defaultChecked={state.values ? state.values.has_papers === "on" : true} />
        </div>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" rows={2} defaultValue={v("notes")} />
        </Field>

        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
        {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success sm:col-span-2">{state.ok} Ready for the next one.</p>}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add to stock"}</Button>
          <Button type="submit" name="intent" value="another" variant="secondary" disabled={pending}>Save and add another</Button>
          <ButtonLink href="/inventory" variant="ghost">Cancel</ButtonLink>
        </div>
      </form>
    </Card>
  );
}
