import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Button, ButtonLink } from "./button";

/** A GET form so filters live in the URL and can be bookmarked or shared. */
export function FilterBar({ q, placeholder, children, resetHref }: { q?: string; placeholder: string; children?: ReactNode; resetHref: string }) {
  return (
    <form className="flex flex-wrap items-center gap-2 border-b border-border p-4" role="search">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label className="sr-only" htmlFor="filter-q">Search</label>
        <input
          id="filter-q"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      {children}
      <Button type="submit" variant="secondary">Filter</Button>
      <ButtonLink href={resetHref} variant="ghost">Reset</ButtonLink>
    </form>
  );
}

export function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: { value: string; label: string }[] }) {
  return (
    <>
      <label className="sr-only" htmlFor={`filter-${name}`}>{label}</label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value ?? ""}
        className="h-9 rounded-lg border border-border bg-surface pr-8 pl-3 text-sm focus:border-accent focus:outline-none"
      >
        <option value="">{label}: all</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
}
