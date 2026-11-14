"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogOut, Menu, Store, X } from "lucide-react";
import { nav, activeHref } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/actions";
import { titleCase } from "@/lib/format";

export function Sidebar({ user, storeUrl }: { user: { full_name: string; email: string | null; role: string }; storeUrl: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = activeHref(pathname);
  const initials = user.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";

  const links = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {nav.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === current;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-sidebar-active font-medium text-white" : "text-sidebar-text hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-white" : "text-sidebar-muted")} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="size-4 text-white/80" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 border-b border-border px-5 py-5">
      <span className="font-serif text-[15px] tracking-[0.05em] whitespace-nowrap text-text uppercase">United WatchMart</span>
      <span className="rounded bg-text px-1.5 py-0.5 text-[10px] font-semibold text-white">Admin</span>
    </Link>
  );

  const footer = (
    <div className="border-t border-border px-3 pt-2 pb-3">
      {storeUrl && (
        <a href={storeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-text hover:bg-surface-2">
          <Store className="size-4 text-sidebar-muted" aria-hidden />Back to store
        </a>
      )}
      <form action={signOut}>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft">
          <LogOut className="size-4" aria-hidden />Log out
        </button>
      </form>
      <div className="mt-2 flex items-center gap-3 border-t border-border px-3 pt-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-text text-xs font-semibold text-white">{initials}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium">{user.full_name || user.email}</span>
          <span className="block truncate text-xs text-muted" title={user.email ?? undefined}>{user.email}</span>
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] text-muted">{titleCase(user.role)}</span>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="fixed top-3.5 left-3 z-40 grid size-9 place-items-center rounded-lg border border-border bg-surface lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        {brand}
        {links}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar">
            <button
              type="button"
              className="absolute top-4 right-3 grid size-8 place-items-center rounded-lg text-sidebar-text"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            {brand}
            {links}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
