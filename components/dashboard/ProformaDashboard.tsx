import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getProformaDashboardData } from "@/lib/dashboard-data";

export async function ProformaDashboard() {
  const { currentMonthLabel, units, proformaScenarios } = await getProformaDashboardData();

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{currentMonthLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Proforma</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Scenario planning by business unit. Use this area to model pricing, subscriber growth, costs, and payout outcomes over time.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {units
          .filter((unit) => unit.routePath)
          .map((unit) => {
            const scenarioCount = proformaScenarios.filter((scenario) => scenario.business_unit_id === unit.id).length;

            return (
              <div key={unit.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Scenario Planning</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">{unit.name}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {scenarioCount > 0
                    ? `${scenarioCount} saved scenario${scenarioCount === 1 ? "" : "s"} in Supabase.`
                    : "No saved scenarios yet. Add one when you are ready to model this unit."}
                </p>
                <Button asChild className="mt-6 bg-sky-500 text-slate-950 hover:bg-sky-400">
                  <Link href={unit.routePath ?? "/dashboard"}>
                    Open {unit.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
      </section>
    </main>
  );
}
