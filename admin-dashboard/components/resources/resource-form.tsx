"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecordAction, saveRecordAction } from "@/app/(admin)/[resource]/actions";
import type { FormState } from "@/lib/form";
import type { FieldDef, ResourceDef } from "@/lib/resources";
import type { ResourceRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Options = Record<string, { value: string; label: string }[]>;

function stored(field: FieldDef, record?: ResourceRecord): string {
  const v = record ? record[field.name] : field.default;
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function ImageInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [url, setUrl] = useState(defaultValue);
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="size-full object-contain" /> : <span className="text-[10px] text-muted">None</span>}
      </span>
      <Input name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or /images/…" />
    </div>
  );
}

function Control({ field, value, options }: { field: FieldDef; value: string; options: Options }) {
  switch (field.type) {
    case "textarea": return <Textarea name={field.name} rows={4} defaultValue={value} required={field.required} />;
    case "select":
      return <Select name={field.name} defaultValue={value}>{field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>;
    case "relation":
      return (
        <Select name={field.name} defaultValue={value} required={field.required}>
          <option value="">{field.required ? "Choose…" : "None"}</option>
          {(options[field.name] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    case "image": return <ImageInput name={field.name} defaultValue={value} />;
    case "number": return <Input name={field.name} type="number" min={0} step="any" defaultValue={value} />;
    case "money": return <Input name={field.name} type="number" min={0} step="0.01" defaultValue={value} />;
    case "date": return <Input name={field.name} type="date" defaultValue={value} />;
    case "email": return <Input name={field.name} type="email" defaultValue={value} />;
    case "url": return <Input name={field.name} type="url" defaultValue={value} placeholder="https://" />;
    default: return <Input name={field.name} defaultValue={value} required={field.required && field.type === "text" && !field.name.includes("slug")} className={field.upper ? "uppercase" : undefined} />;
  }
}

export function ResourceForm({ def, record, options, canEdit }: { def: ResourceDef; record?: ResourceRecord; options: Options; canEdit: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRecordAction.bind(null, def.key, record?.id ?? null), {});
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const value = (f: FieldDef) => state.values ? (f.type === "checkbox" ? (state.values[f.name] === "on" ? "on" : "") : state.values[f.name] ?? "") : stored(f, record);

  const boxes = def.fields.filter((f) => f.type === "checkbox");
  return (
    <Card className="max-w-3xl">
      <form action={action}>
        <fieldset disabled={!canEdit} className="grid gap-4 p-5 sm:grid-cols-2">
          {def.fields.filter((f) => f.type !== "checkbox").map((f) => (
            <Field key={f.name} label={f.required ? `${f.label} *` : f.label} hint={f.hint} error={state.fieldErrors?.[f.name]} className={cn(f.wide || f.type === "image" ? "sm:col-span-2" : undefined)}>
              <Control field={f} value={value(f)} options={options} />
            </Field>
          ))}
          {boxes.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
              {boxes.map((f) => {
                const checked = state.values ? state.values[f.name] === "on" : record ? Boolean(record[f.name]) : Boolean(f.default);
                return <Checkbox key={f.name} name={f.name} label={f.label} defaultChecked={checked} />;
              })}
            </div>
          )}
        </fieldset>
        {(state.error || deleteError) && <p role="alert" className="mx-5 mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error ?? deleteError}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
          {canEdit && <Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save changes" : `Add ${def.singular}`}</Button>}
          <ButtonLink href={`/${def.key}`} variant="ghost">{canEdit ? "Cancel" : "Back"}</ButtonLink>
          {record && canEdit && (
            <Button
              type="button"
              variant={confirming ? "danger" : "ghost"}
              className="ml-auto"
              disabled={deleting}
              onClick={() => {
                if (!confirming) { setConfirming(true); return; }
                startDelete(async () => {
                  const res = await deleteRecordAction(def.key, record.id);
                  if (res?.error) { setDeleteError(res.error); setConfirming(false); }
                });
              }}
            >
              <Trash2 className="size-4" />{confirming ? "Click again to delete" : "Delete"}
            </Button>
          )}
        </div>
        {!canEdit && <p className="px-5 pb-4 text-xs text-muted">Only a manager can change this.</p>}
      </form>
    </Card>
  );
}
