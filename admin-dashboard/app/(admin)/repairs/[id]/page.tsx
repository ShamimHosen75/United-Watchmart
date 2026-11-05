import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check, Mail, MessageCircle, Printer, ShieldCheck } from "lucide-react";
import { listStaff } from "@/lib/data";
import { getRepair } from "@/lib/data/service";
import { getSettings } from "@/lib/data/business";
import { setRepairStatusAction } from "../actions";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CollectForm, NoteForm, RepairDetailsForm } from "@/components/repairs/repair-forms";
import { date, dateTime, money, titleCase } from "@/lib/format";
import { paymentLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { RepairStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Repair" };

const STEPS: { status: RepairStatus; label: string }[] = [
  { status: "received", label: "Received" },
  { status: "diagnosing", label: "Diagnosing" },
  { status: "awaiting_approval", label: "Client approval" },
  { status: "in_progress", label: "In progress" },
  { status: "ready", label: "Ready" },
  { status: "collected", label: "Collected" },
];

const ACTIONS: Record<RepairStatus, { to: RepairStatus; label: string; variant?: "secondary" | "ghost" }[]> = {
  received: [{ to: "diagnosing", label: "Start diagnosis" }],
  diagnosing: [{ to: "awaiting_approval", label: "Send quote for approval" }, { to: "in_progress", label: "Start work, no approval needed", variant: "secondary" }],
  awaiting_approval: [{ to: "in_progress", label: "Client approved, start work" }],
  in_progress: [{ to: "ready", label: "Mark ready to collect" }],
  ready: [{ to: "in_progress", label: "Reopen work", variant: "secondary" }],
  collected: [],
  cancelled: [{ to: "received", label: "Reopen job", variant: "secondary" }],
};

export default async function RepairPage({ params }: PageProps<"/repairs/[id]">) {
  const { id } = await params;
  const [r, staff, settings] = await Promise.all([getRepair(id), listStaff(), getSettings()]);
  if (!r) notFound();
  const technicians = staff.filter((s) => s.is_active && ["technician", "manager", "owner", "admin"].includes(s.role));
  const stepIndex = STEPS.findIndex((s) => s.status === r.status);
  const cancellable = ["received", "diagnosing", "awaiting_approval", "in_progress"].includes(r.status);
  const due = r.under_warranty ? 0 : (r.final_cost ?? r.estimate ?? 0);
  const watch = `${r.brand_text ?? ""} ${r.model_text ?? ""}`.trim();
  const first = r.customer_name.split(" ")[0];
  const store = settings.store_name;
  const fill = (t: string) => t.replaceAll("{first_name}", first).replaceAll("{watch}", watch).replaceAll("{job}", r.number)
    .replaceAll("{amount}", money(r.status === "ready" ? due - r.paid_amount : r.estimate)).replaceAll("{branch}", r.branch_name).replaceAll("{diagnosis}", r.diagnosis ?? "");
  const tpl = r.status === "awaiting_approval" ? settings.notifications.repair_quote_template : r.status === "ready" ? settings.notifications.repair_ready_template : "";
  const message = tpl ? fill(tpl)
    : r.status === "awaiting_approval" ? `Hello ${first}, this is ${store} about your ${watch} (job ${r.number}). ${r.diagnosis ? `Our technician found: ${r.diagnosis} ` : ""}The quote is ${money(r.estimate)}. Shall we go ahead?`
    : r.status === "ready" ? `Hello ${first}, good news: your ${watch} (job ${r.number}) is ready to collect from our ${r.branch_name}.${due ? ` The amount due is ${money(due - r.paid_amount)}.` : ""}`
    : `Hello ${first}, this is ${store} with an update on your ${watch} (job ${r.number}).`;
  const phone = r.customer_phone?.replace(/[^\d]/g, "");
  const email = r.customer?.email;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/repairs" className="text-muted hover:text-text">← Repairs</Link></p>
      <PageHeader
        title={`${r.number} · ${watch}`}
        description={`${r.branch_name} · received ${date(r.received_at)}`}
        actions={
          <>
            <StatusBadge status={r.status} />
            {r.under_warranty && <span className="inline-flex items-center gap-1 text-xs text-success"><ShieldCheck className="size-4" />Warranty</span>}
            <ButtonLink href={`/print/repairs/${r.id}`} variant="secondary" target="_blank"><Printer className="size-4" />Ticket</ButtonLink>
          </>
        }
      />

      {r.status !== "cancelled" && (
        <Card className="mb-6 px-5 py-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-xs" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s.status} className="flex items-center gap-2" aria-current={i === stepIndex ? "step" : undefined}>
                <span className={cn("grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                  i < stepIndex ? "border-success bg-success text-white" : i === stepIndex ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-muted")}>
                  {i < stepIndex ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={i === stepIndex ? "font-medium" : "text-muted"}>{s.label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
              </li>
            ))}
          </ol>
          {(ACTIONS[r.status].length > 0 || cancellable) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {ACTIONS[r.status].map((a) => (
                <form key={a.to} action={setRepairStatusAction.bind(null, r.id, a.to)}><Button variant={a.variant}>{a.label}</Button></form>
              ))}
              {cancellable && <form action={setRepairStatusAction.bind(null, r.id, "cancelled")} className="ml-auto"><Button variant="ghost">Cancel job</Button></form>}
            </div>
          )}
          {r.overdue && <p className="mt-3 flex items-center gap-1.5 text-sm text-danger"><AlertTriangle className="size-4" />Promised for {date(r.promised_at)}. Let the client know about the delay.</p>}
        </Card>
      )}
      {r.status === "cancelled" && (
        <Card className="mb-6 flex items-center justify-between px-5 py-4 text-sm">
          <span className="text-muted">This job was cancelled.</span>
          <form action={setRepairStatusAction.bind(null, r.id, "received")}><Button variant="secondary">Reopen job</Button></form>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          {r.status === "ready" && (
            <Card>
              <CardHeader title="Hand back to client" subtitle="Take payment and close the job" />
              <CollectForm repair={r} />
            </Card>
          )}
          <Card>
            <CardHeader title="Job details" subtitle={r.status === "collected" ? "Closed. Details are read-only." : undefined} />
            <RepairDetailsForm repair={r} technicians={technicians} locked={r.status === "collected"} />
          </Card>
          <Card>
            <CardHeader title="History and notes" />
            <NoteForm repairId={r.id} />
            <ol className="divide-y divide-border">
              {r.events.map((e) => (
                <li key={e.id} className="flex gap-3 px-5 py-3 text-sm">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", e.kind === "note" ? "bg-accent" : "bg-muted/50")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p>{e.kind === "note" ? e.note : e.from_status ? <>Moved to <span className="font-medium">{titleCase(e.to_status ?? "")}</span></> : (e.note ?? "Watch received")}</p>
                    <p className="text-xs text-muted">{dateTime(e.created_at)}{e.by && ` · ${e.by}`}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Client" action={r.customer && <Link href={`/customers/${r.customer_id}`} className="text-xs text-accent-strong hover:underline">Profile</Link>} />
            <div className="space-y-1 p-5 text-sm">
              <p className="font-medium">{r.customer_name}</p>
              {r.customer_phone && <p className="text-muted">{r.customer_phone}</p>}
              {email && <p className="text-muted">{email}</p>}
              <div className="flex flex-wrap gap-2 pt-3">
                {phone && <ButtonLink href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener" variant="secondary"><MessageCircle className="size-4" />WhatsApp</ButtonLink>}
                {email && <ButtonLink href={`mailto:${email}?subject=${encodeURIComponent(`Your ${watch} · ${r.number}`)}&body=${encodeURIComponent(message)}`} variant="secondary"><Mail className="size-4" />Email</ButtonLink>}
              </div>
              {(phone || email) && <p className="pt-2 text-xs text-muted">Opens a message written for the current step.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Summary" />
            <dl className="divide-y divide-border text-sm">
              {([
                ["Serial", r.serial_number ? <span key="s" className="font-mono text-xs">{r.serial_number}</span> : "—"],
                ["Technician", r.technician_name ?? "Unassigned"],
                ["Promised", date(r.promised_at)],
                ["Approved", date(r.approved_at)],
                ["Completed", date(r.completed_at)],
                ["Collected", date(r.collected_at)],
                ["Estimate", money(r.estimate)],
                ["Final cost", money(r.final_cost)],
                ["To pay", r.under_warranty ? "No charge" : money(due)],
                ["Paid", r.paid_amount ? `${money(r.paid_amount)}${r.payment_method ? ` · ${paymentLabel(r.payment_method)}` : ""}` : "—"],
              ] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
            {r.stock_item_id && <p className="border-t border-border px-5 py-3 text-xs"><Link href={`/inventory/${r.stock_item_id}`} className="text-accent-strong hover:underline">Sold by us · view stock record</Link></p>}
          </Card>
        </div>
      </div>
    </>
  );
}
