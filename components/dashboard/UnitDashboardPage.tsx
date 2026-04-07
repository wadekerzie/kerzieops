import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, PlusCircle } from "lucide-react";

import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { RevenueEventForm } from "@/components/dashboard/RevenueEventForm";
import { WaterfallStepChart } from "@/components/dashboard/WaterfallStepChart";
import { Button } from "@/components/ui/button";
import { getUnitDashboardData } from "@/lib/dashboard-data";
import { getSilverNaturalsAgreementStatus } from "@/lib/finance-data";
import { formatCurrency } from "@/lib/utils";

function SectionCard({
  title,
  description,
  children,
  actions
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "revenue" | "cost" | "pool" | "payout";
}) {
  const toneClasses = {
    revenue: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
    cost: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    pool: "text-sky-300 border-sky-500/20 bg-sky-500/10",
    payout: "text-violet-300 border-violet-500/20 bg-violet-500/10"
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

export async function UnitDashboardPage({ slug }: { slug: string }) {
  const [{ currentMonthLabel, businessUnits, unit }, silverNaturalsAgreement] = await Promise.all([
    getUnitDashboardData(slug),
    slug === "silver_naturals" ? getSilverNaturalsAgreementStatus() : Promise.resolve(null)
  ]);

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{currentMonthLabel}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">{unit.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              12-month revenue tracking, current waterfall breakdown, payout visibility, and the latest operating activity for this business unit.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Gross Revenue" value={unit.grossRevenue} tone="revenue" />
            <MetricTile label="Platform Fees" value={unit.platformFees} tone="cost" />
            <MetricTile label="Ops Tax" value={unit.opsTaxAllocated} tone="cost" />
            <MetricTile label="Distributable Pool" value={unit.distributablePool} tone="pool" />
          </div>
        </div>
      </section>

      {slug === "silver_naturals" && silverNaturalsAgreement && !silverNaturalsAgreement.finalized ? (
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          <p className="text-sm font-medium">{silverNaturalsAgreement.bannerMessage}</p>
        </section>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="12-Month Revenue" description="Current month is highlighted in green.">
          <RevenueTrendChart data={unit.revenueSeries} />
        </SectionCard>

        <SectionCard title="Current Month Waterfall" description="Visual step-down from gross cash-in to the current distributable pool.">
          <WaterfallStepChart data={unit.waterfallStages} />
        </SectionCard>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Partner Payout Table" description="Projected from current splits unless a payout ledger already exists.">
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Partner</th>
                  <th className="px-4 py-3 text-left font-medium">Share</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {unit.partnerPayouts.length > 0 ? (
                  unit.partnerPayouts.map((payout) => (
                    <tr key={`${unit.id}-${payout.partnerId}`}>
                      <td className="px-4 py-3">{payout.partnerName}</td>
                      <td className="px-4 py-3">{payout.percentage ? `${payout.percentage.toFixed(1)}%` : "Recorded"}</td>
                      <td className="px-4 py-3 font-medium text-violet-300">{formatCurrency(payout.amount)}</td>
                      <td className="px-4 py-3 capitalize text-slate-400">{payout.source}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No payout data yet for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Revenue Event Log"
          description="Most recent 30 transactions for this unit."
          actions={
            <RevenueEventForm
              businessUnits={businessUnits}
              defaultBusinessUnitId={unit.id}
              triggerLabel="Add new revenue event"
              triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
            />
          }
        >
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Gross</th>
                  <th className="px-4 py-3 text-left font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {unit.revenueEvents.length > 0 ? (
                  unit.revenueEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3">{event.transaction_date}</td>
                      <td className="px-4 py-3 uppercase text-slate-400">{event.source}</td>
                      <td className="px-4 py-3">{event.description ?? "Untitled revenue event"}</td>
                      <td className="px-4 py-3 text-emerald-300">{formatCurrency(Number(event.gross_amount))}</td>
                      <td className="px-4 py-3 text-sky-300">{formatCurrency(Number(event.net_after_platform))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No revenue events logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Expense Log" description="Unit-specific expense activity. Shared Kerzie global costs are allocated in the waterfall above.">
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {unit.expenses.length > 0 ? (
                  unit.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3">{expense.expense_date}</td>
                      <td className="px-4 py-3 uppercase text-slate-400">{expense.category.replace("_", " ")}</td>
                      <td className="px-4 py-3">{expense.vendor ?? "Unknown vendor"}</td>
                      <td className="px-4 py-3">{expense.description}</td>
                      <td className="px-4 py-3 text-amber-300">{formatCurrency(Number(expense.amount))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No unit-specific expenses logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Proforma Link" description="Jump into scenario planning for this unit from the management dashboard.">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-sm leading-6 text-slate-300">
              Use the proforma workspace to model subscriber growth, platform fees, LLM cost per user, and payout sensitivity for {unit.name}.
            </p>
            <Button asChild className="mt-5 bg-sky-500 text-slate-950 hover:bg-sky-400">
              <Link href={`/dashboard/proforma?unit=${unit.slug}`}>
                Open {unit.name} proforma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
