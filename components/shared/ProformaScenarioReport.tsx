import { buildProformaAssumptionSummary, type ProformaInput, type ProformaResult } from "@/lib/proforma";
import { formatCurrency } from "@/lib/utils";

export function ProformaScenarioReport({
  unitName,
  input,
  result,
  titleSuffix
}: {
  unitName: string;
  input: ProformaInput;
  result: ProformaResult;
  titleSuffix?: string;
}) {
  const assumptionSummary = buildProformaAssumptionSummary(input.assumptions);

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Kerzie AI Solutions</p>
          <h2 className="mt-3 text-3xl font-semibold">{input.scenarioName}{titleSuffix ? ` ${titleSuffix}` : ""}</h2>
          <p className="mt-2 text-sm text-slate-600">{unitName} 12-month proforma scenario</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Breakeven</p>
          <p className="mt-2 text-sm font-semibold">
            {result.breakeven.monthLabel ?? "Not within 12 months"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gross Revenue</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(result.totals.grossRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Platform Fees</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(result.totals.platformFees)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Variable Costs</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(result.totals.variableCosts)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ops Allocated</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(result.totals.opsTaskAllocated)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Distributable Pool</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(result.totals.distributablePool)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Assumptions</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {assumptionSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Month</th>
              <th className="px-4 py-3 text-left">Gross</th>
              <th className="px-4 py-3 text-left">Fees</th>
              <th className="px-4 py-3 text-left">Variable</th>
              <th className="px-4 py-3 text-left">Ops</th>
              <th className="px-4 py-3 text-left">Marketing</th>
              <th className="px-4 py-3 text-left">Reserve</th>
              <th className="px-4 py-3 text-left">Pool</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.months.map((month) => (
              <tr key={month.monthLabel}>
                <td className="px-4 py-3">{month.monthLabel}</td>
                <td className="px-4 py-3">{formatCurrency(month.grossRevenue)}</td>
                <td className="px-4 py-3">{formatCurrency(month.platformFees)}</td>
                <td className="px-4 py-3">{formatCurrency(month.variableCosts)}</td>
                <td className="px-4 py-3">{formatCurrency(month.opsTaskAllocated)}</td>
                <td className="px-4 py-3">{formatCurrency(month.marketingFund)}</td>
                <td className="px-4 py-3">{formatCurrency(month.operatingReserve)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(month.distributablePool)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Share</th>
              <th className="px-4 py-3 text-left">12-Month Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.totals.partnerPayouts.map((payout) => (
              <tr key={payout.name}>
                <td className="px-4 py-3">{payout.name}</td>
                <td className="px-4 py-3">{payout.percentage.toFixed(2)}%</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(payout.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
