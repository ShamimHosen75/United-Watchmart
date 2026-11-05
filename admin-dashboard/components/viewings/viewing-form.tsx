"use client";

import { useActionState } from "react";
import { saveViewingAction } from "@/app/(admin)/viewings/actions";
import type { FormState } from "@/lib/form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Branch, Product, Profile, ViewingRequest } from "@/lib/types";

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function ViewingForm({ viewing, products, branches, staff }: { viewing?: ViewingRequest; products: Product[]; branches: Branch[]; staff: Profile[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveViewingAction.bind(null, viewing?.id ?? null), {});
  const v = (k: keyof ViewingRequest, fallback = "") => state.values?.[k] ?? (viewing?.[k] == null ? fallback : String(viewing[k]));
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Client name" error={err("name")} className="sm:col-span-2"><Input name="name" required defaultValue={v("name")} /></Field>
      <Field label="Email" error={err("email")}><Input name="email" type="email" defaultValue={v("email")} /></Field>
      <Field label="Phone"><Input name="phone" type="tel" defaultValue={v("phone")} /></Field>
      <Field label="Watch">
        <Select name="product_id" defaultValue={v("product_id")}>
          <option value="">Any / not sure</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ref_number}</option>)}
        </Select>
      </Field>
      <Field label="Branch">
        <Select name="branch_id" defaultValue={v("branch_id")}>
          <option value="">Not set</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Date and time" error={err("preferred_at")}>
        <Input name="preferred_at" type="datetime-local" defaultValue={state.values?.preferred_at ?? toLocal(viewing?.preferred_at ?? null)} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={v("status", "new")}>
          <option value="new">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="no_show">No show</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
      <Field label="Host">
        <Select name="assigned_to" defaultValue={v("assigned_to")}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </Select>
      </Field>
      <Field label="Came from">
        <Select name="source" defaultValue={v("source", "phone")}>
          <option value="website">Website</option>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="walk_in">Walk-in</option>
          <option value="instagram">Instagram / Facebook</option>
        </Select>
      </Field>
      <Field label="Client's message" className="sm:col-span-2"><Textarea name="message" rows={2} defaultValue={v("message")} /></Field>
      <Field label="Staff notes" className="sm:col-span-2"><Textarea name="staff_notes" rows={2} defaultValue={v("staff_notes")} placeholder="Only visible to staff" /></Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success sm:col-span-2">{state.ok}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : viewing ? "Save" : "Book viewing"}</Button></div>
    </form>
  );
}
