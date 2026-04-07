export interface DashboardTabLink {
  label: string;
  href: string;
  matchPrefix?: string;
}

export const DASHBOARD_TABS: DashboardTabLink[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Zorli", href: "/dashboard/zorli" },
  { label: "GotaGuy", href: "/dashboard/gotaguuy" },
  { label: "Unison", href: "/dashboard/unison" },
  { label: "Silver Moon", href: "/dashboard/silver-moon" },
  { label: "Silver Naturals", href: "/dashboard/silver-naturals" },
  { label: "Scouts", href: "/dashboard/scouts" },
  { label: "Expenses", href: "/dashboard/expenses" },
  { label: "Proforma", href: "/dashboard/proforma" },
  { label: "Settings", href: "/dashboard/settings" }
];
