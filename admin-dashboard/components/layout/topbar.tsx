import { Search } from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import type { Branch, Profile } from "@/lib/types";

export function Topbar({ branches, scope }: { user?: Profile; branches: Branch[]; scope: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/90 pr-4 pl-16 backdrop-blur lg:px-8">
      <form action="/inventory" className="relative hidden max-w-sm flex-1 md:block" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="global-search" className="sr-only">Search by serial, reference or model</label>
        <input
          id="global-search"
          name="q"
          placeholder="Search serial, ref or model…"
          className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm focus:border-accent focus:outline-none"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <BranchSwitcher branches={branches} value={scope} />
      </div>
    </header>
  );
}
