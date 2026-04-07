"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { WaterfallStagePoint } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";

const TONE_COLORS = {
  revenue: "#10b981",
  cost: "#f59e0b",
  reserve: "#f97316",
  pool: "#3b82f6"
};

export function WaterfallStepChart({ data }: { data: WaterfallStagePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} interval={0} angle={-20} height={64} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.25)" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "#1e293b",
              borderRadius: 12,
              color: "#e2e8f0"
            }}
            formatter={(value: number) => [formatCurrency(Number(value)), "Balance"]}
          />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={TONE_COLORS[entry.tone]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
