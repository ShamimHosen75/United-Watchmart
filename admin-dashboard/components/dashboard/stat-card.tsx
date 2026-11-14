import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function StatCard({ label, value, sub, icon: Icon, href }: { label: string; value: string; sub?: React.ReactNode; icon: LucideIcon; href?: string }) {
  const body = (
    <div className="h-full rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <Icon className="size-4 text-accent" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
