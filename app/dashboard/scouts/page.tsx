import { ScoutsDashboard } from "@/components/dashboard/ScoutsDashboard";

interface ScoutsPageProps {
  searchParams?: {
    scout?: string | string[];
    month?: string | string[];
    product?: string | string[];
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ScoutsPage({ searchParams }: ScoutsPageProps) {
  return (
    <ScoutsDashboard
      filters={{
        scout: firstValue(searchParams?.scout),
        month: firstValue(searchParams?.month),
        product: firstValue(searchParams?.product)
      }}
    />
  );
}
