/** Currency for all amounts. Set NEXT_PUBLIC_CURRENCY (e.g. BDT) when deploying; defaults to USD. */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 });

export const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : currency.format(n));
export const moneyCompact = (n: number) => compact.format(n);

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

export function relative(iso: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** ISO date (YYYY-MM-DD) n days from today. */
export const isoDateFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
