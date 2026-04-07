import { SilverNaturalsAgreementForm } from "@/components/dashboard/SilverNaturalsAgreementForm";
import { CopyTokenLinkButton } from "@/components/dashboard/CopyTokenLinkButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSilverNaturalsAgreementStatus } from "@/lib/finance-data";
import { getStakeholderSettingsData } from "@/lib/stakeholder-data";
import { getStakeholderSharePath } from "@/lib/tokens";

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export async function StakeholderTokenSettings() {
  const [settings, silverNaturalsAgreement] = await Promise.all([
    getStakeholderSettingsData(),
    getSilverNaturalsAgreementStatus()
  ]);

  return (
    <main className="space-y-8">
      <SilverNaturalsAgreementForm
        finalized={silverNaturalsAgreement.finalized}
        wadePercentage={silverNaturalsAgreement.wadePercentage}
        gavinPercentage={silverNaturalsAgreement.gavinPercentage}
      />

      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(3,7,18,0.94))] p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Stakeholder Access</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50">Partner View Tokens</h1>
            <p className="mt-3 text-sm text-slate-300">
              Generate scoped, read-only links for Gavin, Hunter, Gerry, and future partners without building a full
              login system. Each token can be deactivated instantly from this control surface.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-sky-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Active Tokens</CardDescription>
                <CardTitle className="text-3xl text-sky-300">{settings.tokens.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-teal-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Partners Ready</CardDescription>
                <CardTitle className="text-3xl text-teal-300">{settings.partners.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-violet-500/20 bg-slate-950/55">
              <CardHeader className="pb-3">
                <CardDescription>Business Units</CardDescription>
                <CardTitle className="text-3xl text-violet-300">{settings.businessUnits.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Generate New Token</CardTitle>
            <CardDescription>Assign exactly which business units a partner can see before sharing the link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/tokens/generate" method="post" className="space-y-6">
              <input type="hidden" name="redirectTo" value="/dashboard/settings" />

              <div className="space-y-2">
                <label htmlFor="partnerId" className="text-sm font-medium text-slate-200">
                  Partner
                </label>
                <select
                  id="partnerId"
                  name="partnerId"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a partner
                  </option>
                  {settings.partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-200">Business Unit Access</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {settings.businessUnits.map((businessUnit) => (
                    <label
                      key={businessUnit.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200"
                    >
                      <input
                        type="checkbox"
                        name="businessUnitIds"
                        value={businessUnit.id}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <span>
                        <span className="block font-medium text-slate-100">{businessUnit.name}</span>
                        <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-slate-500">
                          {businessUnit.slug.replace(/_/g, " ")}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500">
                Generate New Token
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-50">Active Tokens</CardTitle>
            <CardDescription>Current read-only links live here until they are manually deactivated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.tokens.length > 0 ? (
              settings.tokens.map((token) => (
                <div key={token.id} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Partner</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-50">{token.partnerName}</h3>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Business Unit Access</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {token.businessUnits.map((businessUnit) => (
                            <Badge
                              key={businessUnit.id}
                              className="border-slate-700 bg-slate-950 text-slate-300"
                            >
                              {businessUnit.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm text-slate-400">
                        Created {formatDateTime(token.createdAt)}
                        <span className="mx-2 text-slate-600">•</span>
                        <span className="font-mono text-xs text-slate-500">{token.token.slice(0, 18)}...</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <CopyTokenLinkButton path={getStakeholderSharePath(token.token)} />
                      <form action="/api/tokens/deactivate" method="post">
                        <input type="hidden" name="tokenId" value={token.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/settings" />
                        <Button
                          type="submit"
                          variant="outline"
                          className="border-rose-500/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                        >
                          Deactivate
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
                No active stakeholder tokens yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
