import { SilverMoonOperationsPanel } from "@/components/dashboard/SilverMoonOperationsPanel";
import { UnitDashboardPage } from "@/components/dashboard/UnitDashboardPage";

export default function SilverMoonDashboardPage() {
  return (
    <div className="space-y-8">
      <UnitDashboardPage slug="silver_moon" />
      <SilverMoonOperationsPanel />
    </div>
  );
}
