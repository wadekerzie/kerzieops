import type { ReactNode } from "react";
import Link from "next/link";

import { DashboardNavTabs } from "@/components/dashboard/DashboardNavTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOptionalServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const MANAGEMENT_EMAILS = ["wade@kerzie.ai", "gavin@kerzie.ai"];

function AccessState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <div className="max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
        <Badge variant="secondary">Protected Dashboard</Badge>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = getOptionalServerSupabaseClient();

  if (!supabase) {
    return (
      <AccessState
        title="Supabase environment not configured"
        description="The dashboard route is scaffolded and protected, but it needs Supabase environment variables before access checks can run."
      />
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();

  if (!email || !MANAGEMENT_EMAILS.includes(email)) {
    return (
      <AccessState
        title="Management access required"
        description="This area is reserved for Wade and Gavin. Wire your Supabase auth users to the allowed management emails to unlock the dashboard."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Kerzie Consulting LLC</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">Kerzie Ops Management Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400">
                Wade and Gavin&apos;s master money flow view across Kerzie AI, Zorli, GotaGuy, Unison, Silver Moon, and Silver Naturals.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
              Signed in as <span className="font-medium text-slate-100">{email}</span>
            </div>
          </div>
          <div className="mt-6">
            <DashboardNavTabs />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
