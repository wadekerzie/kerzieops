"use client";

import { useState } from "react";

import { Slider } from "@/components/ui/slider";
import { calculateZorliUnitEconomics, type PartnerSplitInput } from "@/lib/waterfall";
import { formatCurrency } from "@/lib/utils";

function clampSubscriberCount(value: number) {
  return Math.min(2000, Math.max(100, value));
}

export function HunterGrowthSimulator({
  initialSubscribers,
  monthlyPrice,
  appleFeePercentage,
  avgQueriesPerUserPerMonth,
  llmCostPerQuery,
  opsTaskAllocated,
  marketingFundPercentage,
  operatingReservePercentage,
  marketingContributionsApplied,
  partnerSplits,
  hunterPartnerId
}: {
  initialSubscribers: number;
  monthlyPrice: number;
  appleFeePercentage: number;
  avgQueriesPerUserPerMonth: number;
  llmCostPerQuery: number;
  opsTaskAllocated: number;
  marketingFundPercentage: number;
  operatingReservePercentage: number;
  marketingContributionsApplied: number;
  partnerSplits: PartnerSplitInput[];
  hunterPartnerId: string;
}) {
  const [subscriberCount, setSubscriberCount] = useState([clampSubscriberCount(initialSubscribers)]);
  const economics = calculateZorliUnitEconomics({
    subscriberCount: subscriberCount[0],
    monthlyPrice,
    appleFeePercentage,
    avgQueriesPerUserPerMonth,
    llmCostPerQuery,
    opsTaskAllocated,
    marketingFundPercentage,
    operatingReservePercentage,
    marketingContributionsApplied,
    partnerSplits
  });
  const hunterMonthlyDistribution =
    economics.partnerPayouts.find((payout) => payout.partnerId === hunterPartnerId)?.amountTotal ?? 0;

  return (
    <div className="space-y-6 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Subscriber Growth Simulator</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-50">{subscriberCount[0].toLocaleString()} subscribers</h3>
          <p className="mt-2 text-sm text-slate-400">
            See Hunter&apos;s projected monthly distribution update in real time as Zorli grows.
          </p>
        </div>
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Projected Hunter Distribution</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {formatCurrency(hunterMonthlyDistribution)}
          </p>
        </div>
      </div>

      <Slider max={2000} min={100} step={25} value={subscriberCount} onValueChange={setSubscriberCount} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gross Revenue</p>
          <p className="mt-2 text-xl font-semibold text-slate-50">{formatCurrency(economics.grossRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Distributable Pool</p>
          <p className="mt-2 text-xl font-semibold text-sky-300">{formatCurrency(economics.distributablePool)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Net Per Subscriber To Pool</p>
          <p className="mt-2 text-xl font-semibold text-violet-300">{formatCurrency(economics.perSubscriberNetToPool)}</p>
        </div>
      </div>
    </div>
  );
}
