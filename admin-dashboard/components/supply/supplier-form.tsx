"use client";

import { useActionState } from "react";
import { saveSupplierAction } from "@/app/(admin)/suppliers/actions";
import type { FormState } from "@/lib/form";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Supplier } from "@/lib/types";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSupplierAction.bind(null, supplier?.id ?? null), {});
  const v = (k: keyof Supplier) => state.values?.[k] ?? (supplier?.[k] == null ? "" : String(supplier[k]));
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Company name" error={err("name")} className="sm:col-span-2"><Input name="name" required defaultValue={v("name")} /></Field>
        <Field label="Contact person"><Input name="contact_name" defaultValue={v("contact_name")} /></Field>
        <Field label="Email" error={err("email")}><Input name="email" type="email" defaultValue={v("email")} /></Field>
        <Field label="Phone"><Input name="phone" type="tel" defaultValue={v("phone")} /></Field>
        <Field label="Country"><Input name="country" defaultValue={v("country")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input name="address" defaultValue={v("address")} /></Field>
        <Field label="Payment terms" hint="e.g. Net 30, 50% deposit" className="sm:col-span-2"><Input name="payment_terms" defaultValue={v("payment_terms")} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={v("notes")} /></Field>
        <Checkbox name="is_active" label="Active supplier" defaultChecked={state.values ? state.values.is_active === "on" : supplier?.is_active ?? true} />
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : supplier ? "Save changes" : "Add supplier"}</Button>
          <ButtonLink href={supplier ? `/suppliers/${supplier.id}` : "/suppliers"} variant="ghost">Cancel</ButtonLink>
        </div>
      </form>
    </Card>
  );
}
