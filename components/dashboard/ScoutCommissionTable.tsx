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
  { scout: "Gavin Matthews", customer: "Example Client", amount: 0, status: "pending" }
];

export function ScoutCommissionTable() {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scout</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.scout}-${row.customer}`}>
              <TableCell>{row.scout}</TableCell>
              <TableCell>{row.customer}</TableCell>
              <TableCell>{formatCurrency(row.amount)}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
