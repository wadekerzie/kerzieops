"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { CopyTokenLinkButton } from "@/components/dashboard/CopyTokenLinkButton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateProforma, serializeProformaState, type ProformaAssumptions, type ProformaInput, type ProformaResult } from "@/lib/proforma";
import { getStakeholderSharePath } from "@/lib/tokens";
import { formatCurrency } from "@/lib/utils";
import type { ProformaUnitContext, SavedProformaScenario } from "@/lib/proforma-data";

function cloneAssumptions<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hydrateAssumptions(unit: ProformaUnitContext, assumptions?: ProformaAssumptions): ProformaAssumptions {
  return {
    ...(cloneAssumptions(assumptions ?? unit.defaultAssumptions) as unknown as Record<string, unknown>),
    partnerSplits: unit.partnerSplits,
    opsTaskAllocated: unit.opsTaskAllocated,
    marketingFundPercentage: unit.marketingFundPercentage,
    operatingReservePercentage: unit.operatingReservePercentage
  } as ProformaAssumptions;
}

function buildInput(unit: ProformaUnitContext, scenarioName: string, startMonth: string, assumptions: ProformaAssumptions): ProformaInput {
  return {
    businessUnitId: unit.id,
    scenarioName,
    startMonth: new Date(`${startMonth}T00:00:00`),
    assumptions: hydrateAssumptions(unit, assumptions)
  };
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <span className="text-sm text-sky-300">{displayValue}</span>
      </div>
      <Slider max={max} min={min} step={step} value={[value]} onValueChange={(next) => onChange(next[0] ?? value)} />
    </div>
  );
}

