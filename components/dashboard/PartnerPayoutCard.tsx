import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PartnerPayoutCard({
  partnerName = "Wade Kerzie",
  amount = 0,
  status = "pending"
}: {
  partnerName?: string;
  amount?: number;
  status?: "pending" | "paid";
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Partner payout</CardDescription>
        <CardTitle>{partnerName}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <span className="text-2xl font-semibold">{formatCurrency(amount)}</span>
        <Badge variant={status === "paid" ? "secondary" : "outline"}>{status}</Badge>
      </CardContent>
    </Card>
  );
}
