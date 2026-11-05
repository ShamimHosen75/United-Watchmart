"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { savePurchaseAction } from "@/app/(admin)/purchases/actions";
import type { FormState } from "@/lib/form";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { money } from "@/lib/format";
import type { Branch, Product, Purchase, PurchaseItem, Supplier } from "@/lib/types";

interface Line { product_id: string; quantity: string; unit_cost: string }

export function PurchaseForm({ purchase, items, suppliers, branches, products, defaults }: {
  purchase?: Purchase; items?: PurchaseItem[]; suppliers: Supplier[]; branches: Branch[]; products: Product[];
  defaults: { supplier?: string; branch?: string; product?: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePurchaseAction, {});
  const [head, setHead] = useState({
    supplier_id: purchase?.supplier_id ?? defaults.supplier ?? "",
    branch_id: purchase?.branch_id ?? defaults.branch ?? branches[0]?.id ?? "",
    ordered_at: purchase?.ordered_at ?? "",
    expected_at: purchase?.expected_at ?? "",
    shipping_cost: String(purchase?.shipping_cost ?? 0),
    notes: purchase?.notes ?? "",
  });
  const costOf = (id: string) => String(products.find((p) => p.id === id)?.cost_price ?? "");
  const [lines, setLines] = useState<Line[]>(
    items?.length ? items.map((i) => ({ product_id: i.product_id, quantity: String(i.quantity), unit_cost: String(i.unit_cost) }))
      : [{ product_id: defaults.product ?? "", quantity: "1", unit_cost: defaults.product ? costOf(defaults.product) : "" }],
  );
  const [status, setStatus] = useState<"draft" | "ordered">("draft");
  const goods = lines.reduce((t, l) => t + Number(l.quantity || 0) * Number(l.unit_cost || 0), 0);
  const total = goods + Number(head.shipping_cost || 0);
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const payload = JSON.stringify({ id: purchase?.id ?? null, ...head, status, items: lines });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      <input type="hidden" name="purchase" value={payload} />
      <Card className="lg:col-span-2">
        <CardHeader title="Watches to order" />
        <div className="space-y-3 p-5">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6rem_8rem_2rem] sm:items-end">
              <Field label="Watch">
                <Select value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value, unit_cost: l.unit_cost || costOf(e.target.value) })}>
                  <option value="">Choose…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ref_number}</option>)}
                </Select>
              </Field>
              <Field label="Qty"><Input inputMode="numeric" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></Field>
              <Field label="Unit cost"><Input inputMode="decimal" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} /></Field>
              <button type="button" aria-label="Remove line" disabled={lines.length === 1} className="grid size-9 place-items-center rounded-lg text-muted hover:text-danger disabled:opacity-30" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setLines((ls) => [...ls, { product_id: "", quantity: "1", unit_cost: "" }])}><Plus className="size-4" />Add line</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <div className="space-y-4 p-5">
            <Field label="Supplier">
              <Select value={head.supplier_id} onChange={(e) => setHead({ ...head, supplier_id: e.target.value })} required>
                <option value="">Choose…</option>
                {suppliers.filter((s) => s.is_active || s.id === head.supplier_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Deliver to">
              <Select value={head.branch_id} onChange={(e) => setHead({ ...head, branch_id: e.target.value })}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Order date"><Input type="date" value={head.ordered_at} onChange={(e) => setHead({ ...head, ordered_at: e.target.value })} /></Field>
              <Field label="Expected"><Input type="date" value={head.expected_at} onChange={(e) => setHead({ ...head, expected_at: e.target.value })} /></Field>
            </div>
            <Field label="Shipping, duty and insurance" hint="Spread over the watches by cost to get the landed cost">
              <Input inputMode="decimal" value={head.shipping_cost} onChange={(e) => setHead({ ...head, shipping_cost: e.target.value })} />
            </Field>
            <Field label="Notes"><Textarea rows={2} value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} /></Field>
            <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Watches</dt><dd>{money(goods)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(Number(head.shipping_cost || 0))}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
          </div>
        </Card>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" onClick={() => setStatus("ordered")} disabled={pending}>{purchase?.status === "ordered" ? "Save order" : "Place order"}</Button>
          {(!purchase || purchase.status === "draft") && <Button type="submit" variant="secondary" onClick={() => setStatus("draft")} disabled={pending}>Save draft</Button>}
          <ButtonLink href={purchase ? `/purchases/${purchase.id}` : "/purchases"} variant="ghost">Cancel</ButtonLink>
        </div>
      </div>
    </form>
  );
}
