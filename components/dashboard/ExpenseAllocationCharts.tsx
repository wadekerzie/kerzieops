"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ExpenseBreakdownPoint } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"];

function ChartCard({
  title,
  data
}: {
  title: string;
  data: ExpenseBreakdownPoint[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  borderRadius: 12,
                  color: "#e2e8f0"
                }}
                formatter={(value: number) => [formatCurrency(Number(value)), "Amount"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.length > 0 ? (
            data.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                  <span className="text-sm text-slate-300">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-100">{formatCurrency(entry.value)}</span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">
              No expenses logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExpenseAllocationCharts({
  byCategory,
  byBusinessUnit
}: {
  byCategory: ExpenseBreakdownPoint[];
  byBusinessUnit: ExpenseBreakdownPoint[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Expense Allocation by Category" data={byCategory} />
      <ChartCard title="Expense Allocation by Business Unit" data={byBusinessUnit} />
    </div>
  );
}
