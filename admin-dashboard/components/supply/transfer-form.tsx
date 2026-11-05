"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createTransferAction } from "@/app/(admin)/transfers/actions";
import type { FormState } from "@/lib/form";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Branch, StockRow } from "@/lib/types";

export function TransferForm({ branches, stock, defaults }: { branches: Branch[]; stock: StockRow[]; defaults: { from?: string; items: string[] } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTransferAction, {});
  const [from, setFrom] = useState(defaults.from ?? branches[0]?.id ?? "");
  const [to, setTo] = useState(branches.find((b) => b.id !== (defaults.from ?? branches[0]?.id))?.id ?? "");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(defaults.items));
  const available = stock.filter((s) => s.branch_id === from && s.status === "in_stock");
  const shown = available.filter((s) => !q || [s.serial_number, s.product_name, s.ref_number].some((f) => f.toLowerCase().includes(q.toLowerCase())));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const count = available.filter((s) => picked.has(s.id)).length;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      <Card className="lg:col-span-2">
        <CardHeader title="Watches to send" subtitle="In stock at the sending branch" />
        <div className="p-5">
          <Input aria-label="Filter watches" placeholder="Filter by serial or model" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="mt-3 max-h-[28rem] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nothing in stock here.</li>}
            {shown.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2/50">
                  <input type="checkbox" name="items" value={s.id} checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="size-4 accent-[var(--accent)]" />
                  <span className="flex-1">{s.product_name} <span className="text-muted">· {s.ref_number}</span><span className="block font-mono text-xs text-muted">{s.serial_number}{s.location_note && ` · ${s.location_note}`}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <div className="space-y-6">
        <Card>
          <div className="space-y-4 p-5">
            <Field label="From">
              <Select name="from_branch_id" value={from} onChange={(e) => { setFrom(e.target.value); setPicked(new Set()); }}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <ArrowRight className="mx-auto size-4 rotate-90 text-muted" aria-hidden />
            <Field label="To">
              <Select name="to_branch_id" value={to} onChange={(e) => setTo(e.target.value)}>
                {branches.filter((b) => b.id !== from).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Notes"><Textarea name="notes" rows={2} placeholder="Courier, reason, client waiting…" /></Field>
          </div>
        </Card>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || count === 0 || !to}>{pending ? "Sending…" : `Send ${count} watch${count === 1 ? "" : "es"}`}</Button>
          <ButtonLink href="/transfers" variant="ghost">Cancel</ButtonLink>
        </div>
      </div>
    </form>
  );
}
