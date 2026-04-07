import { MonthlyCloseChecklistPage } from "@/components/dashboard/MonthlyCloseChecklistPage";
import { getMonthlyCloseData } from "@/lib/finance-data";

export default async function MonthlyClosePage({
  searchParams
}: {
  searchParams?: { month?: string };
}) {
  const data = await getMonthlyCloseData(searchParams?.month);

  return (
    <MonthlyCloseChecklistPage
      monthKey={data.monthKey}
      monthLabel={data.monthLabel}
      closeRecord={data.closeRecord}
      revenueEvents={data.revenueEvents}
      recurringExpenses={data.recurringExpenses}
      dueScoutCommissions={data.dueScoutCommissions}
      snapshots={data.snapshots}
      stepStates={data.stepStates}
    />
  );
}
