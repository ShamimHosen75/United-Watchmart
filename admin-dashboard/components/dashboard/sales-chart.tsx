"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyCompact } from "@/lib/format";

export function SalesChart({ data, label: aria = "Sales per day for the last 30 days" }: { data: { date: string; total: number; orders: number }[]; label?: string }) {
  const label = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <div className="h-64 w-full" role="img" aria-label={aria}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={label} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => moneyCompact(v)} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            labelFormatter={(d) => label(String(d))}
            formatter={(v, _n, item) => [`${money(Number(v))} · ${item.payload.orders} order${item.payload.orders === 1 ? "" : "s"}`, "Sales"]}
          />
          <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} fill="url(#gold)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
