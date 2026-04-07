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
import { getSilverMoonOperationsData } from "@/lib/silver-moon";

function formatDateLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export async function SilverMoonOperationsPanel() {
  const operations = await getSilverMoonOperationsData();

  return (
    <section className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-3">
            <CardDescription>Existing Customers On Record</CardDescription>
            <CardTitle className="text-3xl text-slate-50">{operations.existingCustomersCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-3">
            <CardDescription>Total Webhooks Received</CardDescription>
            <CardTitle className="text-3xl text-sky-300">{operations.webhookStatus.totalWebhooksReceived}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader className="pb-3">
            <CardDescription>Failed Webhooks</CardDescription>
            <CardTitle className="text-3xl text-amber-300">{operations.webhookStatus.failedWebhookCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Existing Customers</CardTitle>
            <CardDescription>
              Customers added here are excluded from Kerzie AI commission calculations per agreement with Gerry
              Brundage, dated {formatDateLabel(operations.agreement.effectiveDate)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action="/api/silver-moon/existing-customers" method="post" encType="multipart/form-data" className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <input type="hidden" name="redirectTo" value="/dashboard/silver-moon" />
              <div>
                <p className="text-sm font-medium text-slate-100">Upload Existing Customer CSV</p>
                <p className="mt-1 text-sm text-slate-400">
                  Seed Gerry&apos;s pre-engagement customer export in one pass.
                </p>
              </div>
              <Input
                name="csvFile"
                type="file"
                accept=".csv,text/csv"
                className="border-slate-800 bg-slate-950 text-slate-100 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-950"
              />
              <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500">
                Upload CSV
              </Button>
            </form>

            <form action="/api/silver-moon/existing-customers" method="post" className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <input type="hidden" name="redirectTo" value="/dashboard/silver-moon" />
              <div>
                <p className="text-sm font-medium text-slate-100">Manual Add</p>
                <p className="mt-1 text-sm text-slate-400">Add a single existing customer when Gerry sends an edge-case update.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  required
                  name="email"
                  type="email"
                  placeholder="customer@example.com"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
                <Input
                  name="name"
                  placeholder="Customer name"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[0.6fr_1.4fr]">
                <Input
                  required
                  name="firstPurchaseDate"
                  type="date"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
                <Input
                  name="notes"
                  placeholder="Optional notes"
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <Button type="submit" variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
                Add Existing Customer
              </Button>
            </form>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 px-5 py-4">
                <p className="text-sm font-medium text-slate-100">Recent Existing Customer Records</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">First Purchase</TableHead>
                    <TableHead className="text-slate-400">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.existingCustomersPreview.length > 0 ? (
                    operations.existingCustomersPreview.map((customer) => (
                      <TableRow key={customer.id} className="border-slate-800 hover:bg-slate-900/40">
                        <TableCell className="font-medium text-slate-100">{customer.email}</TableCell>
                        <TableCell className="text-slate-300">{customer.name ?? "Unknown"}</TableCell>
                        <TableCell className="text-slate-300">{formatDateLabel(customer.firstPurchaseDate)}</TableCell>
                        <TableCell className="text-slate-500">{customer.notes ?? "N/A"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        No existing customers have been seeded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-slate-50">Webhook Status</CardTitle>
              <CardDescription>
                Last webhook received:{" "}
                {operations.webhookStatus.lastWebhookReceivedAt
                  ? formatDateTime(operations.webhookStatus.lastWebhookReceivedAt)
                  : "No webhooks received yet"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Received</p>
                  <p className="mt-2 text-2xl font-semibold text-sky-300">{operations.webhookStatus.totalWebhooksReceived}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Failed</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">{operations.webhookStatus.failedWebhookCount}</p>
                </div>
              </div>

              <form action="/api/stripe/sync" method="post" className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <input type="hidden" name="days" value="30" />
                <input type="hidden" name="redirectTo" value="/dashboard/silver-moon" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-100">Manual 30-Day Sync</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Pull recent charges from Gerry&apos;s Stripe account and reconcile webhook gaps.
                    </p>
                  </div>
                  <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-500">
                    Sync Last 30 Days
                  </Button>
                </div>
              </form>

              {operations.webhookStatus.failedEvents.length > 0 ? (
                <div className="space-y-3">
                  {operations.webhookStatus.failedEvents.map((event) => (
                    <div key={event.id} className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-amber-500/20 bg-amber-500/15 text-amber-300">
                              {event.eventType}
                            </Badge>
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {event.paymentId ?? "No payment id"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-100">
                            {event.lastError ?? "Unknown processing error."}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Received {formatDateTime(event.receivedAt)}
                          </p>
                        </div>
                        <form action="/api/stripe-webhook/retry" method="post">
                          <input type="hidden" name="webhookEventId" value={event.id} />
                          <input type="hidden" name="redirectTo" value="/dashboard/silver-moon" />
                          <Button type="submit" variant="outline" className="border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100">
                            Retry
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
                  No failed webhooks on record.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-slate-50">Agreement Details</CardTitle>
              <CardDescription>Read-only display of the commercial terms currently reflected in Kerzie Ops.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Commission Rate</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  {operations.agreement.commissionRate}% of net attributed sales
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment Method</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">Stripe (automated via webhook)</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Effective Date</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{formatDateLabel(operations.agreement.effectiveDate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{operations.agreement.notes}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </section>
  );
}
