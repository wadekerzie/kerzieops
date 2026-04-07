import { getProformaWorkspaceData } from "@/lib/proforma-data";
import { ProformaWorkspace } from "@/components/dashboard/ProformaWorkspace";

export async function ProformaDashboard({
  initialUnitSlug,
  initialScenarioId,
  initialCompareId
}: {
  initialUnitSlug?: string;
  initialScenarioId?: string;
  initialCompareId?: string;
}) {
  const data = await getProformaWorkspaceData();

  return (
    <ProformaWorkspace
      currentMonthLabel={data.currentMonthLabel}
      units={data.units}
      savedScenarios={data.savedScenarios}
      initialUnitSlug={initialUnitSlug}
      initialScenarioId={initialScenarioId}
      initialCompareId={initialCompareId}
    />
  );
}
