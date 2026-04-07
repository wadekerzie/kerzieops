"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface RevenueConfirmation {
  confirmation: string;
  payoutDelta: {
    wade: number | null;
    gavin: number | null;
  };
}

export function ManualRevenueEntryForm({
  businessUnits,
  today,
  silverNaturalsAgreement
}: {
  businessUnits: Array<{ id: string; name: string; slug: string }>;
  today: string;
  silverNaturalsAgreement: {
    businessUnitId: string | null;
    finalized: boolean;
    bannerMessage: string | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    businessUnitId: businessUnits[0]?.id ?? "",
    revenueType: "one_time",
    grossAmount: "",
    paymentMethod: "ach",
    transactionDate: today,
    customerName: "",
    description: "",
    invoiceNumber: "",
    notes: "",
    isSetupFee: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<RevenueConfirmation | null>(null);

  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((unit) => unit.id === form.businessUnitId) ?? null,
    [businessUnits, form.businessUnitId]
  );
  const showSilverNaturalsBanner =
    selectedBusinessUnit?.slug === "silver_naturals" && !silverNaturalsAgreement.finalized;

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setConfirmation(null);

    try {
      const response = await fetch("/api/revenue-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessUnitId: form.businessUnitId,
          source: form.paymentMethod === "stripe" ? "stripe" : form.paymentMethod,
          revenueType: form.revenueType,
          grossAmount: Number(form.grossAmount),
          paymentMethod: form.paymentMethod,
          transactionDate: form.transactionDate,
          customerName: form.customerName,
          description: form.description,
          invoiceNumber: form.invoiceNumber,
          notes: form.notes,
          isSetupFee: form.isSetupFee
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save revenue.");
      }

      setConfirmation({
        confirmation: payload.confirmation,
        payoutDelta: payload.payoutDelta
      });
      toast.success("Revenue saved");
      setForm((current) => ({
        ...current,
        grossAmount: "",
        customerName: "",
        description: "",
        invoiceNumber: "",
        notes: "",
        isSetupFee: false,
        revenueType: "one_time"
      }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save revenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(135deg,_rgba(2,6,23,1),_rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-slate-950/40 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Manual Revenue Entry</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Log Revenue Fast</h1>
            <p className="mt-3 text-sm text-slate-400">
              Built for quick, thumb-friendly cash logging after a deal closes. Every save updates the month snapshot immediately.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="h-5 w-5" />
              Setup fees bypass marketing and reserve sweeps.
            </div>
          </div>
        </div>
      </section>

      {showSilverNaturalsBanner ? (
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          <p className="text-sm font-medium">{silverNaturalsAgreement.bannerMessage}</p>
        </section>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Business unit</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={form.businessUnitId}
                onChange={(event) => updateField("businessUnitId", event.target.value)}
                required
              >
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Revenue type</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={form.revenueType}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  updateField("revenueType", nextValue);
                  if (nextValue === "setup_fee") {
                    updateField("isSetupFee", true);
                  }
                }}
              >
                <option value="recurring">Recurring</option>
                <option value="one_time">One-time</option>
                <option value="setup_fee">Setup fee</option>
                <option value="commission">Commission</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Gross amount</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={form.grossAmount}
                onChange={(event) => updateField("grossAmount", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Payment method</span>
              <select
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={form.paymentMethod}
                onChange={(event) => updateField("paymentMethod", event.target.value)}
              >
                <option value="ach">ACH</option>
                <option value="check">Check</option>
                <option value="stripe">Stripe</option>
                <option value="cash">Cash</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Transaction date</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                type="date"
                required
                value={form.transactionDate}
                onChange={(event) => updateField("transactionDate", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Customer / client</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Acme Inc."
                value={form.customerName}
                onChange={(event) => updateField("customerName", event.target.value)}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-200">Description</span>
            <input
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="ACH received for implementation package"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Invoice number</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="INV-204"
                value={form.invoiceNumber}
                onChange={(event) => updateField("invoiceNumber", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Notes</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Paid in full"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <input
              checked={form.isSetupFee}
              className="mt-1 h-4 w-4 accent-emerald-400"
              type="checkbox"
              onChange={(event) => updateField("isSetupFee", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-slate-100">Is this a setup fee?</span>
              <span className="mt-1 block text-xs text-slate-400">
                Setup fees skip the marketing fund and operating reserve sweep and flow directly to the distributable pool.
              </span>
            </span>
          </label>

          <div className="flex justify-end">
            <Button className="h-12 rounded-2xl bg-emerald-400 px-6 text-slate-950 hover:bg-emerald-300" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save revenue"}
            </Button>
          </div>
        </form>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Selected Unit</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50">{selectedBusinessUnit?.name ?? "Choose a unit"}</h2>
            <p className="mt-3 text-sm text-slate-400">
              Revenue saves here immediately update the monthly waterfall snapshot and partner payout view.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">What Happens On Save</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                Revenue lands in `revenue_events` with the manual bookkeeping metadata attached.
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                Setup fees route straight to the pool instead of taking the marketing/reserve haircut.
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                The month snapshot recalculates instantly so the close checklist stays current.
              </div>
            </div>
          </div>

          {confirmation ? (
            <div className="rounded-3xl border border-sky-500/30 bg-sky-500/10 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-sky-200">Confirmation</p>
              <p className="mt-3 text-lg font-medium text-white">{confirmation.confirmation}</p>
              {confirmation.payoutDelta.wade !== null && confirmation.payoutDelta.gavin !== null ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wade</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-300">
                      {formatCurrency(confirmation.payoutDelta.wade)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gavin</p>
                    <p className="mt-2 text-2xl font-semibold text-violet-300">
                      {formatCurrency(confirmation.payoutDelta.gavin)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-400">
              Save a revenue event to see the immediate Wade/Gavin payout impact here.
            </div>
          )}

          <Button asChild className="h-12 rounded-2xl bg-slate-100 text-slate-950 hover:bg-white">
            <a href="/dashboard/close">
              Go to monthly close
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </section>
      </section>
    </main>
  );
}
