"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { nav, CURRENT_PHASE } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
      {nav.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-sidebar-muted uppercase">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-sidebar-active text-white" : "text-sidebar-text hover:bg-sidebar-active/60 hover:text-white",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-accent" : "text-sidebar-muted")} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.phase > CURRENT_PHASE && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-sidebar-muted">Soon</span>
                    )}
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
    <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-5">
      <span className="grid size-8 place-items-center rounded-full border border-accent/60 font-serif text-sm text-accent">UW</span>
      <span className="leading-tight">
        <span className="block font-serif text-lg text-white">United WatchMart</span>
        <span className="block text-[10px] tracking-[0.16em] text-sidebar-muted uppercase">Back office</span>
      </span>
    </Link>
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

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar lg:flex">
        {brand}
        {links}
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
          </aside>
        </div>
      )}
    </>
  );
}
