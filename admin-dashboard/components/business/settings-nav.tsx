"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Megaphone, Plug, Store, Tags, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/settings/account", label: "Account", icon: UserRound },
  { href: "/settings/store", label: "Store and invoice", icon: Store },
  { href: "/settings/catalogue", label: "Catalogue", icon: Tags },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/marketing", label: "Marketing", icon: Megaphone },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap", active ? "bg-surface font-medium shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface-2 hover:text-text")}>
            <Icon className="size-4" aria-hidden />{label}
          </Link>
        );
      })}
    </nav>
  );
}
