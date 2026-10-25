"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Live availability from /api/stock, shared by every component that needs it.
 * `null` means unknown (not loaded yet, or the shop is offline): the server re-checks at checkout.
 */

type Stock = Record<string, number>;

const MAX_AGE_MS = 30_000;
const listeners = new Set<() => void>();
let stock: Stock | null = null;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

export function refreshStock(force = false) {
  if (inflight || (!force && stock && Date.now() - fetchedAt < MAX_AGE_MS)) return inflight ?? Promise.resolve();
  inflight = fetch("/api/stock", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Stock>) : null))
    .then((data) => {
      if (data && Object.keys(data).length) {
        stock = data;
        fetchedAt = Date.now();
        listeners.forEach((fn) => fn());
      }
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Availability per slug; fetched on first use and refreshed when older than 30 s. */
export function useStock() {
  const value = useSyncExternalStore(subscribe, () => stock, () => null);
  useEffect(() => {
    void refreshStock();
  }, []);
  return value;
}
