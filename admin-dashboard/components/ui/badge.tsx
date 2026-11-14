import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent-strong",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  in_stock: "success", reserved: "accent", sold: "neutral", in_repair: "warning", in_transit: "info",
  returned: "info", written_off: "danger",
  active: "success", draft: "neutral", archived: "neutral",
  pending: "warning", balance_due: "warning", ordered: "info", partially_received: "accent", expired: "neutral", void: "danger", paid: "info", completed: "success", cancelled: "neutral", refunded: "danger",
  new: "accent", confirmed: "info", no_show: "danger",
  contacted: "info", recovered: "success", lost: "neutral", approved: "success", rejected: "danger", held: "warning",
  received: "neutral", diagnosing: "info", awaiting_approval: "warning", in_progress: "info", ready: "success", collected: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? "neutral"}>{titleCase(status)}</Badge>;
}
