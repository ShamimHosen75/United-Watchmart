"use client";

import { useActionState, useState } from "react";
import { saveCampaignAction, sendCampaignAction } from "@/app/(admin)/settings/actions";
import type { FormState } from "@/lib/form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Msg } from "./settings-forms";
import type { Campaign } from "@/lib/types";

export function CampaignForm({ campaign, branches, brands }: { campaign?: Campaign; branches: { id: string; name: string }[]; brands: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCampaignAction.bind(null, campaign?.id ?? null), {});
  const [channel, setChannel] = useState(state.values?.channel ?? campaign?.channel ?? "email");
  const seg = campaign?.segment ?? {};
  const v = (k: string, fallback: string) => state.values?.[k] ?? fallback;
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <Field label="Campaign name" hint="For your team only" error={err("name")}><Input name="name" required defaultValue={v("name", campaign?.name ?? "")} /></Field>
      <Field label="Channel">
        <Select name="channel" value={channel} onChange={(e) => setChannel(e.target.value as "email" | "whatsapp")}>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
      </Field>
      {channel === "email" && <Field label="Subject" error={err("subject")} className="sm:col-span-2"><Input name="subject" defaultValue={v("subject", campaign?.subject ?? "")} /></Field>}
      <Field label="Message" hint="Use {first_name} to greet each client by name" error={err("message")} className="sm:col-span-2">
        <Textarea name="message" rows={6} required defaultValue={v("message", campaign?.message ?? "")} />
      </Field>

      <h3 className="mt-2 text-xs font-semibold tracking-wide text-muted uppercase sm:col-span-2">Audience</h3>
      <p className="-mt-2 text-xs text-muted sm:col-span-2">Only clients who agreed to marketing are included. Leave everything blank to reach all of them.</p>
      <Field label="Preferred branch"><Select name="branch_id" defaultValue={v("branch_id", seg.branch_id ?? "")}><option value="">Any</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="Bought this brand"><Select name="brand_id" defaultValue={v("brand_id", seg.brand_id ?? "")}><option value="">Any</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="Tag" hint="e.g. collector"><Input name="tag" defaultValue={v("tag", seg.tag ?? "")} /></Field>
      <div className="flex flex-col justify-end gap-2 pb-1">
        <Checkbox name="vip" label="VIP clients only" defaultChecked={state.values ? state.values.vip === "on" : Boolean(seg.vip)} />
        <Checkbox name="birthday_month" label="Birthday this month" defaultChecked={state.values ? state.values.birthday_month === "on" : Boolean(seg.birthday_month)} />
      </div>
      <Msg state={state} />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : campaign ? "Save draft" : "Create draft"}</Button>
        <ButtonLink href={campaign ? `/settings/marketing/${campaign.id}` : "/settings/marketing"} variant="ghost">Cancel</ButtonLink>
      </div>
    </form>
  );
}

export function SendCampaign({ id, channel, count, ready }: { id: string; channel: "email" | "whatsapp"; count: number; ready: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendCampaignAction.bind(null, id), {});
  return (
    <form action={action} className="space-y-3 p-5">
      {channel === "email" ? (
        <p className="text-sm">{ready ? `Sends ${count} emails now through Resend. This can't be undone.` : "Email isn't set up yet, so nothing can be sent. See Integrations."}</p>
      ) : (
        <p className="text-sm">Send each message with the WhatsApp links below, then mark the campaign as sent so it&apos;s recorded.</p>
      )}
      <Checkbox name="confirm" label={channel === "email" ? `Yes, email ${count} clients` : "I've sent the messages"} disabled={channel === "email" && !ready} />
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>}
      <Button type="submit" disabled={pending || count === 0 || (channel === "email" && !ready)}>{pending ? "Working…" : channel === "email" ? "Send emails" : "Mark as sent"}</Button>
    </form>
  );
}
