"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, FileDown, Lock, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

function StepCard({
  title,
  description,
  complete,
  children
}: {
  title: string;
  description: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5 text-slate-500" />}
            <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${complete ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
          {complete ? "Complete" : "Pending"}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function MonthlyCloseChecklistPage({
  monthKey,
  monthLabel,
  closeRecord,
  revenueEvents,
  recurringExpenses,
  dueScoutCommissions,
  snapshots,
  stepStates
}: {
  monthKey: string;
  monthLabel: string;
  closeRecord: {
    is_locked: boolean;
  } | null;
  revenueEvents: Array<{
    id: string;
    businessUnitName: string;
    transactionDate: string;
    customerName: string | null;
    description: string | null;
    grossAmount: number;
    reviewStatus: "unreviewed" | "confirmed" | "flagged";
    reviewNotes: string | null;
    isSetupFee: boolean;
    isPendingAgreement: boolean;
  }>;
  recurringExpenses: Array<{
    id: string;
    businessUnitName: string;
    vendor: string;
    description: string;
    monthlyEquivalent: number;
    annualEquivalent: number;
    recurrenceInterval: "monthly" | "annual" | "one_time";
    nextBillingDate: string | null;
    isActive: boolean;
  }>;
  dueScoutCommissions: Array<{
    id: string;
    scoutName: string;
    businessUnitName: string;
    customer_name: string;
    commission_amount: number;
    payout_date: string;
    status: "pending" | "paid" | "held";
  }>;
  snapshots: Array<{
    unitId: string;
    unitName: string;
    unitSlug: string;
    distributablePool: number;
    partnerPayouts: Array<{
      partnerId: string;
      name: string;
      percentage: number;
      amount: number;
    }>;
  }>;
  stepStates: Array<{
    label: string;
    complete: boolean;
    description: string;
  }>;
}) {
  const router = useRouter();
  const [isRunningAction, setIsRunningAction] = useState<string | null>(null);
  const locked = closeRecord?.is_locked ?? false;
  const completedSteps = stepStates.filter((step) => step.complete).length;
  const monthlyPayoutTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const snapshot of snapshots) {
      for (const payout of snapshot.partnerPayouts) {
        totals.set(payout.name, (totals.get(payout.name) ?? 0) + payout.amount);
      }
    }

    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount);
  }, [snapshots]);

  async function refreshAfter(promise: Promise<Response>, successMessage: string) {
    const response = await promise;
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Action failed.");
    }

    toast.success(successMessage);
    router.refresh();
  }

  async function reviewRevenue(revenueEventId: string, reviewStatus: "confirmed" | "flagged") {
    if (locked) {
      toast.error("This month is locked.");
      return;
    }

    const reviewNotes = reviewStatus === "flagged" ? window.prompt("Add a short anomaly note") ?? "" : "";

    try {
      await refreshAfter(
        fetch("/api/revenue-events/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            revenueEventId,
            reviewStatus,
            reviewNotes
          })
        }),
        reviewStatus === "confirmed" ? "Revenue event confirmed" : "Revenue event flagged"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update revenue review.");
    }
  }

  async function updateCommissionStatus(commissionId: string, status: "paid" | "held") {
    if (locked) {
      toast.error("This month is locked.");
      return;
    }

    try {
      await refreshAfter(
        fetch("/api/commissions/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            commissionIds: [commissionId],
            status,
            month: monthKey
          })
        }),
        status === "paid" ? "Commission marked paid" : "Commission placed on hold"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update commission status.");
    }
  }

  async function runCloseAction(action: "confirm_recurring_expenses" | "generate_snapshots" | "calculate_payouts" | "mark_pdf_exported" | "lock_month", successMessage: string) {
    if (locked && action !== "mark_pdf_exported") {
      toast.error("This month is locked.");
      return;
    }

    setIsRunningAction(action);

    try {
      await refreshAfter(
        fetch("/api/monthly-close", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            month: monthKey,
            action
          })
        }),
        successMessage
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update monthly close.");
    } finally {
      setIsRunningAction(null);
    }
  }

  async function exportPdf() {
    try {
      await runCloseAction("mark_pdf_exported", "Print view opened");
      window.open(`/dashboard/close/export?month=${monthKey}`, "_blank", "noopener,noreferrer");
    } catch {
      // handled inside runCloseAction
    }
  }

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Monthly Close</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">{monthLabel}</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400">
              Follow the checklist top to bottom, close the month, export the payout summary, and lock the books.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="h-12 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
              type="month"
              value={monthKey}
              onChange={(event) => router.push(`/dashboard/close?month=${event.target.value}`)}
            />
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              {completedSteps} of {stepStates.length} steps complete
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue events</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{revenueEvents.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recurring expenses</p>
          <p className="mt-3 text-3xl font-semibold text-amber-300">{recurringExpenses.filter((expense) => expense.isActive).length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scout commissions due</p>
          <p className="mt-3 text-3xl font-semibold text-violet-300">{dueScoutCommissions.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Month status</p>
          <p className={`mt-3 text-2xl font-semibold ${locked ? "text-rose-300" : "text-emerald-300"}`}>{locked ? "Locked" : "Open"}</p>
        </div>
      </section>

      <StepCard title="1. Review Revenue Events" description="Confirm each item or flag it before the month is closed." complete={stepStates[0]?.complete ?? false}>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Gross</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
              {revenueEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3">{event.transactionDate}</td>
                  <td className="px-4 py-3">{event.businessUnitName}</td>
                  <td className="px-4 py-3">
                    <div>{event.customerName ?? "—"}</div>
                    <div className="text-xs text-slate-500">{event.description ?? "No description"}</div>
                  </td>
                  <td className="px-4 py-3 text-emerald-300">{formatCurrency(event.grossAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="capitalize">{event.reviewStatus}</div>
                    {event.isSetupFee ? <div className="text-xs text-sky-300">Setup fee</div> : null}
                    {event.isPendingAgreement ? <div className="text-xs text-amber-300">Pending agreement</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={locked} onClick={() => reviewRevenue(event.id, "confirmed")}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-500/30 bg-transparent text-amber-200" disabled={locked} onClick={() => reviewRevenue(event.id, "flagged")}>
                        Flag
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StepCard>

      <StepCard title="2. Confirm Recurring Expenses" description="Make sure monthly and annual subscriptions are current and active." complete={stepStates[1]?.complete ?? false}>
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Monthly</th>
                  <th className="px-4 py-3 text-left">Annual</th>
                  <th className="px-4 py-3 text-left">Next billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {recurringExpenses.filter((expense) => expense.isActive).map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3">
                      <div>{expense.vendor}</div>
                      <div className="text-xs text-slate-500">{expense.description}</div>
                    </td>
                    <td className="px-4 py-3">{expense.businessUnitName}</td>
                    <td className="px-4 py-3 text-amber-300">{formatCurrency(expense.monthlyEquivalent)}</td>
                    <td className="px-4 py-3 text-violet-300">{formatCurrency(expense.annualEquivalent)}</td>
                    <td className="px-4 py-3">{expense.nextBillingDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={locked || isRunningAction === "confirm_recurring_expenses"} onClick={() => runCloseAction("confirm_recurring_expenses", "Recurring expenses confirmed")}>
              {isRunningAction === "confirm_recurring_expenses" ? "Saving..." : "Mark recurring expenses reviewed"}
            </Button>
          </div>
        </div>
      </StepCard>

      <StepCard title="3. Review Scout Commissions Due" description="Mark every due scout payout as paid or place it on hold." complete={stepStates[2]?.complete ?? false}>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Scout</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Commission</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
              {dueScoutCommissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-4 py-3">{commission.scoutName}</td>
                  <td className="px-4 py-3">{commission.customer_name}</td>
                  <td className="px-4 py-3">{commission.businessUnitName}</td>
                  <td className="px-4 py-3 text-violet-300">{formatCurrency(commission.commission_amount)}</td>
                  <td className="px-4 py-3 capitalize">{commission.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={locked} onClick={() => updateCommissionStatus(commission.id, "paid")}>
                        Paid
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-500/30 bg-transparent text-amber-200" disabled={locked} onClick={() => updateCommissionStatus(commission.id, "held")}>
                        Hold
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StepCard>

      <StepCard title="4. Generate Monthly Snapshots" description="Recalculate every business unit for the selected close month." complete={stepStates[3]?.complete ?? false}>
        <div className="flex justify-end">
          <Button className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={locked || isRunningAction === "generate_snapshots"} onClick={() => runCloseAction("generate_snapshots", "Monthly snapshots regenerated")}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isRunningAction === "generate_snapshots" ? "Generating..." : "Generate snapshots"}
          </Button>
        </div>
      </StepCard>

      <StepCard title="5. Calculate Partner Payouts" description="Persist the payout ledger and review the month-end split by business unit." complete={stepStates[4]?.complete ?? false}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {snapshots.map((snapshot) => (
              <div key={snapshot.unitId} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">{snapshot.unitName}</h3>
                  <span className="text-sm font-semibold text-sky-300">{formatCurrency(snapshot.distributablePool)}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {snapshot.partnerPayouts.length > 0 ? (
                    snapshot.partnerPayouts.map((payout) => (
                      <div key={`${snapshot.unitId}-${payout.partnerId}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm">
                        <span className="text-slate-300">{payout.name}</span>
                        <span className="font-medium text-violet-300">{formatCurrency(payout.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 px-3 py-3 text-sm text-slate-500">
                      No active partner split for this unit yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Monthly payout summary</p>
            <div className="mt-4 space-y-3">
              {monthlyPayoutTotals.map((payout) => (
                <div key={payout.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span className="text-slate-300">{payout.name}</span>
                  <span className="font-semibold text-emerald-300">{formatCurrency(payout.amount)}</span>
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={locked || isRunningAction === "calculate_payouts"} onClick={() => runCloseAction("calculate_payouts", "Partner payout ledger updated")}>
              {isRunningAction === "calculate_payouts" ? "Calculating..." : "Calculate partner payouts"}
            </Button>
          </div>
        </div>
      </StepCard>

      <StepCard title="6. Export Payout Summary PDF" description="Open a print-friendly summary and save it as a PDF for bookkeeping and 1099 support." complete={stepStates[5]?.complete ?? false}>
        <div className="flex justify-end">
          <Button className="bg-slate-100 text-slate-950 hover:bg-white" disabled={isRunningAction === "mark_pdf_exported"} onClick={exportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Export payout summary
          </Button>
        </div>
      </StepCard>

      <StepCard title="7. Lock The Month" description="Freeze the period once everything above is complete." complete={stepStates[6]?.complete ?? false}>
        <div className="flex justify-end">
          <Button className="bg-rose-500 text-white hover:bg-rose-400" disabled={locked || isRunningAction === "lock_month"} onClick={() => runCloseAction("lock_month", "Month locked")}>
            <Lock className="mr-2 h-4 w-4" />
            {locked ? "Month locked" : "Lock month"}
          </Button>
        </div>
      </StepCard>
    </main>
  );
}
