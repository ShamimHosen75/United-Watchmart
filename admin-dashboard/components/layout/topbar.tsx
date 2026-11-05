import { LogOut, Search } from "lucide-react";
import { signOut } from "@/app/actions";
import { BranchSwitcher } from "./branch-switcher";
import type { Branch, Profile } from "@/lib/types";
import { titleCase } from "@/lib/format";

export function Topbar({ user, branches, scope }: { user: Profile; branches: Branch[]; scope: string }) {
  const initials = user.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
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
        <div className="hidden items-center gap-2.5 sm:flex">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{initials}</span>
          <span className="leading-tight">
            <span className="block text-sm font-medium">{user.full_name || user.email}</span>
            <span className="block text-xs text-muted">{titleCase(user.role)}</span>
          </span>
        </div>
        <form action={signOut}>
          <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