function MetricCallout({
  title,
  value,
  tone = "sky"
}: {
  title: string;
  value: string;
  tone?: "sky" | "emerald" | "violet" | "amber";
}) {
  const tones = {
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200"
  };

  return (
    <div className={`rounded-3xl border p-5 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ScenarioChart({ result }: { result: ProformaResult }) {
  const chartData = result.months.map((month) => ({
    month: month.monthLabel.slice(0, 3),
    grossRevenue: month.grossRevenue,
    platformFees: month.platformFees,
    variableCosts: month.variableCosts,
    opsTaskAllocated: month.opsTaskAllocated,
    marketingFund: month.marketingFund,
    operatingReserve: month.operatingReserve,
    distributablePool: Math.max(0, month.distributablePool)
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.3)" }}
            contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: 16 }}
            formatter={(value: number) => formatCurrency(Number(value))}
          />
          <Bar dataKey="platformFees" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="variableCosts" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
          <Bar dataKey="opsTaskAllocated" stackId="a" fill="#fb7185" radius={[0, 0, 0, 0]} />
          <Bar dataKey="marketingFund" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
          <Bar dataKey="operatingReserve" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="distributablePool" stackId="a" fill="#10b981" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PayoutMatrix({ result }: { result: ProformaResult }) {
  const partnerMap = new Map<string, { percentage: number; values: number[] }>();

  for (const month of result.months) {
    for (const payout of month.partnerPayouts) {
      const existing = partnerMap.get(payout.name) ?? {
        percentage: payout.percentage,
        values: Array.from({ length: result.months.length }, () => 0)
      };
      existing.percentage = payout.percentage;
      existing.values[result.months.indexOf(month)] = payout.amount;
      partnerMap.set(payout.name, existing);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Partner</th>
            {result.months.map((month) => (
              <th key={month.monthLabel} className="px-4 py-3 text-left">{month.monthLabel.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/50 text-slate-200">
          {Array.from(partnerMap.entries()).map(([partnerName, partner]) => (
            <tr key={partnerName}>
              <td className="px-4 py-3">
                <div className="font-medium">{partnerName}</div>
                <div className="text-xs text-slate-500">{partner.percentage.toFixed(1)}%</div>
              </td>
              {partner.values.map((value, index) => (
                <td key={`${partnerName}-${index}`} className="px-4 py-3 text-violet-300">{formatCurrency(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioPanel({
  unit,
  result,
  scenarioName,
  mode
}: {
  unit: ProformaUnitContext;
  result: ProformaResult;
  scenarioName: string;
  mode: "active" | "compare";
}) {
  const finalMonth = result.months[result.months.length - 1];
  const monthOne = result.months[0];
  const hunterPayout = finalMonth?.partnerPayouts.find((payout) => payout.name.includes("Hunter"))?.amount ?? 0;
  const wadePayout = finalMonth?.partnerPayouts.find((payout) => payout.name.includes("Wade"))?.amount ?? 0;
  const gavinPayout = finalMonth?.partnerPayouts.find((payout) => payout.name.includes("Gavin"))?.amount ?? 0;
  const breakevenMonth = result.breakeven.monthIndex ? result.months[result.breakeven.monthIndex - 1] : null;
  const callouts =
    unit.slug === "zorli"
      ? [
          {
            title: "Hunter monthly take",
            value: `At ${finalMonth?.subscriberCount ?? 0} subscribers, Hunter receives ${formatCurrency(hunterPayout)}/month`,
            tone: "violet" as const
          },
          {
            title: "Wade monthly take",
            value: `At ${finalMonth?.subscriberCount ?? 0} subscribers, Wade receives ${formatCurrency(wadePayout)}/month`,
            tone: "emerald" as const
          },
          {
            title: "Breakeven",
            value: breakevenMonth ? `Zorli breaks even at month ${result.breakeven.monthIndex} with ${breakevenMonth.subscriberCount ?? 0} subscribers` : "Zorli does not break even in this 12-month window",
            tone: "sky" as const
          },
          {
            title: "Apple fees annualized",
            value: `Apple fees cost you ${formatCurrency(result.totals.platformFees)} annually at this growth rate`,
            tone: "amber" as const
          },
          {
            title: "Month 12 LLM costs",
            value: `LLM costs at this usage level: ${formatCurrency(finalMonth?.variableCosts ?? 0)}/month by month 12`,
            tone: "amber" as const
          }
        ]
      : unit.slug === "gotaguuy"
        ? [
            {
              title: "Wade monthly take",
              value: `At ${finalMonth?.jobCount ?? 0} jobs/month, Wade receives ${formatCurrency(wadePayout)}/month`,
              tone: "emerald" as const
            },
            {
              title: "Gavin monthly take",
              value: `At ${finalMonth?.jobCount ?? 0} jobs/month, Gavin receives ${formatCurrency(gavinPayout)}/month`,
              tone: "violet" as const
            },
            {
              title: "Variable costs",
              value: `GotaGuy variable costs at this volume: ${formatCurrency(finalMonth?.variableCosts ?? 0)}/month`,
              tone: "amber" as const
            }
          ]
        : unit.slug === "silver_moon"
          ? [
              {
                title: "Kerzie AI earnings",
                value: `If Gerry sells ${monthOne?.transactionCount ?? 0} generators this month at ${formatCurrency((monthOne?.grossRevenue ?? 0) / Math.max(1, monthOne?.transactionCount ?? 1))} each, Kerzie AI earns ${formatCurrency(monthOne?.distributablePool ?? 0)}`,
                tone: "sky" as const
              },
              {
                title: "Partner take",
                value: `Wade's take: ${formatCurrency(wadePayout)} | Gavin's take: ${formatCurrency(gavinPayout)}`,
                tone: "violet" as const
              }
            ]
          : [
              {
                title: "Wade monthly take",
                value: `At ${finalMonth?.activeSubscriptionCount ?? 0} active subscriptions, Wade receives ${formatCurrency(wadePayout)}/month`,
                tone: "emerald" as const
              },
              {
                title: "Gavin monthly take",
                value: `At ${finalMonth?.activeSubscriptionCount ?? 0} active subscriptions, Gavin receives ${formatCurrency(gavinPayout)}/month`,
                tone: "violet" as const
              },
              {
                title: "Scout commissions",
                value: `Scout commissions at this volume: ${formatCurrency(finalMonth?.variableCosts ?? 0)}/month`,
                tone: "amber" as const
              }
            ];

  return (
    <section className="space-y-6 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{mode === "compare" ? "Comparison" : unit.name}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50">{scenarioName}</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">12-Month Pool</p>
          <p className="mt-2 text-xl font-semibold text-emerald-300">{formatCurrency(result.totals.distributablePool)}</p>
        </div>
      </div>

      <ScenarioChart result={result} />

      <div className={`grid gap-4 ${callouts.length >= 4 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3"}`}>
        {callouts.map((callout) => (
          <MetricCallout key={callout.title} title={callout.title} value={callout.value} tone={callout.tone} />
        ))}
      </div>

      <PayoutMatrix result={result} />
    </section>
  );
}

export function ProformaWorkspace({
  currentMonthLabel,
  units,
  savedScenarios,
  initialUnitSlug,
  initialScenarioId,
  initialCompareId
}: {
  currentMonthLabel: string;
  units: ProformaUnitContext[];
  savedScenarios: SavedProformaScenario[];
  initialUnitSlug?: string;
  initialScenarioId?: string;
  initialCompareId?: string;
}) {
  const defaultUnit = units.find((unit) => unit.slug === initialUnitSlug) ?? units[0];
  const initialScenario = savedScenarios.find((scenario) => scenario.id === initialScenarioId && scenario.businessUnitId === defaultUnit?.id) ?? null;
  const [activeUnitId, setActiveUnitId] = useState(defaultUnit?.id ?? "");
  const [scenarioName, setScenarioName] = useState(initialScenario?.scenarioName ?? "Scenario A");
  const [startMonth, setStartMonth] = useState((initialScenario?.startMonth ?? new Date().toISOString()).slice(0, 7));
  const [draftAssumptions, setDraftAssumptions] = useState<ProformaAssumptions>(
    hydrateAssumptions(defaultUnit, initialScenario?.assumptions)
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario?.id ?? "");
  const [compareScenarioId, setCompareScenarioId] = useState(initialCompareId ?? "");
  const [selectedShareToken, setSelectedShareToken] = useState(defaultUnit?.shareTokens[0]?.token ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredAssumptions = useDeferredValue(draftAssumptions);

  const activeUnit = units.find((unit) => unit.id === activeUnitId) ?? units[0];
  const scenariosForUnit = savedScenarios.filter((scenario) => scenario.businessUnitId === activeUnit?.id);
  const compareScenario = scenariosForUnit.find((scenario) => scenario.id === compareScenarioId) ?? null;
  const activeResult = generateProforma(buildInput(activeUnit, scenarioName, `${startMonth}-01`, deferredAssumptions));
  const exportState = serializeProformaState(buildInput(activeUnit, scenarioName, `${startMonth}-01`, deferredAssumptions));
  const sharePath =
    selectedShareToken && selectedScenarioId
      ? `${getStakeholderSharePath(selectedShareToken)}?proformaScenario=${selectedScenarioId}${compareScenarioId ? `&compareScenario=${compareScenarioId}` : ""}`
      : "";

  function loadScenario(scenarioId: string) {
    const scenario = scenariosForUnit.find((entry) => entry.id === scenarioId);

    if (!scenario) {
      return;
    }

    startTransition(() => {
      setSelectedScenarioId(scenario.id);
      setScenarioName(scenario.scenarioName);
      setStartMonth(scenario.startMonth.slice(0, 7));
      setDraftAssumptions(hydrateAssumptions(activeUnit, scenario.assumptions));
    });
  }

  function changeUnit(nextUnitId: string) {
    const nextUnit = units.find((unit) => unit.id === nextUnitId);

    if (!nextUnit) {
      return;
    }

    startTransition(() => {
      setActiveUnitId(nextUnit.id);
      setScenarioName("Scenario A");
      setStartMonth(new Date().toISOString().slice(0, 7));
      setDraftAssumptions(hydrateAssumptions(nextUnit));
      setSelectedScenarioId("");
      setCompareScenarioId("");
      setSelectedShareToken(nextUnit.shareTokens[0]?.token ?? "");
    });
  }

  function updateAssumption(key: string, value: number) {
    setDraftAssumptions((current) => ({
      ...current,
      [key]: value
    }) as ProformaAssumptions);
  }

  async function saveScenario() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/proforma/scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessUnitId: activeUnit.id,
          scenarioName,
          startMonth: `${startMonth}-01`,
          assumptions: draftAssumptions
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save scenario.");
      }

      setSelectedScenarioId(payload.scenarioId ?? "");
      toast.success("Scenario saved");
      window.history.replaceState({}, "", `/dashboard/proforma?unit=${activeUnit.slug}&scenario=${payload.scenarioId}`);
      startTransition(() => {
        location.reload();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save scenario.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderControls() {
    if (activeUnit.slug === "zorli") {
      const assumptions = draftAssumptions as Extract<ProformaAssumptions, { startingSubscribers: number }>;

      return (
        <div className="grid gap-4 md:grid-cols-2">
          <SliderField label="Starting subscribers" value={assumptions.startingSubscribers} min={0} max={1000} step={10} displayValue={`${assumptions.startingSubscribers}`} onChange={(value) => updateAssumption("startingSubscribers", value)} />
          <SliderField label="Monthly growth rate" value={assumptions.monthlyGrowthRate} min={0} max={20} step={0.5} displayValue={`${assumptions.monthlyGrowthRate.toFixed(1)}%`} onChange={(value) => updateAssumption("monthlyGrowthRate", value)} />
          <SliderField label="Churn rate" value={assumptions.churnRate ?? 5} min={0} max={15} step={0.5} displayValue={`${(assumptions.churnRate ?? 5).toFixed(1)}%`} onChange={(value) => updateAssumption("churnRate", value)} />
          <SliderField label="Avg queries / user / month" value={assumptions.avgQueriesPerUserPerMonth ?? 10} min={1} max={50} step={1} displayValue={`${assumptions.avgQueriesPerUserPerMonth ?? 10}`} onChange={(value) => updateAssumption("avgQueriesPerUserPerMonth", value)} />
          <SliderField label="LLM cost per query" value={assumptions.llmCostPerQuery ?? 0.02} min={0.01} max={0.05} step={0.001} displayValue={formatCurrency(assumptions.llmCostPerQuery ?? 0.02)} onChange={(value) => updateAssumption("llmCostPerQuery", Number(value.toFixed(3)))} />
          <SliderField label="Monthly marketing spend" value={assumptions.marketingSpendMonthly} min={0} max={5000} step={50} displayValue={formatCurrency(assumptions.marketingSpendMonthly)} onChange={(value) => updateAssumption("marketingSpendMonthly", value)} />
        </div>
      );
    }

    if (activeUnit.slug === "gotaguuy") {
      const assumptions = draftAssumptions as Extract<ProformaAssumptions, { startingJobsPerMonth: number }>;

      return (
        <div className="grid gap-4 md:grid-cols-2">
          <SliderField label="Jobs per month (month 1)" value={assumptions.startingJobsPerMonth} min={0} max={500} step={5} displayValue={`${assumptions.startingJobsPerMonth}`} onChange={(value) => updateAssumption("startingJobsPerMonth", value)} />
          <SliderField label="Monthly job growth rate" value={assumptions.monthlyGrowthRate} min={0} max={30} step={0.5} displayValue={`${assumptions.monthlyGrowthRate.toFixed(1)}%`} onChange={(value) => updateAssumption("monthlyGrowthRate", value)} />
          <SliderField label="Platform fee per job" value={assumptions.platformFeePerJob ?? 25} min={15} max={50} step={1} displayValue={formatCurrency(assumptions.platformFeePerJob ?? 25)} onChange={(value) => updateAssumption("platformFeePerJob", value)} />
          <SliderField label="Average job value" value={assumptions.avgJobValue} min={100} max={2000} step={25} displayValue={formatCurrency(assumptions.avgJobValue)} onChange={(value) => updateAssumption("avgJobValue", value)} />
        </div>
      );
    }

    if (activeUnit.slug === "silver_moon") {
      const assumptions = draftAssumptions as Extract<ProformaAssumptions, { startingMonthlyAttributedSales: number }>;
      const generatorsSold = Math.round((assumptions.startingMonthlyAttributedSales / (assumptions.avgTransactionValue ?? 1250)) || 0);

      return (
        <div className="grid gap-4 md:grid-cols-2">
          <SliderField label="Generators sold per month" value={generatorsSold} min={0} max={50} step={1} displayValue={`${generatorsSold}`} onChange={(value) => {
            updateAssumption("transactionsPerMonth", value);
            updateAssumption("startingMonthlyAttributedSales", value * (assumptions.avgTransactionValue ?? 1250));
          }} />
          <SliderField label="Average generator price" value={assumptions.avgTransactionValue ?? 1250} min={500} max={2500} step={50} displayValue={formatCurrency(assumptions.avgTransactionValue ?? 1250)} onChange={(value) => {
            updateAssumption("avgTransactionValue", value);
            updateAssumption("startingMonthlyAttributedSales", (assumptions.transactionsPerMonth ?? generatorsSold) * value);
          }} />
        </div>
      );
    }

    const assumptions = draftAssumptions as Extract<ProformaAssumptions, { startingActiveSubscriptions: number }>;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SliderField label="Active subscriptions" value={assumptions.startingActiveSubscriptions} min={0} max={200} step={1} displayValue={`${assumptions.startingActiveSubscriptions}`} onChange={(value) => updateAssumption("startingActiveSubscriptions", value)} />
        <SliderField label="Monthly new sales" value={assumptions.monthlyNewSubscriptions} min={0} max={20} step={1} displayValue={`${assumptions.monthlyNewSubscriptions}`} onChange={(value) => updateAssumption("monthlyNewSubscriptions", value)} />
        <SliderField label="Monthly churn" value={assumptions.monthlyChurn} min={0} max={10} step={0.5} displayValue={`${assumptions.monthlyChurn.toFixed(1)}%`} onChange={(value) => updateAssumption("monthlyChurn", value)} />
        <SliderField label="Monthly subscription value" value={assumptions.monthlySubscriptionValue} min={200} max={2000} step={25} displayValue={formatCurrency(assumptions.monthlySubscriptionValue)} onChange={(value) => updateAssumption("monthlySubscriptionValue", value)} />
      </div>
    );
  }

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{currentMonthLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Proforma Scenario Engine</h1>
        <p className="mt-3 max-w-4xl text-sm text-slate-400">
          Model what growth means in dollars to every stakeholder. All slider updates run locally in the browser with no server roundtrip.
        </p>
      </section>

      <Tabs value={activeUnit.slug} onValueChange={(slug) => changeUnit(units.find((unit) => unit.slug === slug)?.id ?? activeUnit.id)}>
        <TabsList className="h-auto w-full justify-start gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
          {units.map((unit) => (
            <TabsTrigger key={unit.id} value={unit.slug} className="rounded-xl px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-950">
              {unit.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {units.map((unit) => (
          <TabsContent key={unit.id} value={unit.slug} className="space-y-8">
            {unit.id === activeUnit.id ? (
              <>
                <section className={compareScenario ? "space-y-6" : "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"}>
                  <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-200">Scenario name</span>
                        <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-200">Start month</span>
                        <input className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={isSaving || isPending} onClick={saveScenario}>
                        {isSaving ? "Saving..." : "Save scenario"}
                      </Button>
                      <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800">
                        <a href={`/dashboard/proforma/export?state=${encodeURIComponent(exportState)}${compareScenarioId ? `&compareScenario=${encodeURIComponent(compareScenarioId)}` : ""}`} target="_blank" rel="noreferrer">
                          Export PDF
                        </a>
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-200">Load saved scenario</span>
                        <select className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" value={selectedScenarioId} onChange={(event) => {
                          setSelectedScenarioId(event.target.value);
                          if (event.target.value) {
                            loadScenario(event.target.value);
                          }
                        }}>
                          <option value="">Draft scenario</option>
                          {scenariosForUnit.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>{scenario.scenarioName}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-200">Compare against</span>
                        <select className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" value={compareScenarioId} onChange={(event) => setCompareScenarioId(event.target.value)}>
                          <option value="">No comparison</option>
                          {scenariosForUnit.filter((scenario) => scenario.id !== selectedScenarioId).map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>{scenario.scenarioName}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-200">Share using stakeholder token</span>
                        <select className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100" value={selectedShareToken} onChange={(event) => setSelectedShareToken(event.target.value)}>
                          <option value="">Select a token</option>
                          {unit.shareTokens.map((token) => (
                            <option key={token.id} value={token.token}>{token.partnerName}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-end">
                        {sharePath ? <CopyTokenLinkButton path={sharePath} /> : <Button type="button" variant="outline" className="border-slate-700 bg-transparent text-slate-400" disabled>Save scenario to share</Button>}
                      </div>
                    </div>

                    {renderControls()}
                  </div>

                  {compareScenario ? null : <ScenarioPanel unit={activeUnit} result={activeResult} scenarioName={scenarioName} mode="active" />}
                </section>

                {compareScenario ? (
                  <section className="grid gap-6 xl:grid-cols-2">
                    <ScenarioPanel unit={activeUnit} result={activeResult} scenarioName={scenarioName} mode="active" />
                    <ScenarioPanel unit={activeUnit} result={compareScenario.result} scenarioName={compareScenario.scenarioName} mode="compare" />
                  </section>
                ) : null}
              </>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
