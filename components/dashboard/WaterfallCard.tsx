import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WaterfallCard({
  unitName,
  description
}: {
  unitName: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{unitName}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">Scaffolded</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Waterfall metrics, monthly snapshots, and payout breakdowns will plug into this card as data wiring is added.
        </p>
      </CardContent>
    </Card>
  );
}
