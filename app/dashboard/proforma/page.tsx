import { ProformaDashboard } from "@/components/dashboard/ProformaDashboard";

export default function ProformaPage({
  searchParams
}: {
  searchParams?: {
    unit?: string;
    scenario?: string;
    compare?: string;
  };
}) {
  return (
    <ProformaDashboard
      initialUnitSlug={searchParams?.unit}
      initialScenarioId={searchParams?.scenario}
      initialCompareId={searchParams?.compare}
    />
  );
}
