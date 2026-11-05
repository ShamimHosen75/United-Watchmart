"use client";

import { useActionState } from "react";
import { inviteAction, updateStaffAction } from "@/app/(admin)/users/actions";
import type { FormState } from "@/lib/form";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export function StaffRow({ person, branches, isSelf, canEditOwner }: { person: Profile; branches: { id: string; name: string }[]; isSelf: boolean; canEditOwner: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateStaffAction.bind(null, person.id), {});
  const locked = isSelf || (person.role === "owner" && !canEditOwner);
  return (
    <form action={action} className="grid items-center gap-3 px-5 py-3 text-sm md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
      <div className="min-w-0">
        <p className="truncate font-medium">{person.full_name || "No name yet"}{isSelf && <span className="text-muted"> (you)</span>}</p>
        <p className="truncate text-xs text-muted">{person.email}</p>
      </div>
      <Select name="role" defaultValue={person.role} aria-label={`Role for ${person.full_name}`} disabled={locked}>
        {ROLES.filter((r) => canEditOwner || r.value !== "owner" || person.role === "owner").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </Select>
      <Select name="branch_id" defaultValue={person.branch_id ?? ""} aria-label={`Home branch for ${person.full_name}`} disabled={locked}>
        <option value="">All branches</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={person.is_active} disabled={locked} className="size-4 accent-[var(--accent)]" />Active
      </label>
      <div className="flex items-center gap-2">
        {!locked && <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>}
        {state.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
        {state.ok && <span role="status" className="text-xs text-success">{state.ok}</span>}
      </div>
    </form>
  );
}

export function InviteForm({ branches, canInviteOwner }: { branches: { id: string; name: string }[]; canInviteOwner: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteAction, {});
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Email"><Input name="email" type="email" required defaultValue={state.values?.email} /></Field>
      <Field label="Full name"><Input name="full_name" required defaultValue={state.values?.full_name} /></Field>
      <Field label="Role">
        <Select name="role" defaultValue={state.values?.role ?? "sales"}>
          {ROLES.filter((r) => canInviteOwner || r.value !== "owner").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      </Field>
      <Field label="Home branch">
        <Select name="branch_id" defaultValue={state.values?.branch_id ?? ""}>
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success sm:col-span-2">{state.ok}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send invite"}</Button></div>
    </form>
  );
}
