import { Check, Minus } from "lucide-react";
import type { FieldDef } from "@/lib/resources";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { date, money, relative } from "@/lib/format";

export type Lookups = Record<string, Map<string, string>>;

/** Shows one stored value in a table cell or detail list. */
export function Value({ field, value, lookups }: { field: FieldDef | { name: string; type: "created" }; value: unknown; lookups?: Lookups }) {
  if (field.type === "created") return <span className="text-muted" title={String(value ?? "")}>{value ? relative(String(value)) : "—"}</span>;
  if (field.type === "checkbox") return value ? <Check className="size-4 text-success" aria-label="Yes" /> : <Minus className="size-4 text-muted" aria-label="No" />;
  if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
  switch (field.type) {
    case "money": return <>{money(Number(value))}</>;
    case "date": return <>{date(String(value))}</>;
    case "tags": {
      const list = value as string[];
      return <span className="text-muted">{list.slice(0, 3).join(", ")}{list.length > 3 && ` +${list.length - 3}`}</span>;
    }
    case "relation": return <>{lookups?.[field.name]?.get(String(value)) ?? <span className="text-muted">Removed</span>}</>;
    case "select": {
      if (field.name === "rating") return <span className="text-accent" aria-label={`${value} stars`}>{"★".repeat(Number(value))}<span className="text-border">{"★".repeat(5 - Number(value))}</span></span>;
      if (field.name === "status") return <StatusBadge status={String(value)} />;
      return <Badge>{field.options?.find((o) => o.value === String(value))?.label ?? String(value)}</Badge>;
    }
    default: return <>{String(value)}</>;
  }
}
