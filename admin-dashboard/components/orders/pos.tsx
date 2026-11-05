"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { createSaleAction } from "@/app/(admin)/orders/actions";
import type { FormState } from "@/lib/form";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { channels, paymentMethods } from "@/lib/labels";
import type { Branch, PaymentMethod, StockRow } from "@/lib/types";
import { cn } from "@/lib/cn";

interface ClientOption { id: string; full_name: string; phone: string | null; email: string | null }
interface Line { stock_item_id: string; unit_price: number; discount: number }
interface Pay { method: PaymentMethod; amount: string; reference: string }

const n = (v: string | number) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function PointOfSale({
  stock, branches, clients, taxRate, defaults,
}: {
  stock: StockRow[];
  branches: Branch[];
  clients: ClientOption[];
  taxRate: number;
  defaults: { branch: string; items: string[]; customer: string | null };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSaleAction, {});
  const [branch, setBranch] = useState(defaults.branch);
  const [channel, setChannel] = useState("store");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>(() =>
    defaults.items.map((id) => stock.find((s) => s.id === id)).filter(Boolean).map((s) => ({ stock_item_id: s!.id, unit_price: s!.price, discount: 0 })),
  );
  const [clientMode, setClientMode] = useState<"existing" | "new" | "walkin">(defaults.customer ? "existing" : "existing");
  const [customerId, setCustomerId] = useState<string | null>(defaults.customer);
  const [clientQuery, setClientQuery] = useState("");
  const [newClient, setNewClient] = useState({ full_name: "", phone: "", email: "" });
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [payments, setPayments] = useState<Pay[]>([{ method: "card", amount: "", reference: "" }]);
  const [notes, setNotes] = useState("");

  const byId = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock]);
  const inCart = new Set(lines.map((l) => l.stock_item_id));
  const results = stock
    .filter((s) => s.branch_id === branch && !inCart.has(s.id))
    .filter((s) => !query || [s.serial_number, s.product_name, s.ref_number].some((f) => f.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 8);

  const subtotal = lines.reduce((t, l) => t + n(l.unit_price), 0);
  const lineDiscounts = lines.reduce((t, l) => t + n(l.discount), 0);
  const taxable = subtotal - lineDiscounts - n(orderDiscount);
  const tax = Math.round(taxable * taxRate) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  const paid = payments.reduce((t, p) => t + n(p.amount), 0);
  const balance = Math.round((total - paid) * 100) / 100;
  const customer = clients.find((c) => c.id === customerId);
  const clientResults = clientQuery
    ? clients.filter((c) => [c.full_name, c.phone, c.email].some((f) => f?.toLowerCase().includes(clientQuery.toLowerCase()))).slice(0, 6)
    : [];

  const otherBranchLines = lines.filter((l) => byId.get(l.stock_item_id)?.branch_id !== branch);

  const sale = JSON.stringify({
    branch_id: branch,
    customer_id: clientMode === "existing" ? customerId : null,
    new_customer: clientMode === "new" ? newClient : null,
    channel,
    order_discount: n(orderDiscount),
    notes,
    items: lines.map((l) => ({ ...l, unit_price: n(l.unit_price), discount: n(l.discount) })),
    payments: payments.filter((p) => n(p.amount) > 0).map((p) => ({ ...p, amount: n(p.amount) })),
  });

  const setLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.stock_item_id === id ? { ...l, ...patch } : l)));
  const setPay = (i: number, patch: Partial<Pay>) => setPayments((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
      <input type="hidden" name="sale" value={sale} />
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Branch">
              <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Sold via">
              <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {channels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Watches" subtitle="Search the branch's stock by serial, model or reference" />
          <div className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                aria-label="Search stock"
                placeholder="Scan or type a serial number…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (results.length === 1) {
                      setLines((ls) => [...ls, { stock_item_id: results[0].id, unit_price: results[0].price, discount: 0 }]);
                      setQuery("");
                    }
                  }
                }}
              />
            </div>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No available watches match in this branch.</li>}
              {results.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.product_name} <span className="font-normal text-muted">· {s.ref_number}</span></p>
                    <p className="font-mono text-xs text-muted">{s.serial_number}{s.location_note && ` · ${s.location_note}`}</p>
                  </div>
                  {s.status === "reserved" && <Badge tone="accent">Reserved</Badge>}
                  <span className="w-20 text-right">{money(s.price)}</span>
                  <Button type="button" variant="secondary" className="h-8 px-2.5" onClick={() => setLines((ls) => [...ls, { stock_item_id: s.id, unit_price: s.price, discount: 0 }])}>
                    <Plus className="size-4" /> Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border">
            {lines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">No watches in this sale yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lines.map((l) => {
                  const s = byId.get(l.stock_item_id)!;
                  return (
                    <li key={l.stock_item_id} className="grid gap-3 px-5 py-3 text-sm sm:grid-cols-[1fr_7rem_7rem_2rem] sm:items-center">
                      <div>
                        <p className="font-medium">{s.product_name}</p>
                        <p className="font-mono text-xs text-muted">{s.serial_number} · {s.branch_name}</p>
                      </div>
                      <label className="text-xs text-muted">Price
                        <Input inputMode="decimal" value={l.unit_price} onChange={(e) => setLine(l.stock_item_id, { unit_price: e.target.value as unknown as number })} />
                      </label>
                      <label className="text-xs text-muted">Discount
                        <Input inputMode="decimal" value={l.discount} onChange={(e) => setLine(l.stock_item_id, { discount: e.target.value as unknown as number })} />
                      </label>
                      <button type="button" aria-label={`Remove ${s.serial_number}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" onClick={() => setLines((ls) => ls.filter((x) => x.stock_item_id !== l.stock_item_id))}>
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {otherBranchLines.length > 0 && (
              <p className="mx-5 mb-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                {otherBranchLines.length} watch{otherBranchLines.length > 1 ? "es are" : " is"} in another branch. Transfer it first or switch the branch.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Client" />
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1 text-xs">
              {([["existing", "Existing", Users], ["new", "New", UserPlus], ["walkin", "Walk-in", X]] as const).map(([mode, label, Icon]) => (
                <button key={mode} type="button" onClick={() => setClientMode(mode)} aria-pressed={clientMode === mode}
                  className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5", clientMode === mode ? "bg-surface font-medium shadow-sm" : "text-muted")}>
                  <Icon className="size-3.5" aria-hidden />{label}
                </button>
              ))}
            </div>
            {clientMode === "existing" && (
              customer ? (
                <div className="flex items-start justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-xs text-muted">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" className="text-xs text-accent-strong" onClick={() => setCustomerId(null)}>Change</button>
                </div>
              ) : (
                <>
                  <Input aria-label="Search clients" placeholder="Name, phone or email" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
                  <ul className="mt-2 space-y-1">
                    {clientResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => { setCustomerId(c.id); setClientQuery(""); }}>
                          {c.full_name} <span className="text-xs text-muted">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            )}
            {clientMode === "new" && (
              <div className="space-y-3">
                <Field label="Full name"><Input value={newClient.full_name} onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })} /></Field>
                <Field label="Phone"><Input type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></Field>
              </div>
            )}
            {clientMode === "walkin" && <p className="text-sm text-muted">No client record. The warranty card will not be linked to a person.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment" />
          <div className="space-y-3 p-5">
            {payments.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex gap-2">
                  <Select aria-label="Payment method" value={p.method} onChange={(e) => setPay(i, { method: e.target.value as PaymentMethod })}>
                    {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                  {payments.length > 1 && (
                    <button type="button" aria-label="Remove payment" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:text-danger" onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}>
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input aria-label="Amount" inputMode="decimal" placeholder="Amount" value={p.amount} onChange={(e) => setPay(i, { amount: e.target.value })} />
                  <Button type="button" variant="secondary" className="shrink-0" onClick={() => setPay(i, { amount: String(Math.max(0, n(p.amount) + balance)) })}>Balance</Button>
                </div>
                <Input aria-label="Reference" placeholder="Reference (card slip, transaction ID)" value={p.reference} onChange={(e) => setPay(i, { reference: e.target.value })} />
              </div>
            ))}
            <Button type="button" variant="ghost" className="w-full" onClick={() => setPayments((ps) => [...ps, { method: "cash", amount: "", reference: "" }])}>
              <Plus className="size-4" /> Split payment
            </Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-2 p-5 text-sm">
            <Row label="Subtotal" value={money(subtotal)} />
            {lineDiscounts > 0 && <Row label="Line discounts" value={`− ${money(lineDiscounts)}`} />}
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="order-discount" className="text-muted">Order discount</label>
              <Input id="order-discount" inputMode="decimal" className="h-8 w-28 text-right" value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} />
            </div>
            {taxRate > 0 && <Row label={`Tax (${taxRate}%)`} value={money(tax)} />}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{money(total)}</span></div>
            <Row label="Paid now" value={money(paid)} />
            <Row label={balance >= 0 ? "Balance due" : "Overpaid"} value={money(Math.abs(balance))} strong={balance !== 0} />
            <Field label="Notes" className="pt-2"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Engraving, delivery, gift wrap…" /></Field>
          </div>
        </Card>

        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={pending || lines.length === 0 || balance < 0 || otherBranchLines.length > 0 || (clientMode === "new" && !newClient.full_name.trim())}>
          {pending ? "Completing…" : balance > 0 && paid > 0 ? `Take deposit of ${money(paid)}` : `Complete sale · ${money(total)}`}
        </Button>
        {balance > 0 && <p className="text-center text-xs text-muted">The order stays open until the balance is paid.</p>}
      </div>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{value}</span>
    </div>
  );
}
