import type { ReactNode } from "react";

import { HunterGrowthSimulator } from "@/components/shared/HunterGrowthSimulator";
import { MetricTrendChart } from "@/components/shared/MetricTrendChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getManagementDashboardData } from "@/lib/dashboard-data";
import { getGerryStakeholderData, getHunterStakeholderData } from "@/lib/stakeholder-data";
import type { StakeholderAccessContext } from "@/lib/tokens";
import { formatCurrency } from "@/lib/utils";

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
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(new Date(dateString));
}

function MoneyCard({
  label,
  value,
  tone = "default",
  prominent = false,
  format = "currency"
}: {
  label: string;
  value: number;
  tone?: "default" | "sky" | "emerald" | "violet" | "amber";
  prominent?: boolean;
  format?: "currency" | "number";
}) {
  const toneClasses = {
    default: "border-slate-800 bg-slate-950/70 text-slate-100",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300"
  };

  return (
    <div className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-4 font-semibold ${prominent ? "text-4xl" : "text-2xl"}`}>
        {format === "currency" ? formatCurrency(value) : value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function StakeholderShell({
  eyebrow,
  title,
  description,
  lastUpdatedAt,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(3,7,18,0.94))] p-8 shadow-2xl shadow-slate-950/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">{title}</h1>
              <p className="mt-3 text-sm text-slate-300">{description}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-5 py-4 text-sm text-slate-300">
              Last updated {formatDateTime(lastUpdatedAt)}
            </div>
          </div>
        </header>

        {children}

        <footer className="flex flex-col gap-3 rounded-[2rem] border border-slate-800 bg-slate-950/70 px-6 py-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Kerzie AI Solutions - Confidential Partner View</span>
          <span>Read-only financial reporting surface</span>
        </footer>
      </div>
    </main>
  );
}

function AccessIssue({ partnerName }: { partnerName: string }) {
  return (
    <StakeholderShell
      eyebrow="Partner Access"
      title="Access Scope Needs Attention"
      description="This token is valid, but its business-unit scope does not match the dashboard assigned to this partner yet."
      lastUpdatedAt={new Date().toISOString()}
    >
      <Card className="border-amber-500/20 bg-amber-500/10">
        <CardHeader>
          <CardTitle className="text-amber-100">Scope mismatch for {partnerName}</CardTitle>
          <CardDescription className="text-amber-50/80">
            Regenerate the token from dashboard settings with the correct business units attached.
          </CardDescription>
        </CardHeader>
      </Card>
    </StakeholderShell>
  );
}

function detectStakeholderVariant(accessContext: StakeholderAccessContext) {
  const partnerName = accessContext.partner?.name.toLowerCase() ?? "";

  if (partnerName.includes("hunter")) {
    return "hunter";
  }

  if (partnerName.includes("gerry")) {
    return "gerry";
  }

  if (partnerName.includes("gavin")) {
    return "gavin";
  }

  return "generic";
}

async function GavinStakeholderDashboard({ accessContext }: { accessContext: StakeholderAccessContext }) {
  const dashboard = await getManagementDashboardData();
  const allowedUnitIds = new Set(accessContext.businessUnits.map((businessUnit) => businessUnit.id));
  const scopedUnits = dashboard.units.filter((unit) => allowedUnitIds.has(unit.id));
  const pendingDistribution = scopedUnits
    .flatMap((unit) => unit.partnerPayouts)
    .filter((payout) => payout.partnerId === accessContext.partner?.id || payout.partnerName === accessContext.partner?.name)
    .reduce((sum, payout) => sum + payout.amount, 0);
  const scopedCommissions = dashboard.scoutCommissions.filter((commission) => allowedUnitIds.has(commission.business_unit_id));
  const totalGrossRevenue = scopedUnits.reduce((sum, unit) => sum + unit.grossRevenue, 0);
  const totalDistributablePool = scopedUnits.reduce((sum, unit) => sum + unit.distributablePool, 0);

  return (
    <StakeholderShell
      eyebrow={dashboard.currentMonthLabel}
      title="Kerzie Ops Read-Only Dashboard"
      description="Full portfolio visibility for Gavin with all editing and navigation controls removed. This mirrors the management financial view in a partner-safe format."
      lastUpdatedAt={new Date().toISOString()}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MoneyCard label="Your Pending Distribution" value={pendingDistribution} tone="violet" prominent />
        <MoneyCard label="Total Gross Revenue" value={totalGrossRevenue} tone="emerald" />
        <MoneyCard label="Distributable Pool" value={totalDistributablePool} tone="sky" />
        <MoneyCard label="Visible Business Units" value={scopedUnits.length} format="number" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {scopedUnits.map((unit) => (
          <Card key={unit.id} className="border-slate-800 bg-slate-950/70">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl text-slate-50">{unit.name}</CardTitle>
                  <CardDescription className="mt-2">{unit.monthOverMonthLabel}</CardDescription>
                </div>
                <Badge className="border-slate-700 bg-slate-900 text-slate-300">{unit.statusLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <MoneyCard label="Gross Revenue" value={unit.grossRevenue} tone="emerald" />
                <MoneyCard label="Platform Fees" value={unit.platformFees} tone="amber" />
                <MoneyCard label="Variable Costs" value={unit.variableCosts} tone="amber" />
                <MoneyCard label="Ops Tax Allocated" value={unit.opsTaxAllocated} tone="amber" />
                <MoneyCard label="Marketing Fund" value={unit.marketingFund} tone="amber" />
                <MoneyCard label="Operating Reserve" value={unit.operatingReserve} tone="amber" />
              </div>

              <div className="rounded-3xl border border-sky-500/20 bg-sky-500/10 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Distributable Pool</p>
                <p className="mt-3 text-3xl font-semibold text-sky-300">{formatCurrency(unit.distributablePool)}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Partner Payout Breakdown</p>
                {unit.partnerPayouts.map((payout) => (
                  <div
                    key={`${unit.id}-${payout.partnerId}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{payout.partnerName}</p>
                      <p className="text-xs text-slate-500">
                        {payout.percentage ? `${payout.percentage.toFixed(1)}% split` : payout.source}
                      </p>
                    </div>
                    <p className="font-semibold text-violet-300">{formatCurrency(payout.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Pending Scout Commissions</CardTitle>
            <CardDescription>Read-only payout queue filtered to the business units on this token.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-3xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Scout</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                    <th className="px-4 py-3 text-left font-medium">Commission</th>
                    <th className="px-4 py-3 text-left font-medium">Payout Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                  {scopedCommissions.length > 0 ? (
                    scopedCommissions.map((commission) => (
                      <tr key={commission.id}>
                        <td className="px-4 py-3">{commission.partnerName}</td>
                        <td className="px-4 py-3">{commission.customer_name}</td>
                        <td className="px-4 py-3 text-slate-400">{commission.businessUnitName}</td>
                        <td className="px-4 py-3 text-violet-300">{formatCurrency(Number(commission.commission_amount))}</td>
                        <td className="px-4 py-3">{formatDateLabel(commission.payout_date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No pending scout commissions for the units on this token.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Zorli Capital Contributions</CardTitle>
            <CardDescription>Founding cash and sweat equity logged for transparency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.capitalSummary.map((contributor) => (
              <div key={contributor.partnerName} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-100">{contributor.partnerName}</h3>
                  <p className="font-semibold text-sky-300">{formatCurrency(contributor.totalAmount)}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MoneyCard label="Cash" value={contributor.cashAmount} tone="emerald" />
                  <MoneyCard label="Sweat Equity" value={contributor.sweatEquityAmount} tone="violet" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </StakeholderShell>
  );
}

async function HunterStakeholderDashboard({ accessContext }: { accessContext: StakeholderAccessContext }) {
  const dashboard = await getHunterStakeholderData(accessContext);

  if (!dashboard) {
    return <AccessIssue partnerName={accessContext.partner?.name ?? "Hunter Pinnell"} />;
  }

  const initialSubscribers =
    dashboard.summary.grossSubscriberRevenue > 0
      ? Math.round(dashboard.summary.grossSubscriberRevenue / dashboard.proforma.monthlyPrice)
      : 100;

  return (
    <StakeholderShell
      eyebrow={dashboard.currentMonthLabel}
      title={`Zorli Partner Dashboard - ${dashboard.partnerName}`}
      description="A transparent monthly view of Zorli economics, capital formation, and what subscriber growth means for Hunter's distribution."
      lastUpdatedAt={dashboard.lastUpdatedAt}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MoneyCard label="Gross Subscriber Revenue" value={dashboard.summary.grossSubscriberRevenue} tone="emerald" />
        <MoneyCard label="Apple Fees" value={dashboard.summary.appleFees} tone="amber" />
        <MoneyCard label="LLM Costs" value={dashboard.summary.llmCosts} tone="amber" />
        <MoneyCard label="Ops Tax Allocated" value={dashboard.summary.opsTaxAllocated} tone="amber" />
        <MoneyCard label="Marketing Fund" value={dashboard.summary.marketingFund} tone="amber" />
        <MoneyCard label="Operating Reserve" value={dashboard.summary.operatingReserve} tone="amber" />
        <MoneyCard label="Distributable Pool" value={dashboard.summary.distributablePool} tone="sky" />
        <MoneyCard label={`Hunter's Share (${dashboard.hunterSharePercentage.toFixed(0)}%)`} value={dashboard.summary.hunterShare} tone="violet" prominent />
      </section>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-slate-50">12-Month Hunter Distribution Trend</CardTitle>
          <CardDescription>Projected from stored monthly snapshots and the current active Zorli split.</CardDescription>
        </CardHeader>
        <CardContent>
          <MetricTrendChart data={dashboard.distributions} valueLabel="Hunter Distribution" currentColor="#8b5cf6" />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Capital Contributions</CardTitle>
            <CardDescription>Transparent record of what built Zorli before scale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-medium text-slate-100">
                Wade: {formatCurrency(dashboard.contributions.wade.cashAmount)} cash +{" "}
                {dashboard.contributions.wade.sweatHours.toFixed(0)} hours sweat equity at{" "}
                {formatCurrency(dashboard.contributions.wade.hourlyRate)}/hr ={" "}
                <span className="text-sky-300">{formatCurrency(dashboard.contributions.wade.totalAmount)}</span>
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-medium text-slate-100">
                Gavin: {dashboard.contributions.gavin.sweatHours.toFixed(0)} hours sweat equity at{" "}
                {formatCurrency(dashboard.contributions.gavin.hourlyRate)}/hr ={" "}
                <span className="text-sky-300">{formatCurrency(dashboard.contributions.gavin.totalAmount)}</span>
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-medium text-slate-100">
                Hunter: <span className="text-emerald-300">{formatCurrency(dashboard.contributions.hunterMarketingTotal)}</span> in
                marketing contributions
              </p>
            </div>
            <div className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-5 text-sm text-slate-200">
              Sweat equity contributions are logged for transparency and are not recoverable. They represent the
              foundation of Zorli&apos;s value.
            </div>
          </CardContent>
        </Card>

        <HunterGrowthSimulator
          initialSubscribers={initialSubscribers}
          monthlyPrice={dashboard.proforma.monthlyPrice}
          appleFeePercentage={dashboard.proforma.appleFeePercentage}
          avgQueriesPerUserPerMonth={dashboard.proforma.avgQueriesPerUserPerMonth}
          llmCostPerQuery={dashboard.proforma.llmCostPerQuery}
          opsTaskAllocated={dashboard.proforma.opsTaskAllocated}
          marketingFundPercentage={dashboard.proforma.marketingFundPercentage}
          operatingReservePercentage={dashboard.proforma.operatingReservePercentage}
          marketingContributionsApplied={dashboard.proforma.marketingContributionsApplied}
          partnerSplits={dashboard.proforma.partnerSplits}
          hunterPartnerId={accessContext.partner?.id ?? ""}
        />
      </section>
    </StakeholderShell>
  );
}

async function GerryStakeholderDashboard({ accessContext }: { accessContext: StakeholderAccessContext }) {
  const dashboard = await getGerryStakeholderData(accessContext);

  if (!dashboard) {
    return <AccessIssue partnerName={accessContext.partner?.name ?? "Gerry Brundage"} />;
  }

  return (
    <StakeholderShell
      eyebrow={dashboard.currentMonthLabel}
      title="Silver Moon & Silver Naturals - Sales Transparency Dashboard"
      description="Read-only sales attribution reporting for Gerry, with current-month economics, recent transaction visibility, and Silver Naturals setup status."
      lastUpdatedAt={dashboard.lastUpdatedAt}
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Silver Moon</CardTitle>
            <CardDescription>
              These figures represent net new sales attributable to Kerzie AI marketing efforts only. Existing customer
              repurchases are excluded per agreement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MoneyCard label="Attributed Sales This Month" value={dashboard.silverMoon.totalAttributedSales} tone="emerald" />
              <MoneyCard label="Stripe Fees" value={dashboard.silverMoon.stripeFees} tone="amber" />
              <MoneyCard label="Kerzie AI Commission" value={dashboard.silverMoon.kerzieCommission} tone="violet" />
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="mb-4 text-sm text-slate-400">Monthly attributed sales over the last 12 months.</p>
              <MetricTrendChart data={dashboard.silverMoon.monthlySales} valueLabel="Attributed Sales" currentColor="#22c55e" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Silver Naturals</CardTitle>
            <CardDescription>Placeholder view held ready for activation once the agreement is finalized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300">Agreement pending finalization</Badge>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Setup Fee Status</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50 capitalize">{dashboard.silverNaturals.setupFeeStatus}</p>
            </div>
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-400">
              The Silver Naturals section is staged and ready to display live revenue, fees, and payout transparency as
              soon as the agreement is signed and the first setup invoice is logged.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-slate-50">Silver Moon Transaction Log</CardTitle>
          <CardDescription>Recent attributed transactions with Stripe identifiers masked for privacy.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-3xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Stripe Payment ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                {dashboard.silverMoon.transactionLog.length > 0 ? (
                  dashboard.silverMoon.transactionLog.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3">{formatDateLabel(transaction.transactionDate)}</td>
                      <td className="px-4 py-3 text-emerald-300">{formatCurrency(transaction.amount)}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{transaction.maskedStripePaymentId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      No attributed Silver Moon transactions have been logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </StakeholderShell>
  );
}

export async function StakeholderView({ accessContext }: { accessContext: StakeholderAccessContext }) {
  const variant = detectStakeholderVariant(accessContext);

  if (variant === "gavin") {
    return <GavinStakeholderDashboard accessContext={accessContext} />;
  }

  if (variant === "hunter") {
    return <HunterStakeholderDashboard accessContext={accessContext} />;
  }

  if (variant === "gerry") {
    return <GerryStakeholderDashboard accessContext={accessContext} />;
  }

  return (
    <StakeholderShell
      eyebrow="Partner Access"
      title="Stakeholder View"
      description="This token is valid, but no specialized partner dashboard has been assigned to it yet."
      lastUpdatedAt={new Date().toISOString()}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Partner</CardTitle>
            <CardDescription>Validated stakeholder context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Name: {accessContext.partner?.name ?? "Unknown"}</p>
            <p>Role: {accessContext.partner?.role ?? "Unknown"}</p>
            <p>Email: {accessContext.partner?.email ?? "Not provided"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Business Units</CardTitle>
            <CardDescription>Access scope attached to this token</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {accessContext.businessUnits.length > 0 ? (
              accessContext.businessUnits.map((businessUnit) => (
                <Badge key={businessUnit.id} className="border-slate-700 bg-slate-900 text-slate-300">
                  {businessUnit.name}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-slate-500">No business units are attached to this token yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </StakeholderShell>
  );
}
