"use client";

import { useActionState } from "react";
import { saveBranchAction } from "@/app/(admin)/branches/actions";
import type { FormState } from "@/lib/form";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Branch } from "@/lib/types";

export function BranchForm({ branch }: { branch?: Branch }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBranchAction.bind(null, branch?.id ?? null), {});
  const v = (k: keyof Branch) => state.values?.[k] ?? (branch?.[k] == null ? "" : String(branch[k]));
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Branch name" error={err("name")}><Input name="name" required defaultValue={v("name")} /></Field>
        <Field label="Short code" hint="Used on stock and reports, e.g. GUL" error={err("code")}><Input name="code" required defaultValue={v("code")} className="uppercase" /></Field>
        <Field label="Address" className="sm:col-span-2"><Input name="address" defaultValue={v("address")} /></Field>
        <Field label="City"><Input name="city" defaultValue={v("city")} /></Field>
        <Field label="Phone"><Input name="phone" type="tel" defaultValue={v("phone")} /></Field>
        <Field label="Email" error={err("email")}><Input name="email" type="email" defaultValue={v("email")} /></Field>
        <Field label="Opening hours" hint="e.g. Sat–Thu 11:00–21:00"><Input name="opening_hours" defaultValue={v("opening_hours")} /></Field>
        <div className="sm:col-span-2">
          <Checkbox name="is_active" label="Open (shows in pickers for sales, stock and repairs)" defaultChecked={state.values ? state.values.is_active === "on" : branch?.is_active ?? true} />
        </div>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : branch ? "Save changes" : "Add branch"}</Button>
          <ButtonLink href="/branches" variant="ghost">Cancel</ButtonLink>
        </div>
      </form>
    </Card>
  );
}
