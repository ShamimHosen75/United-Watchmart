import type { OrderStatus } from "@/lib/db/schema";

/** Small building blocks for the admin pages (English only). */

export { formatCents as money } from "@/lib/format";

export const dateTime = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

const tone: Record<OrderStatus, string> = {
  pending: "border-muted/40 text-muted",
  paid: "border-gold bg-gold/15 text-gold-light",
  shipped: "border-sky-300/50 text-sky-200",
  delivered: "border-emerald-300/50 text-emerald-200",
  canceled: "border-muted/30 text-muted/80",
  expired: "border-muted/30 text-muted/80",
  refunded: "border-rose-300/50 text-rose-200",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`label inline-block border px-2 py-0.5 text-[11px] ${tone[status]}`}>{status}</span>;
}

export function AttentionBadge() {
  return <span className="label inline-block bg-[#f2a7a0] px-2 py-0.5 text-[11px] text-bg">Check</span>;
}

export const inputClass =
  "mt-1 block min-h-11 w-full border border-gold/30 bg-bg px-3 text-ivory placeholder:text-muted/60 focus:border-gold focus:outline-none";

export const buttonClass =
  "label inline-flex min-h-11 items-center justify-center bg-gold px-5 text-bg transition-colors hover:bg-gold-light";

export const ghostButtonClass =
  "label inline-flex min-h-11 items-center justify-center border border-gold/40 px-5 text-ivory transition-colors hover:border-gold";

export function Flash({ kind, text }: { kind: "ok" | "error"; text: string }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`mb-6 border p-3 ${kind === "error" ? "border-[#f2a7a0]/60 text-[#f2a7a0]" : "border-gold/50 text-gold-light"}`}
    >
      {text}
    </p>
  );
}
