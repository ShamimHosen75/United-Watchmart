/** Date range for reports from the URL, with presets. Dates are inclusive, in YYYY-MM-DD. */
export const PRESETS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "12 months", days: 365 },
] as const;

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const isDate = (s?: string) => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));

export function resolveRange(sp: { from?: string; to?: string; preset?: string }, now = Date.now()) {
  if (isDate(sp.from) && isDate(sp.to) && sp.from! <= sp.to!) return { from: sp.from!, to: sp.to!, preset: "" };
  const p = PRESETS.find((x) => x.key === sp.preset) ?? PRESETS[1];
  return { from: iso(now - (p.days - 1) * 86_400_000), to: iso(now), preset: p.key };
}
