import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getScoutsDashboardData, type ScoutsDashboardFilters } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";

function formatDateLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function buildQueryString(filters: ScoutsDashboardFilters) {
  const params = new URLSearchParams();

  if (filters.scout) {
    params.set("scout", filters.scout);
  }

  if (filters.month) {
    params.set("month", filters.month);
  }

  if (filters.product) {
    params.set("product", filters.product);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

function StatusBadge({ status }: { status: "pending" | "paid" | "held" }) {
  if (status === "paid") {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Paid</Badge>;
  }

  if (status === "held") {
    return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300">Held</Badge>;
  }

  return <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-300">Pending</Badge>;
}

export async function ScoutsDashboard({ filters = {} }: { filters?: ScoutsDashboardFilters }) {
  const dashboard = await getScoutsDashboardData(filters);
  const exportHref = `/api/commissions/export${buildQueryString(dashboard.filters)}`;

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(3,7,18,0.94))] p-8 shadow-2xl shadow-slate-950/50">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-teal-300/70">{dashboard.currentMonthLabel}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Scout Command</h1>
            <p className="mt-3 text-sm text-slate-300">
              Scouts are the lifeblood of Unison revenue. This board keeps payout cycles visible while putting monthly
              commission run rate and recent field activity front and center.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-teal-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Total Scouts Active</CardDescription>
                <CardTitle className="text-3xl text-slate-50">{dashboard.summary.totalScoutsActive}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-sky-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Pending This Cycle</CardDescription>
                <CardTitle className="text-3xl text-sky-300">
                  {formatCurrency(dashboard.summary.totalCommissionsPendingThisCycle)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-violet-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Next Payout Date</CardDescription>
                <CardTitle className="text-3xl text-violet-300">{formatDateLabel(dashboard.summary.nextPayoutDate)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-emerald-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Paid Year To Date</CardDescription>
                <CardTitle className="text-3xl text-emerald-300">{formatCurrency(dashboard.summary.totalPaidYearToDate)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {dashboard.leaderboard.map((scout, index) => (
          <Card key={scout.scoutId} className="border-slate-800 bg-slate-950/70">
            <CardHeader className="gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Rank #{index + 1}</p>
                  <CardTitle className="mt-2 text-2xl text-slate-50">{scout.scoutName}</CardTitle>
                  <CardDescription className="mt-2">
                    {[scout.region, scout.email].filter(Boolean).join(" • ") || "Field rep profile on file"}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {scout.stale ? (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300">No activity 60+ days</Badge>
                  ) : (
                    <Badge className="border-teal-500/20 bg-teal-500/10 text-teal-300">Active in field</Badge>
                  )}
                  {!scout.isActive ? (
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      Inactive
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(12,74,110,0.35))] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monthly Commission Run Rate</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{formatCurrency(scout.monthlyCommissionRunRate)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{scout.activeCustomerCount} active customers</span>
                  <span>•</span>
                  <span>{formatCurrency(scout.ytdPaid)} YTD paid</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {scout.currentProducts.length > 0 ? (
                  scout.currentProducts.map((product) => (
                    <Badge key={product} className="border-slate-700 bg-slate-900 text-slate-300">
                      {product}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="border-slate-700 text-slate-500">
                    No active products
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Customers</p>
                {scout.activeCustomers.length > 0 ? (
                  scout.activeCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">{customer.customerName}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {customer.productName} • {formatPercent(customer.commissionPercentage)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-teal-300">{formatCurrency(customer.monthlyCommissionRunRate)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatCurrency(customer.monthlyValue)} MRR</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
                    No active customers assigned yet.
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Last activity: {scout.lastActivityDate ? formatDateLabel(scout.lastActivityDate) : "No activity recorded"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Pending Commissions</CardTitle>
            <CardDescription>
              Grouped by payout date so accounting can close an entire scout cycle with one action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {dashboard.pendingGroups.length > 0 ? (
              dashboard.pendingGroups.map((group) => (
                <div key={group.payoutDate} className="rounded-3xl border border-slate-800 bg-slate-900/55">
                  <div className="flex flex-col gap-3 border-b border-slate-800 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payout Group</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-50">{formatDateLabel(group.payoutDate)}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {group.commissions.length} commissions • subtotal {formatCurrency(group.subtotal)}
                      </p>
                    </div>

                    <form action="/api/commissions/mark-paid" method="post" className="flex items-center gap-3">
                      <input type="hidden" name="payoutDate" value={group.payoutDate} />
                      <input type="hidden" name="commissionIds" value={group.commissionIds.join(",")} />
                      <input type="hidden" name="redirectTo" value="/dashboard/scouts" />
                      <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-500">
                        Bulk Mark As Paid
                      </Button>
                    </form>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Scout</TableHead>
                        <TableHead className="text-slate-400">Customer</TableHead>
                        <TableHead className="text-slate-400">Product</TableHead>
                        <TableHead className="text-slate-400">Monthly Value</TableHead>
                        <TableHead className="text-slate-400">Commission %</TableHead>
                        <TableHead className="text-slate-400">Commission</TableHead>
                        <TableHead className="text-slate-400">Customer Payment</TableHead>
                        <TableHead className="text-slate-400">Payout Date</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.commissions.map((commission) => (
                        <TableRow key={commission.id} className="border-slate-800 hover:bg-slate-900/80">
                          <TableCell className="font-medium text-slate-100">{commission.scoutName}</TableCell>
                          <TableCell>
                            <div className="text-slate-100">{commission.customerName}</div>
                            <div className="text-xs text-slate-500">Month {commission.monthNumber}</div>
                          </TableCell>
                          <TableCell className="text-slate-300">{commission.productName}</TableCell>
                          <TableCell className="text-slate-300">{formatCurrency(commission.monthlyContractValue)}</TableCell>
                          <TableCell className="text-slate-300">{formatPercent(commission.commissionPercentage)}</TableCell>
                          <TableCell className="font-medium text-sky-300">{formatCurrency(commission.commissionAmount)}</TableCell>
                          <TableCell className="text-slate-300">{formatDateLabel(commission.customerPaymentDate)}</TableCell>
                          <TableCell className="text-slate-300">{formatDateLabel(commission.payoutDate)}</TableCell>
                          <TableCell>
                            <StatusBadge status={commission.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-500">
                No pending scout commissions are queued right now.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Add Scout</CardTitle>
            <CardDescription>Register a new field rep and create the linked payout partner record automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/scouts" method="post" className="space-y-4">
              <input type="hidden" name="redirectTo" value="/dashboard/scouts" />
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="scout-name">
                  Name
                </label>
                <Input id="scout-name" name="name" required className="border-slate-700 bg-slate-900 text-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="scout-email">
                  Email
                </label>
                <Input id="scout-email" name="email" type="email" className="border-slate-700 bg-slate-900 text-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="scout-phone">
                  Phone
                </label>
                <Input id="scout-phone" name="phone" className="border-slate-700 bg-slate-900 text-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="scout-region">
                  Region
                </label>
                <Input id="scout-region" name="region" className="border-slate-700 bg-slate-900 text-slate-100" />
              </div>
              <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-500">
                Add Scout
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-slate-50">Paid Commission Ledger</CardTitle>
            <CardDescription>Filter the paid ledger by scout, payout month, or product and export the current view.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              <Link href={exportHref}>Export CSV</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form method="get" className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-500" htmlFor="filter-scout">
                Scout
              </label>
              <select
                id="filter-scout"
                name="scout"
                defaultValue={dashboard.filters.scout ?? ""}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All scouts</option>
                {dashboard.scoutOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-500" htmlFor="filter-month">
                Month
              </label>
              <select
                id="filter-month"
                name="month"
                defaultValue={dashboard.filters.month ?? ""}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All months</option>
                {dashboard.monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-slate-500" htmlFor="filter-product">
                Product
              </label>
              <select
                id="filter-product"
                name="product"
                defaultValue={dashboard.filters.product ?? ""}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All products</option>
                {dashboard.productOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit" className="flex-1 bg-slate-100 text-slate-950 hover:bg-white">
                Apply Filters
              </Button>
              <Button asChild variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                <Link href="/dashboard/scouts">Reset</Link>
              </Button>
            </div>
          </form>

          <div className="overflow-hidden rounded-3xl border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Scout</TableHead>
                  <TableHead className="text-slate-400">Customer</TableHead>
                  <TableHead className="text-slate-400">Product</TableHead>
                  <TableHead className="text-slate-400">Monthly Value</TableHead>
                  <TableHead className="text-slate-400">Commission %</TableHead>
                  <TableHead className="text-slate-400">Commission</TableHead>
                  <TableHead className="text-slate-400">Customer Payment</TableHead>
                  <TableHead className="text-slate-400">Payout Date</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.paidCommissions.length > 0 ? (
                  dashboard.paidCommissions.map((commission) => (
                    <TableRow key={commission.id} className="border-slate-800 hover:bg-slate-900/80">
                      <TableCell className="font-medium text-slate-100">{commission.scoutName}</TableCell>
                      <TableCell className="text-slate-300">{commission.customerName}</TableCell>
                      <TableCell className="text-slate-300">{commission.productName}</TableCell>
                      <TableCell className="text-slate-300">{formatCurrency(commission.monthlyContractValue)}</TableCell>
                      <TableCell className="text-slate-300">{formatPercent(commission.commissionPercentage)}</TableCell>
                      <TableCell className="font-medium text-emerald-300">{formatCurrency(commission.commissionAmount)}</TableCell>
                      <TableCell className="text-slate-300">{formatDateLabel(commission.customerPaymentDate)}</TableCell>
                      <TableCell className="text-slate-300">{formatDateLabel(commission.payoutDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={commission.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableCell colSpan={9} className="py-8 text-center text-slate-500">
                      No paid commissions match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
