"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface RecurringExpenseRow {
  id: string;
  businessUnitId: string | null;
  businessUnitName: string;
  category: "ops_tax" | "marketing" | "reserve" | "variable" | "capital" | "one_time";
  vendor: string;
  description: string;
  amount: number;
  recurrenceInterval: "monthly" | "annual" | "one_time";
  monthlyEquivalent: number;
  annualEquivalent: number;
  receiptUrl: string | null;
  isActive: boolean;
  expenseDate: string;
  nextBillingDate: string | null;
}

interface ConsultingProjectRow {
  id: string;
  businessUnitId: string;
  businessUnitName: string;
  projectName: string;
  clientName: string;
  projectValue: number;
  startDate: string;
  endDate: string | null;
  status: "active" | "complete" | "paused";
  description: string | null;
  collectedToDate: number;
  remainingBalance: number;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    description: string | null;
    invoiceNumber: string | null;
    notes: string | null;
  }>;
}

const today = new Date().toISOString().slice(0, 10);

export function ExpenseManagementPage({
  currentMonthLabel,
  businessUnits,
  recurringExpenses,
  oneTimeExpenses,
  consultingProjects
}: {
  currentMonthLabel: string;
  businessUnits: Array<{ id: string; name: string; slug: string }>;
  recurringExpenses: RecurringExpenseRow[];
  oneTimeExpenses: Array<{
    id: string;
    business_unit_id: string | null;
    expense_date: string;
    category: string;
    vendor: string | null;
    description: string;
    amount: number;
  }>;
  consultingProjects: ConsultingProjectRow[];
}) {
  const router = useRouter();
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    businessUnitId: "global",
    category: "ops_tax",
    vendor: "",
    amount: "",
    expenseDate: today,
    isRecurring: false,
    recurrenceInterval: "monthly",
    description: "",
    receiptUrl: "",
    nextBillingDate: ""
  });
  const [projectForm, setProjectForm] = useState({
    businessUnitId: businessUnits.find((unit) => unit.slug === "kerzie_ai")?.id ?? businessUnits[0]?.id ?? "",
    projectName: "",
    clientName: "",
    projectValue: "",
    startDate: today,
    endDate: "",
    status: "active",
    description: ""
  });
  const [paymentForms, setPaymentForms] = useState<Record<string, {
    amount: string;
    paymentDate: string;
    paymentMethod: "ach" | "check" | "stripe" | "cash";
    description: string;
    invoiceNumber: string;
    notes: string;
  }>>({});
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [savingPaymentForProjectId, setSavingPaymentForProjectId] = useState<string | null>(null);

  const recurringMonthlyTotal = recurringExpenses.filter((expense) => expense.isActive).reduce((sum, expense) => sum + expense.monthlyEquivalent, 0);
  const recurringAnnualTotal = recurringExpenses.filter((expense) => expense.isActive).reduce((sum, expense) => sum + expense.annualEquivalent, 0);

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpenseForm({
      businessUnitId: "global",
      category: "ops_tax",
      vendor: "",
      amount: "",
      expenseDate: today,
      isRecurring: false,
      recurrenceInterval: "monthly",
      description: "",
      receiptUrl: "",
      nextBillingDate: ""
    });
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingExpense(true);

    try {
      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : "/api/expenses";
      const method = editingExpenseId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          recurrenceInterval: expenseForm.isRecurring ? expenseForm.recurrenceInterval : "one_time"
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save expense.");
      }

      toast.success(editingExpenseId ? "Expense updated" : "Expense saved");
      resetExpenseForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setIsSavingExpense(false);
    }
  }

  function startEditingExpense(expense: RecurringExpenseRow) {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      businessUnitId: expense.businessUnitId ?? "global",
      category: expense.category,
      vendor: expense.vendor,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate,
      isRecurring: true,
      recurrenceInterval: expense.recurrenceInterval === "one_time" ? "monthly" : expense.recurrenceInterval,
      description: expense.description,
      receiptUrl: expense.receiptUrl ?? "",
      nextBillingDate: expense.nextBillingDate ?? ""
    });
  }

  async function deactivateExpense(expenseId: string) {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isActive: false
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to deactivate expense.");
      }

      toast.success("Recurring expense deactivated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not deactivate expense.");
    }
  }

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProject(true);

    try {
      const response = await fetch("/api/consulting-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...projectForm,
          projectValue: Number(projectForm.projectValue)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to create consulting project.");
      }

      toast.success("Consulting project created");
      setProjectForm((current) => ({
        ...current,
        projectName: "",
        clientName: "",
        projectValue: "",
        endDate: "",
        description: ""
      }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save consulting project.");
    } finally {
      setIsSavingProject(false);
    }
  }

  async function submitPayment(projectId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPaymentForProjectId(projectId);
    const payload = paymentForms[projectId];

    try {
      const response = await fetch("/api/consulting-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          amount: Number(payload.amount),
          paymentDate: payload.paymentDate,
          paymentMethod: payload.paymentMethod,
          description: payload.description,
          invoiceNumber: payload.invoiceNumber,
          notes: payload.notes
        })
      });
      const responsePayload = await response.json();

      if (!response.ok) {
        throw new Error(responsePayload.message ?? "Failed to log milestone payment.");
      }

      toast.success("Milestone payment logged");
      setPaymentForms((current) => ({
        ...current,
        [projectId]: {
          amount: "",
          paymentDate: today,
          paymentMethod: "ach",
          description: "",
          invoiceNumber: "",
          notes: ""
        }
      }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log milestone payment.");
    } finally {
      setSavingPaymentForProjectId(null);
    }
  }

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{currentMonthLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Expenses & Consulting</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Track recurring subscriptions, ad hoc expenses, and consulting project cash-in that feeds the Kerzie AI parent waterfall.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-6" onSubmit={submitExpense}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">{editingExpenseId ? "Edit recurring expense" : "Log expense"}</h2>
              <p className="mt-1 text-sm text-slate-400">Use one form for recurring subscriptions and one-off spend.</p>
            </div>
            {editingExpenseId ? (
              <Button type="button" variant="outline" className="border-slate-700 bg-transparent text-slate-200" onClick={resetExpenseForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Business unit</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                value={expenseForm.businessUnitId}
                onChange={(event) => setExpenseForm((current) => ({ ...current, businessUnitId: event.target.value }))}
              >
                <option value="global">Kerzie Global</option>
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Category</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                value={expenseForm.category}
                onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="ops_tax">Ops tax</option>
                <option value="marketing">Marketing</option>
                <option value="variable">Variable</option>
                <option value="one_time">One-time</option>
                <option value="capital">Capital</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Vendor</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                value={expenseForm.vendor}
                onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Amount</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                inputMode="decimal"
                required
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Date</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                type="date"
                required
                value={expenseForm.expenseDate}
                onChange={(event) => setExpenseForm((current) => ({ ...current, expenseDate: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Receipt URL</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                placeholder="https://drive.google.com/..."
                value={expenseForm.receiptUrl}
                onChange={(event) => setExpenseForm((current) => ({ ...current, receiptUrl: event.target.value }))}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-200">Description</span>
            <input
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
              required
              value={expenseForm.description}
              onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <input
                checked={expenseForm.isRecurring}
                className="h-4 w-4 accent-sky-400"
                type="checkbox"
                onChange={(event) => setExpenseForm((current) => ({ ...current, isRecurring: event.target.checked }))}
              />
              Recurring expense
            </label>

            {expenseForm.isRecurring ? (
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Cadence</span>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                  value={expenseForm.recurrenceInterval}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, recurrenceInterval: event.target.value }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
            ) : null}
          </div>

          {expenseForm.isRecurring && expenseForm.recurrenceInterval === "annual" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Next billing date</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                type="date"
                value={expenseForm.nextBillingDate}
                onChange={(event) => setExpenseForm((current) => ({ ...current, nextBillingDate: event.target.value }))}
              />
            </label>
          ) : null}

          <div className="flex justify-end">
            <Button className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={isSavingExpense} type="submit">
              {isSavingExpense ? "Saving..." : editingExpenseId ? "Save changes" : "Save expense"}
            </Button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-xl font-semibold text-slate-50">Recurring expense roster</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Monthly total</p>
              <p className="mt-3 text-2xl font-semibold text-amber-300">{formatCurrency(recurringMonthlyTotal)}</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Annual total</p>
              <p className="mt-3 text-2xl font-semibold text-violet-300">{formatCurrency(recurringAnnualTotal)}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Monthly</th>
                  <th className="px-4 py-3 text-left">Annual</th>
                  <th className="px-4 py-3 text-left">Next billing</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {recurringExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{expense.vendor}</div>
                      <div className="text-xs text-slate-500">{expense.description}</div>
                    </td>
                    <td className="px-4 py-3">{expense.businessUnitName}</td>
                    <td className="px-4 py-3 text-amber-300">{formatCurrency(expense.monthlyEquivalent)}</td>
                    <td className="px-4 py-3 text-violet-300">{formatCurrency(expense.annualEquivalent)}</td>
                    <td className="px-4 py-3">{expense.nextBillingDate ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-200" onClick={() => startEditingExpense(expense)}>
                          Edit
                        </Button>
                        {expense.isActive ? (
                          <Button type="button" size="sm" variant="outline" className="border-rose-500/30 bg-transparent text-rose-200" onClick={() => deactivateExpense(expense.id)}>
                            Deactivate
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">Inactive</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <h2 className="text-xl font-semibold text-slate-50">One-time expense log</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
              {oneTimeExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3">
                    {expense.business_unit_id
                      ? businessUnits.find((unit) => unit.id === expense.business_unit_id)?.name ?? "Unknown unit"
                      : "Kerzie Global"}
                  </td>
                  <td className="px-4 py-3">{expense.vendor ?? "—"}</td>
                  <td className="px-4 py-3 uppercase text-slate-500">{expense.category.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-amber-300">{formatCurrency(Number(expense.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-6" onSubmit={submitProject}>
          <h2 className="text-xl font-semibold text-slate-50">Consulting project tracker</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Business unit</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                value={projectForm.businessUnitId}
                onChange={(event) => setProjectForm((current) => ({ ...current, businessUnitId: event.target.value }))}
              >
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Project status</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100"
                value={projectForm.status}
                onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="paused">Paused</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Project name</span>
              <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" required value={projectForm.projectName} onChange={(event) => setProjectForm((current) => ({ ...current, projectName: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Client name</span>
              <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" required value={projectForm.clientName} onChange={(event) => setProjectForm((current) => ({ ...current, clientName: event.target.value }))} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Project value</span>
              <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" inputMode="decimal" required value={projectForm.projectValue} onChange={(event) => setProjectForm((current) => ({ ...current, projectValue: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Start date</span>
              <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" type="date" value={projectForm.startDate} onChange={(event) => setProjectForm((current) => ({ ...current, startDate: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">End date</span>
              <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" type="date" value={projectForm.endDate} onChange={(event) => setProjectForm((current) => ({ ...current, endDate: event.target.value }))} />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-200">Description</span>
            <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
          </label>

          <div className="flex justify-end">
            <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={isSavingProject} type="submit">
              {isSavingProject ? "Saving..." : "Create project"}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {consultingProjects.map((project) => {
            const paymentForm = paymentForms[project.id] ?? {
              amount: "",
              paymentDate: today,
              paymentMethod: "ach" as const,
              description: "",
              invoiceNumber: "",
              notes: ""
            };

            return (
              <div key={project.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">{project.projectName}</h3>
                    <p className="mt-1 text-sm text-slate-400">{project.clientName} • {project.businessUnitName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{project.status}</p>
                    <p className="mt-2 text-sm text-slate-300">Remaining {formatCurrency(project.remainingBalance)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Project value</p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">{formatCurrency(project.projectValue)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Collected</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(project.collectedToDate)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Timeline</p>
                    <p className="mt-2 text-sm text-slate-300">{project.startDate} {project.endDate ? `to ${project.endDate}` : "open-ended"}</p>
                  </div>
                </div>

                <form className="mt-5 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4" onSubmit={(event) => submitPayment(project.id, event)}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">Milestone payment</span>
                      <input className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" inputMode="decimal" required value={paymentForm.amount} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, amount: event.target.value } }))} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">Date</span>
                      <input className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" type="date" required value={paymentForm.paymentDate} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, paymentDate: event.target.value } }))} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">Method</span>
                      <select className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" value={paymentForm.paymentMethod} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, paymentMethod: event.target.value as "ach" | "check" | "stripe" | "cash" } }))}>
                        <option value="ach">ACH</option>
                        <option value="check">Check</option>
                        <option value="stripe">Stripe</option>
                        <option value="cash">Cash</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <input className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" placeholder="Description" value={paymentForm.description} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, description: event.target.value } }))} />
                    <input className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" placeholder="Invoice number" value={paymentForm.invoiceNumber} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, invoiceNumber: event.target.value } }))} />
                    <input className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100" placeholder="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForms((current) => ({ ...current, [project.id]: { ...paymentForm, notes: event.target.value } }))} />
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={savingPaymentForProjectId === project.id} type="submit">
                      {savingPaymentForProjectId === project.id ? "Saving..." : "Log payment"}
                    </Button>
                  </div>
                </form>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-left">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                      {project.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3">{payment.paymentDate}</td>
                          <td className="px-4 py-3 text-emerald-300">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3">{payment.description ?? "Milestone payment"}</td>
                          <td className="px-4 py-3">{payment.invoiceNumber ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
