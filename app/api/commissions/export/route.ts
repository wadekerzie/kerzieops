import { getScoutsDashboardData } from "@/lib/dashboard-data";

function toCsvValue(value: string | number | null) {
  if (value === null) {
    return '""';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scout = url.searchParams.get("scout") ?? undefined;
  const month = url.searchParams.get("month") ?? undefined;
  const product = url.searchParams.get("product") ?? undefined;
  const dashboard = await getScoutsDashboardData({ scout, month, product });
  const header = [
    "Scout name",
    "Customer",
    "Product",
    "Monthly contract value",
    "Commission %",
    "Commission amount",
    "Customer payment date",
    "Payout date",
    "Status"
  ];
  const rows = dashboard.paidCommissions.map((commission) => [
    commission.scoutName,
    commission.customerName,
    commission.productName,
    commission.monthlyContractValue,
    commission.commissionPercentage,
    commission.commissionAmount,
    commission.customerPaymentDate,
    commission.payoutDate,
    commission.status
  ]);
  const csv = [header, ...rows].map((row) => row.map((value) => toCsvValue(value ?? null)).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="scout-commissions-paid.csv"'
    }
  });
}
