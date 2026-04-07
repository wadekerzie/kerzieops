import Link from "next/link";

import { MetricCard } from "@/components/shared/MetricCard";
import { SupabaseClientProbe } from "@/components/shared/SupabaseClientProbe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessUnitsPreview, hasPublicSupabaseEnv, hasServiceRoleEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const envVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SILVER_MOON_ACCOUNT_ID"
];

export default async function HomePage() {
  const preview = await getBusinessUnitsPreview();

  return (
    <main className="container flex min-h-screen flex-col gap-8 py-12">
      <div className="space-y-4">
        <Badge variant={preview.ok ? "secondary" : "outline"}>{preview.ok ? "Supabase Connected" : "Scaffold + Probe"}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Kerzie Ops</h1>
        <p className="max-w-2xl text-muted-foreground">
          The foundation for Kerzie AI Solutions&apos; business operations dashboard is in place. This page now includes
          live Supabase probe cards for both a server-side path and a client-side path.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Open dashboard scaffold</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="App Router" value="Next.js 14" description="Typed App Router scaffold with API routes." />
        <MetricCard
          title="Supabase"
          value={preview.ok ? "Live" : "Configured"}
          description="Server and client probe paths target the live Supabase project."
        />
        <MetricCard title="Shadcn/UI" value="Ready" description="Core primitives are initialized for future pages." />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Server query path</CardDescription>
            <CardTitle>App Router server component</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={preview.ok ? "secondary" : "outline"}>{preview.ok ? "Connected" : "Needs attention"}</Badge>
            <p className="text-sm text-muted-foreground">{preview.message}</p>
            {preview.errorCode ? <p className="text-xs text-muted-foreground">Code: {preview.errorCode}</p> : null}
            {preview.units.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {preview.units.map((unit) => (
                  <li key={unit.id}>
                    {unit.name} <span className="text-xs">({unit.slug})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <SupabaseClientProbe />
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Environment Variables</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Supabase variables are wired locally. Stripe placeholders still need real values before those routes go live.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {envVars.map((envVar) => (
            <li key={envVar}>
              <code>{envVar}</code>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <p>Public Supabase env present: {hasPublicSupabaseEnv ? "yes" : "no"}</p>
          <p>Service-role env present: {hasServiceRoleEnv ? "yes" : "no"}</p>
        </div>
      </section>
    </main>
  );
}
