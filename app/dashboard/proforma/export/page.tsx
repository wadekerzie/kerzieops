import { notFound } from "next/navigation";

import { ProformaPrintButton } from "@/components/dashboard/ProformaPrintButton";
import { ProformaScenarioReport } from "@/components/shared/ProformaScenarioReport";
import { deserializeProformaState, generateProforma, type ProformaInput } from "@/lib/proforma";
import { getProformaWorkspaceData, getSavedProformaScenarioById } from "@/lib/proforma-data";

async function resolveScenario(searchParams?: { state?: string; scenario?: string }) {
  if (searchParams?.state) {
    const input = deserializeProformaState(searchParams.state);
    const workspace = await getProformaWorkspaceData();
    const unitName = workspace.units.find((unit) => unit.id === input.businessUnitId)?.name ?? input.businessUnitId;

    return {
      unitName,
      input,
      result: generateProforma(input)
    };
  }

  if (searchParams?.scenario) {
    const scenario = await getSavedProformaScenarioById(searchParams.scenario);

    if (!scenario) {
      return null;
    }

    const input: ProformaInput = {
      businessUnitId: scenario.businessUnitId,
      scenarioName: scenario.scenarioName,
      startMonth: new Date(scenario.startMonth),
      assumptions: scenario.assumptions
    };

    return {
      unitName: scenario.businessUnitSlug.replace(/_/g, " "),
      input,
      result: scenario.result
    };
  }

  return null;
}

export default async function ProformaExportPage({
  searchParams
}: {
  searchParams?: {
    state?: string;
    scenario?: string;
    compareScenario?: string;
  };
}) {
  const primary = await resolveScenario(searchParams);

  if (!primary) {
    notFound();
  }

  const compare = searchParams?.compareScenario ? await getSavedProformaScenarioById(searchParams.compareScenario) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-8 bg-white px-6 py-10 text-slate-900">
      <section className="flex items-start justify-between gap-6 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Kerzie AI Solutions</p>
          <h1 className="mt-3 text-4xl font-semibold">Proforma Export</h1>
          <p className="mt-2 text-sm text-slate-600">Print or save this page as PDF for investor or partner review.</p>
        </div>
        <ProformaPrintButton />
      </section>

      <ProformaScenarioReport unitName={primary.unitName} input={primary.input} result={primary.result} />

      {compare ? (
        <ProformaScenarioReport
          unitName={compare.businessUnitSlug.replace(/_/g, " ")}
          input={{
            businessUnitId: compare.businessUnitId,
            scenarioName: compare.scenarioName,
            startMonth: new Date(compare.startMonth),
            assumptions: compare.assumptions
          }}
          result={compare.result}
          titleSuffix="(Comparison)"
        />
      ) : null}
    </main>
  );
}
