"use client";

import { useActionState } from "react";
import { addPaymentAction, refundOrderAction } from "@/app/(admin)/orders/actions";
import type { FormState } from "@/lib/form";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { paymentMethods } from "@/lib/labels";

export function AddPaymentForm({ orderId, balance }: { orderId: string; balance: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPaymentAction.bind(null, orderId), {});
  return (
    <form action={action} className="space-y-3 p-5" key={state.ok}>
      <Field label="Method">
        <Select name="method" defaultValue="card">{paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>
      </Field>
      <Field label="Amount"><Input name="amount" inputMode="decimal" defaultValue={balance} required /></Field>
      <Field label="Reference"><Input name="reference" /></Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Record payment"}</Button>
    </form>
  );
}

export function RefundForm({ orderId, hasPayments }: { orderId: string; hasPayments: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(refundOrderAction.bind(null, orderId), {});
  if (state.ok) return <p role="status" className="m-5 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>;
  return (
    <form action={action} className="space-y-3 p-5">
      <p className="text-xs text-muted">
        {hasPayments ? "Refund the order" : "Cancel the order"}: the watches go back in stock and their warranty cards are voided.
        {hasPayments && " Return the money to the client yourself; this records it."}
      </p>
      <Field label="Reason"><Input name="reason" placeholder="e.g. Client changed their mind" /></Field>
      <Checkbox name="confirm" label="I understand this cannot be undone" />
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="danger" className="w-full" disabled={pending}>{pending ? "Working…" : hasPayments ? "Refund order" : "Cancel order"}</Button>
    </form>
  );
}
