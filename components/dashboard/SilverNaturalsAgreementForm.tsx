"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SilverNaturalsAgreementForm({
  finalized,
  wadePercentage,
  gavinPercentage
}: {
  finalized: boolean;
  wadePercentage: number | null;
  gavinPercentage: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(wadePercentage?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/settings/silver-naturals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wadePercentage: Number(value)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save agreement percentage.");
      }

      toast.success("Silver Naturals agreement percentage saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save percentage.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Silver Naturals</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-50">Agreement Finalization</h2>
          <p className="mt-2 text-sm text-amber-100/90">
            Revenue can be logged now, but partner payout calculations stay suspended until Wade&apos;s percentage is entered here.
          </p>
          {finalized ? (
            <p className="mt-4 text-sm text-slate-200">
              Current split: Wade {wadePercentage?.toFixed(2)}% / Gavin {gavinPercentage?.toFixed(2)}%
            </p>
          ) : (
            <p className="mt-4 text-sm text-amber-100">
              No finalized percentage is stored yet. Pending Silver Naturals revenue will recalculate automatically after you save one.
            </p>
          )}
        </div>

        <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-100">Wade percentage</span>
            <input
              className="h-12 w-full rounded-2xl border border-amber-500/30 bg-slate-950/80 px-4 text-sm text-slate-100"
              inputMode="decimal"
              max="100"
              min="0"
              placeholder="0.00"
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <Button className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : finalized ? "Update percentage" : "Finalize percentage"}
          </Button>
        </form>
      </div>
    </div>
  );
}
