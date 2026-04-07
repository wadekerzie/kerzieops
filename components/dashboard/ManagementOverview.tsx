import { RevenueEventForm } from "@/components/dashboard/RevenueEventForm";
import { Button } from "@/components/ui/button";
import { getManagementDashboardData, type DashboardUnitSummary } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, PlusCircle } from "lucide-react";
import Link from "next/link";

function OverviewMetric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "revenue" | "pool" | "payout";
}) {
  const toneClasses = {
    revenue: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    pool: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    payout: "border-violet-500/20 bg-violet-500/10 text-violet-300"
  };

  return (
    <div className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: DashboardUnitSummary["status"] }) {
  const toneClasses = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    "pre-launch": "bg-amber-500/15 text-amber-300 border-amber-500/20",
    client: "bg-violet-500/15 text-violet-300 border-violet-500/20"
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[status]}`}>{label}</span>;
}

function MoneyRow({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "revenue" | "cost" | "pool";
}) {
  const toneClasses = {
    revenue: "text-emerald-300",
    cost: "text-amber-300",
    pool: "text-sky-300"
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${toneClasses[tone]}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function UnitCard({ unit }: { unit: DashboardUnitSummary }) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-50">{unit.name}</h3>
          <p className="mt-2 text-sm text-slate-400">{unit.monthOverMonthLabel}</p>
        </div>
        <StatusBadge label={unit.statusLabel} status={unit.status} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <MoneyRow label="Gross revenue" value={unit.grossRevenue} tone="revenue" />
        <MoneyRow label="Platform fees" value={unit.platformFees} tone="cost" />
        <MoneyRow label="Variable costs" value={unit.variableCosts} tone="cost" />
        <MoneyRow label="Ops tax allocated" value={unit.opsTaxAllocated} tone="cost" />
        <MoneyRow label="Marketing fund" value={unit.marketingFund} tone="cost" />
        <MoneyRow label="Operating reserve" value={unit.operatingReserve} tone="cost" />
      </div>

      <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-300">Distributable pool</span>
          <span className="text-lg font-semibold text-sky-300">{formatCurrency(unit.distributablePool)}</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-slate-200">Partner payout breakdown</h4>
          {unit.routePath ? (
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
              <Link href={unit.routePath}>
                Open unit
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {unit.partnerPayouts.length > 0 ? (
            unit.partnerPayouts.map((payout) => (
              <div key={`${unit.id}-${payout.partnerId}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{payout.partnerName}</p>
                  <p className="text-xs text-slate-500">
                    {payout.percentage ? `${payout.percentage.toFixed(1)}% split` : payout.source}
                  </p>
                </div>
                <span className="text-sm font-semibold text-violet-300">{formatCurrency(payout.amount)}</span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
              No payout breakdown available yet.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export async function ManagementOverview() {
  const dashboard = await getManagementDashboardData();

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{dashboard.currentMonthLabel}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Master Money Flow</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Cross-unit view of gross revenue, costs, reserves, distributable pool, scout payouts, and capital position across Kerzie Ops.
            </p>
          </div>
          <RevenueEventForm
            businessUnits={dashboard.businessUnits}
            triggerLabel="Add revenue event"
            triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Total Gross Revenue" value={dashboard.overview.totalGrossRevenue} tone="revenue" />
        <OverviewMetric label="Distributable Pool" value={dashboard.overview.totalDistributablePool} tone="pool" />
        <OverviewMetric label="Wade Pending Payout" value={dashboard.overview.wadePendingPayout} tone="payout" />
        <OverviewMetric label="Gavin Pending Payout" value={dashboard.overview.gavinPendingPayout} tone="payout" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {dashboard.units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Pending Scout Commissions</h3>
          <p className="mt-2 text-sm text-slate-400">Next payout date always lands on the 15th of the following month.</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Scout</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Commission</th>
                  <th className="px-4 py-3 text-left font-medium">Next payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {dashboard.scoutCommissions.length > 0 ? (
                  dashboard.scoutCommissions.map((commission) => (
                    <tr key={commission.id}>
                      <td className="px-4 py-3">{commission.partnerName}</td>
                      <td className="px-4 py-3">{commission.customer_name}</td>
                      <td className="px-4 py-3 text-slate-300">{commission.businessUnitName}</td>
                      <td className="px-4 py-3 text-violet-300">{formatCurrency(Number(commission.commission_amount))}</td>
                      <td className="px-4 py-3">{commission.payout_date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No pending scout commissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Zorli Capital Contributions</h3>
          <p className="mt-2 text-sm text-slate-400">Founder capital and sweat equity seeded into the Kerzie Ops ledger.</p>
          <div className="mt-6 space-y-3">
            {dashboard.capitalSummary.map((contributor) => (
              <div key={contributor.partnerName} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-slate-100">{contributor.partnerName}</h4>
                  <span className="text-sm font-semibold text-sky-300">{formatCurrency(contributor.totalAmount)}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cash</p>
                    <p className="mt-2 text-sm font-medium text-emerald-300">{formatCurrency(contributor.cashAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sweat Equity</p>
                    <p className="mt-2 text-sm font-medium text-violet-300">{formatCurrency(contributor.sweatEquityAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
