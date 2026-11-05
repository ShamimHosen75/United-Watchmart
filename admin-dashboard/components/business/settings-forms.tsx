"use client";

import { useActionState } from "react";
import {
  changePasswordAction, deleteCatalogueAction, saveCatalogueAction, saveNotificationsAction, saveProfileAction, saveStoreAction,
} from "@/app/(admin)/settings/actions";
import type { FormState } from "@/lib/form";
import { CURRENCY } from "@/lib/format";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Profile, StoreSettings } from "@/lib/types";

export const Msg = ({ state }: { state: FormState }) =>
  state.error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>
  : state.ok ? <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success sm:col-span-2">{state.ok}</p> : null;

export function ProfileForm({ me }: { me: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileAction, {});
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Full name" error={state.fieldErrors?.full_name}><Input name="full_name" required defaultValue={state.values?.full_name ?? me.full_name} /></Field>
      <Field label="Phone"><Input name="phone" type="tel" defaultValue={state.values?.phone ?? me.phone ?? ""} /></Field>
      <Msg state={state} />
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button></div>
    </form>
  );
}

export function PasswordForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
        <Field label="New password" hint="At least 10 characters"><Input name="password" type="password" autoComplete="new-password" required /></Field>
        <Field label="Repeat it"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
        <Msg state={state} />
        <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Change password"}</Button></div>
      </fieldset>
    </form>
  );
}

export function StoreForm({ s, readOnly }: { s: StoreSettings; readOnly: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStoreAction, {});
  const v = (k: keyof StoreSettings) => state.values?.[k] ?? (s[k] == null ? "" : String(s[k]));
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <fieldset disabled={readOnly} className="contents">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Business details</h3>
        <Field label="Store name" hint="Shown on invoices, tickets and messages" error={err("store_name")}><Input name="store_name" required defaultValue={v("store_name")} /></Field>
        <Field label="Legal name"><Input name="legal_name" defaultValue={v("legal_name")} /></Field>
        <Field label="Phone"><Input name="phone" type="tel" defaultValue={v("phone")} /></Field>
        <Field label="Email" error={err("email")}><Input name="email" type="email" defaultValue={v("email")} /></Field>
        <Field label="Head office address" className="sm:col-span-2"><Input name="address" defaultValue={v("address")} /></Field>
        <Field label="Website" error={err("website_url")}><Input name="website_url" placeholder="https://" defaultValue={v("website_url")} /></Field>
        <Field label="WhatsApp business number"><Input name="whatsapp_number" type="tel" defaultValue={v("whatsapp_number")} /></Field>

        <h3 className="mt-2 text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Sales and stock</h3>
        <Field label="Currency" hint="Set with NEXT_PUBLIC_CURRENCY when deploying"><Input value={CURRENCY} readOnly disabled /></Field>
        <Field label="Tax / VAT rate (%)" hint="Added on top of prices at the point of sale" error={err("tax_rate")}><Input name="tax_rate" inputMode="decimal" defaultValue={v("tax_rate")} /></Field>
        <Field label="Default warranty (months)" hint="Pre-filled on new watches" error={err("default_warranty_months")}><Input name="default_warranty_months" inputMode="numeric" defaultValue={v("default_warranty_months")} /></Field>
        <Field label="Low stock alert at" hint="Dashboard flags models with this many pieces or fewer" error={err("low_stock_threshold")}><Input name="low_stock_threshold" inputMode="numeric" defaultValue={v("low_stock_threshold")} /></Field>

        <h3 className="mt-2 text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Invoice</h3>
        <Field label="Invoice footer" hint="Printed at the bottom of every invoice, e.g. return policy or bank details" className="sm:col-span-2"><Textarea name="invoice_footer" rows={3} defaultValue={v("invoice_footer")} /></Field>
        <Msg state={state} />
        {!readOnly && <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button></div>}
      </fieldset>
    </form>
  );
}

export function NotificationsForm({ s, readOnly, emailReady }: { s: StoreSettings; readOnly: boolean; emailReady: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveNotificationsAction, {});
  const n = s.notifications;
  const v = (k: keyof typeof n) => state.values?.[k] ?? String(n[k] ?? "");
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <fieldset disabled={readOnly} className="contents">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Email alerts</h3>
        <div className="sm:col-span-2">
          <Checkbox name="viewing_email" label="Email us when a viewing request arrives from the website" defaultChecked={state.values ? state.values.viewing_email === "on" : Boolean(n.viewing_email)} />
          {!emailReady && <p className="mt-1 text-xs text-muted">Needs email set up in Integrations. Until then requests still appear under Viewings.</p>}
        </div>
        <Field label="Send alerts to" error={state.fieldErrors?.notify_email} className="sm:col-span-2"><Input name="notify_email" type="email" placeholder="boutique@yourdomain.com" defaultValue={v("notify_email")} /></Field>

        <h3 className="mt-2 text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Repair messages to clients</h3>
        <p className="text-xs text-muted sm:col-span-2">Used by the WhatsApp and Email buttons on a repair. Leave blank for the built-in wording. You can use {"{first_name}"}, {"{watch}"}, {"{job}"}, {"{amount}"}, {"{branch}"} and {"{diagnosis}"}.</p>
        <Field label="Quote for approval" className="sm:col-span-2"><Textarea name="repair_quote_template" rows={3} defaultValue={v("repair_quote_template")} /></Field>
        <Field label="Ready to collect" className="sm:col-span-2"><Textarea name="repair_ready_template" rows={3} defaultValue={v("repair_ready_template")} /></Field>
        <Msg state={state} />
        {!readOnly && <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save notifications"}</Button></div>}
      </fieldset>
    </form>
  );
}

export function CatalogueAdd({ kind }: { kind: "brands" | "collections" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCatalogueAction.bind(null, kind, null), {});
  return (
    <form action={action} className="flex flex-wrap items-start gap-2 border-b border-border p-4">
      <label className="sr-only" htmlFor={`add-${kind}`}>New {kind === "brands" ? "brand" : "collection"}</label>
      <Input id={`add-${kind}`} name="name" placeholder={kind === "brands" ? "New brand, e.g. Longines" : "New collection, e.g. Dress"} className="min-w-48 flex-1" required />
      <Button type="submit" variant="secondary" disabled={pending}>Add</Button>
      {state.error && <p role="alert" className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}

export function CatalogueRow({ kind, id, name, used }: { kind: "brands" | "collections"; id: string; name: string; used: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCatalogueAction.bind(null, kind, id), {});
  const [delState, del, deleting] = useActionState<FormState>(deleteCatalogueAction.bind(null, kind, id), {});
  const err = state.error ?? delState.error;
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <form action={action} className="flex flex-1 items-center gap-2">
          <label className="sr-only" htmlFor={`n-${id}`}>Name</label>
          <Input id={`n-${id}`} name="name" defaultValue={name} className="h-8" />
          <Button type="submit" variant="ghost" className="h-8" disabled={pending}>Rename</Button>
        </form>
        <span className="w-20 shrink-0 text-right text-xs text-muted">{used} watch{used === 1 ? "" : "es"}</span>
        <form action={del}>
          <Button type="submit" variant="ghost" className="h-8 hover:text-danger" disabled={deleting || used > 0} title={used > 0 ? "In use by watches" : undefined}>Delete</Button>
        </form>
      </div>
      {err && <p role="alert" className="mt-1 text-xs text-danger">{err}</p>}
    </li>
  );
}
