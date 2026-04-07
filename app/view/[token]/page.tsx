import { notFound } from "next/navigation";

import { StakeholderProformaView } from "@/components/shared/StakeholderProformaView";
import { StakeholderView } from "@/components/shared/StakeholderView";
import { getSavedProformaScenarioById } from "@/lib/proforma-data";
import { validateToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function StakeholderTokenPage({
  params,
  searchParams
}: {
  params: { token: string };
  searchParams?: { proformaScenario?: string; compareScenario?: string };
}) {
  const accessContext = await validateToken(params.token);

  if (!accessContext) {
    notFound();
  }

  if (searchParams?.proformaScenario) {
    const scenario = await getSavedProformaScenarioById(searchParams.proformaScenario);

    if (!scenario || !accessContext.businessUnits.some((unit) => unit.id === scenario.businessUnitId)) {
      notFound();
    }

    const compareScenario =
      searchParams.compareScenario
        ? await getSavedProformaScenarioById(searchParams.compareScenario)
        : null;
    const compareAllowed =
      compareScenario &&
      compareScenario.businessUnitId === scenario.businessUnitId &&
      accessContext.businessUnits.some((unit) => unit.id === compareScenario.businessUnitId)
        ? compareScenario
        : null;

    return (
      <StakeholderProformaView
        partnerName={accessContext.partner?.name ?? "Stakeholder"}
        unitName={accessContext.businessUnits.find((unit) => unit.id === scenario.businessUnitId)?.name ?? scenario.businessUnitSlug}
        input={{
          businessUnitId: scenario.businessUnitId,
          scenarioName: scenario.scenarioName,
          startMonth: new Date(scenario.startMonth),
          assumptions: scenario.assumptions
        }}
        result={scenario.result}
        compare={
          compareAllowed
            ? {
                unitName:
                  accessContext.businessUnits.find((unit) => unit.id === compareAllowed.businessUnitId)?.name ??
                  compareAllowed.businessUnitSlug,
                input: {
                  businessUnitId: compareAllowed.businessUnitId,
                  scenarioName: compareAllowed.scenarioName,
                  startMonth: new Date(compareAllowed.startMonth),
                  assumptions: compareAllowed.assumptions
                },
                result: compareAllowed.result
              }
            : null
        }
      />
    );
  }

  return <StakeholderView accessContext={accessContext} />;
}
