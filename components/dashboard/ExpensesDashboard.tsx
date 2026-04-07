import { OneTimeExpenseForm } from "@/components/dashboard/OneTimeExpenseForm";
import { ExpenseAllocationCharts } from "@/components/dashboard/ExpenseAllocationCharts";
import { getExpensesDashboardData } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";

export async function ExpensesDashboard() {
  const { currentMonthLabel, businessUnits, recurringExpenses, oneTimeExpenses, expenseByCategory, expenseByBusinessUnit } =
    await getExpensesDashboardData();

  const recurringMonthlyTotal = recurringExpenses.reduce((sum, expense) => sum + expense.monthlyEquivalent, 0);
  const recurringAnnualTotal = recurringExpenses.reduce((sum, expense) => sum + expense.annualEquivalent, 0);

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{currentMonthLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Expenses</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Recurring operating costs, one-time spend, and allocation visuals across Kerzie AI and every active business unit.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Recurring Expenses</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Monthly Total</p>
              <p className="mt-3 text-2xl font-semibold text-amber-300">{formatCurrency(recurringMonthlyTotal)}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Annual Total</p>
              <p className="mt-3 text-2xl font-semibold text-amber-300">{formatCurrency(recurringAnnualTotal)}</p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Business Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Monthly</th>
                  <th className="px-4 py-3 text-left font-medium">Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {recurringExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{expense.vendor}</div>
                      <div className="text-xs text-slate-500">{expense.description}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{expense.businessUnitName}</td>
                    <td className="px-4 py-3 uppercase text-slate-500">{expense.category.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-amber-300">{formatCurrency(expense.monthlyEquivalent)}</td>
                    <td className="px-4 py-3 text-amber-300">{formatCurrency(expense.annualEquivalent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">One-Time Expenses</h2>
              <p className="mt-1 text-sm text-slate-400">Log one-off spend and refresh the dashboard waterfall automatically.</p>
            </div>
            <OneTimeExpenseForm businessUnits={businessUnits} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Business Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {oneTimeExpenses.length > 0 ? (
                  oneTimeExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3">{expense.expense_date}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {expense.business_unit_id
                          ? businessUnits.find((unit) => unit.id === expense.business_unit_id)?.name ?? "Unknown unit"
                          : "Kerzie Global"}
                      </td>
                      <td className="px-4 py-3">{expense.vendor ?? expense.description}</td>
                      <td className="px-4 py-3 uppercase text-slate-500">{expense.category.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-amber-300">{formatCurrency(Number(expense.amount))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No one-time expenses logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ExpenseAllocationCharts byCategory={expenseByCategory} byBusinessUnit={expenseByBusinessUnit} />
    </main>
  );
}
