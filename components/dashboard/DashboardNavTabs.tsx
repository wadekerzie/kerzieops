"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DASHBOARD_TABS } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";

export function DashboardNavTabs() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
        {DASHBOARD_TABS.map((tab) => {
          const isActive =
            pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.matchPrefix ?? tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
