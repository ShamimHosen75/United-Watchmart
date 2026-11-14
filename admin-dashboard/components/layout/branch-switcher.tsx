"use client";

import { useRef } from "react";
import { Building2 } from "lucide-react";
import { setBranchScope } from "@/app/actions";
import type { Branch } from "@/lib/types";

export function BranchSwitcher({ branches, value }: { branches: Branch[]; value: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setBranchScope} className="relative">
      <Building2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <label className="sr-only" htmlFor="branch-scope">Branch</label>
      <select
        id="branch-scope"
        name="branch"
        defaultValue={value}
        onChange={() => form.current?.requestSubmit()}
        className="h-9 rounded-lg border border-border bg-surface pr-8 pl-9 text-sm focus:border-accent focus:outline-none"
      >
        <option value="all">All branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </form>
  );
}
