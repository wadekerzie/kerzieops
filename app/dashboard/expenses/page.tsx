import { ExpenseManagementPage } from "@/components/dashboard/ExpenseManagementPage";
import { getExpenseManagementData } from "@/lib/finance-data";

export default async function ExpensesPage() {
  const data = await getExpenseManagementData();

  return (
    <ExpenseManagementPage
      currentMonthLabel={data.currentMonthLabel}
      businessUnits={data.businessUnits}
      recurringExpenses={data.recurringExpenses}
      oneTimeExpenses={data.oneTimeExpenses}
      consultingProjects={data.consultingProjects}
    />
  );
}
