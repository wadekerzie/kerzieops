import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const rows = [
  {
    month: "2026-04-01",
    grossRevenue: 0,
    distributablePool: 0
  }
];

export function MonthlySnapshotTable() {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Gross revenue</TableHead>
            <TableHead>Distributable pool</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.month}>
              <TableCell>{row.month}</TableCell>
              <TableCell>{formatCurrency(row.grossRevenue)}</TableCell>
              <TableCell>{formatCurrency(row.distributablePool)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
