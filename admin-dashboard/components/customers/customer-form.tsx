"use client";

import { useActionState } from "react";
import { saveCustomerAction } from "@/app/(admin)/customers/actions";
import type { FormState } from "@/lib/form";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Branch, Customer } from "@/lib/types";

export function CustomerForm({ customer, branches }: { customer?: Customer; branches: Branch[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCustomerAction.bind(null, customer?.id ?? null), {});
  const v = (k: keyof Customer) => {
    if (state.values?.[k] !== undefined) return state.values[k];
    const val = customer?.[k];
    return Array.isArray(val) ? val.join(", ") : val == null ? "" : String(val);
  };
  const err = (k: string) => state.fieldErrors?.[k];
  const checked = (k: "is_vip" | "marketing_opt_in") => (state.values ? state.values[k] === "on" : customer?.[k] ?? false);

  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Full name" error={err("full_name")} className="sm:col-span-2"><Input name="full_name" required defaultValue={v("full_name")} /></Field>
        <Field label="Phone" error={err("phone")}><Input name="phone" type="tel" defaultValue={v("phone")} /></Field>
        <Field label="Email" error={err("email")}><Input name="email" type="email" defaultValue={v("email")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input name="address" defaultValue={v("address")} /></Field>
        <Field label="City"><Input name="city" defaultValue={v("city")} /></Field>
        <Field label="Country"><Input name="country" defaultValue={v("country")} /></Field>
        <Field label="Birthday" error={err("birthday")}><Input name="birthday" type="date" defaultValue={v("birthday")} /></Field>
        <Field label="Wrist size (mm)" error={err("wrist_size_mm")} hint="Helps size bracelets before a viewing"><Input name="wrist_size_mm" inputMode="numeric" defaultValue={v("wrist_size_mm")} /></Field>
        <Field label="Preferred branch">
          <Select name="preferred_branch_id" defaultValue={v("preferred_branch_id")}>
            <option value="">None</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Tags" hint="Comma separated, e.g. collector, gift buyer"><Input name="tags" defaultValue={v("tags")} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={v("notes")} placeholder="Tastes, collection, family occasions…" /></Field>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Checkbox name="is_vip" label="VIP client" defaultChecked={checked("is_vip")} />
          <Checkbox name="marketing_opt_in" label="Agreed to receive news and offers" defaultChecked={checked("marketing_opt_in")} />
        </div>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : customer ? "Save changes" : "Add client"}</Button>
          <ButtonLink href={customer ? `/customers/${customer.id}` : "/customers"} variant="ghost">Cancel</ButtonLink>
        </div>
      </form>
    </Card>
  );
}
