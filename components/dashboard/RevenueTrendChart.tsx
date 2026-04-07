"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenueChartPoint } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";

const COLORS = {
  current: "#10b981",
  standard: "#334155"
};

export function RevenueTrendChart({ data }: { data: RevenueChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.25)" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "#1e293b",
              borderRadius: 12,
              color: "#e2e8f0"
            }}
            formatter={(value: number) => [formatCurrency(Number(value)), "Revenue"]}
          />
          <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.monthKey} fill={entry.isCurrent ? COLORS.current : COLORS.standard} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
