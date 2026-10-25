import { straps, type Strap } from "@/data/products";

/** The collection strap filter, kept in the URL hash (#bracelet, #leather, #rubber). */
export type StrapFilter = "all" | Strap;

const listeners = new Set<() => void>();

const parse = (hash: string): StrapFilter => {
  const value = hash.replace(/^#/, "");
  return (straps as readonly string[]).includes(value) ? (value as Strap) : "all";
};

export const getFilter = (): StrapFilter => parse(window.location.hash);
export const getServerFilter = (): StrapFilter => "all";

export function subscribeFilter(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("hashchange", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("hashchange", fn);
  };
}

/** Updates the hash without adding history entries or jumping the page. */
export function setFilter(filter: StrapFilter) {
  const url = new URL(window.location.href);
  url.hash = filter === "all" ? "" : filter;
  window.history.replaceState(window.history.state, "", url.toString());
  listeners.forEach((fn) => fn());
}
