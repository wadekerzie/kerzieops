import { PrintPayoutSummaryButton } from "@/components/dashboard/PrintPayoutSummaryButton";
import { getMonthlyCloseData } from "@/lib/finance-data";
import { formatCurrency } from "@/lib/utils";

export default async function MonthlyCloseExportPage({
  searchParams
}: {
  searchParams?: { month?: string };
}) {
  const data = await getMonthlyCloseData(searchParams?.month);
  const totalPayout = data.snapshots.reduce(
    (sum, snapshot) => sum + snapshot.partnerPayouts.reduce((inner, payout) => inner + payout.amount, 0),
    0
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 bg-white px-6 py-10 text-slate-900 print:px-0">
      <section className="flex items-start justify-between gap-6 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Kerzie Ops</p>
          <h1 className="mt-3 text-4xl font-semibold">{data.monthLabel} Payout Summary</h1>
          <p className="mt-2 text-sm text-slate-600">Use your browser print dialog and choose “Save as PDF” for record keeping.</p>
        </div>
        <PrintPayoutSummaryButton />
      </section>

      <section className="rounded-3xl border border-slate-200 p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Month</p>
            <p className="mt-2 text-lg font-semibold">{data.monthLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Units included</p>
            <p className="mt-2 text-lg font-semibold">{data.snapshots.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total payouts</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrency(totalPayout)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {data.snapshots.map((snapshot) => (
          <div key={snapshot.unitId} className="rounded-3xl border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{snapshot.unitName}</h2>
                <p className="mt-1 text-sm text-slate-500">Distributable pool for {data.monthLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Distributable pool</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(snapshot.distributablePool)}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Partner</th>
                    <th className="px-4 py-3 text-left">Share</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {snapshot.partnerPayouts.map((payout) => (
                    <tr key={`${snapshot.unitId}-${payout.partnerId}`}>
                      <td className="px-4 py-3">{payout.name}</td>
                      <td className="px-4 py-3">{payout.percentage.toFixed(2)}%</td>
                      <td className="px-4 py-3">{formatCurrency(payout.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
