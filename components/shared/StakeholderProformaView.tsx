import { ProformaScenarioReport } from "@/components/shared/ProformaScenarioReport";
import type { ProformaInput, ProformaResult } from "@/lib/proforma";

export function StakeholderProformaView({
  partnerName,
  unitName,
  input,
  result,
  compare
}: {
  partnerName: string;
  unitName: string;
  input: ProformaInput;
  result: ProformaResult;
  compare?: {
    unitName: string;
    input: ProformaInput;
    result: ProformaResult;
  } | null;
}) {
  return (
    <main className="min-h-screen space-y-8 bg-[#020617] px-4 py-8 text-slate-100 md:px-8">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Shared Proforma</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-50">{partnerName}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Read-only scenario view shared through the stakeholder access token system.
        </p>
      </section>

      <ProformaScenarioReport unitName={unitName} input={input} result={result} />

      {compare ? (
        <ProformaScenarioReport
          unitName={compare.unitName}
          input={compare.input}
          result={compare.result}
          titleSuffix="(Comparison)"
        />
      ) : null}
    </main>
  );
}
