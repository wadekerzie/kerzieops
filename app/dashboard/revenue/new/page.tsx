import { ManualRevenueEntryForm } from "@/components/dashboard/ManualRevenueEntryForm";
import { getRevenueEntryPageData } from "@/lib/finance-data";

export default async function RevenueEntryPage() {
  const data = await getRevenueEntryPageData();

  return (
    <ManualRevenueEntryForm
      businessUnits={data.businessUnits}
      today={data.today}
      silverNaturalsAgreement={data.silverNaturalsAgreement}
    />
  );
}
