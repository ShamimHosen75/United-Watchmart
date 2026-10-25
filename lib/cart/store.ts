"use client";

import { useSyncExternalStore } from "react";
import { products } from "@/data/products";
import { shop } from "@/lib/shop/config";

/** The cart lives in localStorage (no account needed) and stays in sync across tabs. */

export type CartLine = { slug: string; qty: number };

const KEY = "uwm-cart";
const CHECKOUT_REF_KEY = "uwm-checkout-ref";
const EMPTY: CartLine[] = [];
const known = new Set(products.map((p) => p.slug));
const listeners = new Set<() => void>();

let cache: CartLine[] | null = null;

function sanitize(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const out: CartLine[] = [];
  for (const v of value) {
    const slug = (v as CartLine)?.slug;
    const qty = Math.floor(Number((v as CartLine)?.qty));
    if (typeof slug === "string" && known.has(slug) && qty >= 1 && !out.some((l) => l.slug === slug)) {
      out.push({ slug, qty: Math.min(qty, shop.maxPerLine) });
    }
  }
  return out.slice(0, shop.maxLines);
}

function read(): CartLine[] {
  if (cache) return cache;
  try {
    cache = sanitize(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage full or blocked: the cart still works for this page view */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);

/** Adds units (capped by the per-order limit and, when known, by what is available). */
export function addToCart(slug: string, qty = 1, available?: number | null) {
  const lines = read();
  const current = lines.find((l) => l.slug === slug)?.qty ?? 0;
  const cap = Math.min(shop.maxPerLine, available ?? shop.maxPerLine);
  const next = Math.min(cap, current + qty);
  if (next <= 0 || next === current) return false;
  write(current ? lines.map((l) => (l.slug === slug ? { slug, qty: next } : l)) : [...lines, { slug, qty: next }]);
  return true;
}

export function setQuantity(slug: string, qty: number) {
  const lines = read();
  if (qty <= 0) write(lines.filter((l) => l.slug !== slug));
  else write(lines.map((l) => (l.slug === slug ? { slug, qty: Math.min(qty, shop.maxPerLine) } : l)));
}

export const removeFromCart = (slug: string) => setQuantity(slug, 0);

export function clearCart() {
  write([]);
  setCheckoutRef(null);
}

/** The pending order this browser started, so an unchanged cart resumes the same checkout. */
export function getCheckoutRef() {
  try {
    return sessionStorage.getItem(CHECKOUT_REF_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setCheckoutRef(ref: string | null) {
  try {
    if (ref) sessionStorage.setItem(CHECKOUT_REF_KEY, ref);
    else sessionStorage.removeItem(CHECKOUT_REF_KEY);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ drawer

let open = false;
const openListeners = new Set<() => void>();
const subscribeOpen = (fn: () => void) => {
  openListeners.add(fn);
  return () => openListeners.delete(fn);
};

export const useCartOpen = () => useSyncExternalStore(subscribeOpen, () => open, () => false);

export function setCartOpen(value: boolean) {
  open = value;
  openListeners.forEach((fn) => fn());
}
