"use client";

import { useActionState } from "react";
import { reserveAction } from "@/app/(admin)/viewings/actions";
import type { FormState } from "@/lib/form";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { StockRow } from "@/lib/types";

export function ReserveForm({ viewingId, options, current }: { viewingId: string; options: StockRow[]; current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reserveAction.bind(null, viewingId), {});
  return (
    <form action={action} className="space-y-3 p-5">
      <Select name="stock_item_id" defaultValue={current ?? ""} aria-label="Watch to reserve">
        <option value="">No watch reserved</option>
        {options.map((s) => <option key={s.id} value={s.id}>{s.serial_number} · {s.branch_name}{s.location_note ? ` · ${s.location_note}` : ""}</option>)}
      </Select>
      {options.length === 0 && !current && <p className="text-xs text-muted">No piece of this model is in stock. Transfer one or order it in.</p>}
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{state.ok}</p>}
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save reservation"}</Button>
    </form>
  );
}
