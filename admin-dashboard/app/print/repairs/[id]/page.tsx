import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listBranches } from "@/lib/data";
import { getRepair } from "@/lib/data/service";
import { getSettings } from "@/lib/data/business";
import { PrintButton } from "@/components/orders/print-button";
import { date, money, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Repair ticket" };

export default async function RepairTicketPage({ params }: PageProps<"/print/repairs/[id]">) {
  const { id } = await params;
  const [r, branches, settings] = await Promise.all([getRepair(id), listBranches(), getSettings()]);
  if (!r) notFound();
  const branch = branches.find((b) => b.id === r.branch_id);
  const watch = `${r.brand_text ?? ""} ${r.model_text ?? ""}`.trim();
  const label = "mb-1 text-xs tracking-[0.12em] text-black/50 uppercase";

  return (
    <div className="mx-auto max-w-3xl p-8 text-sm print:p-0">
      <div className="mb-8 flex justify-end gap-2 print:hidden"><PrintButton /></div>

      <header className="flex items-start justify-between border-b border-black/10 pb-6">
        <div>
          <p className="font-serif text-3xl">{settings.store_name}</p>
          <p className="mt-1 text-black/60">{branch?.name}{branch?.address && `, ${branch.address}`}{branch?.city && `, ${branch.city}`}</p>
          {branch?.phone && <p className="text-black/60">{branch.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs tracking-[0.12em] text-black/50 uppercase">Repair ticket</p>
          <p className="text-lg font-semibold">{r.number}</p>
          <p className="text-black/60">Received {date(r.received_at)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className={label}>Client</p>
          <p className="font-medium">{r.customer_name}</p>
          {r.customer_phone && <p>{r.customer_phone}</p>}
          {r.customer?.email && <p>{r.customer.email}</p>}
        </div>
        <div className="text-right">
          <p className={label}>Promised by</p>
          <p className="font-medium">{date(r.promised_at)}</p>
          <p className="text-black/60">Status: {titleCase(r.status)}</p>
        </div>
      </section>

      <section className="space-y-4 border-y border-black/10 py-6">
        <div className="grid grid-cols-2 gap-6">
          <div><p className={label}>Watch</p><p className="font-medium">{watch}</p></div>
          <div><p className={label}>Serial</p><p className="font-mono">{r.serial_number ?? "Not recorded"}</p></div>
        </div>
        <div><p className={label}>Reported issue</p><p>{r.issue}</p></div>
        {r.intake_notes && <div><p className={label}>Condition at intake</p><p>{r.intake_notes}</p></div>}
        {r.diagnosis && <div><p className={label}>Diagnosis and work</p><p>{r.diagnosis}</p></div>}
      </section>

      <dl className="ml-auto max-w-xs space-y-1.5 py-6">
        {r.under_warranty ? (
          <div className="flex justify-between font-semibold"><dt>Warranty repair</dt><dd>No charge</dd></div>
        ) : (
          <>
            <div className="flex justify-between"><dt className="text-black/60">Estimate</dt><dd>{money(r.estimate)}</dd></div>
            {r.final_cost != null && <div className="flex justify-between font-semibold"><dt>Final cost</dt><dd>{money(r.final_cost)}</dd></div>}
            {r.paid_amount > 0 && <div className="flex justify-between"><dt className="text-black/60">Paid</dt><dd>{money(r.paid_amount)}</dd></div>}
          </>
        )}
      </dl>

      <p className="text-xs text-black/60">
        Please bring this ticket when collecting. We will contact you before any work beyond the estimate. Watches not collected within 90 days of
        the ready notice may incur a storage fee. Water resistance is tested after any case opening.
      </p>
      <div className="mt-12 grid grid-cols-2 gap-10 text-xs text-black/60">
        <p className="border-t border-black/30 pt-2">Client signature at drop-off</p>
        <p className="border-t border-black/30 pt-2">Client signature at collection</p>
      </div>

      <div className="mt-12 border-t-2 border-dashed border-black/30 pt-6">
        <p className={label}>Workshop tag · keep with the watch</p>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold">{r.number}</p>
          <p>{r.customer_name} · due {date(r.promised_at)}</p>
        </div>
        <p>{watch} · <span className="font-mono">{r.serial_number ?? "no serial"}</span>{r.under_warranty && " · WARRANTY"}</p>
        <p className="text-black/60">{r.issue}</p>
      </div>
    </div>
  );
}
