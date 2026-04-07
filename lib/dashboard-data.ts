import { unstable_noStore as noStore } from "next/cache";

import { calculateCommissionAmount } from "@/lib/commission";
import { recalculateMonthlySnapshotForUnit as recalculateMonthlySnapshotForUnitFinance } from "@/lib/finance-data";
import { calculateWaterfall } from "@/lib/waterfall";
import { roundCurrency } from "@/lib/utils";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type {
  BusinessUnit,
  CapitalContribution,
  CustomerContract,
  Expense,
  MarketingContribution,
  MonthlySnapshot,
  MonthlySnapshotInsert,
  Partner,
  PartnerSplit,
  PayoutLedger,
  ProformaScenario,
  RevenueEvent,
  Scout,
  ScoutCommission,
  ScoutProduct,
  WaterfallConfig
} from "@/types";

export type UnitStatus = "active" | "pre-launch" | "client";

export interface DashboardTabLink {
  label: string;
  href: string;
  matchPrefix?: string;
}
export interface DashboardUnitPayout {
  partnerId: string;
  partnerName: string;
  percentage: number;
  amount: number;
  source: "ledger" | "derived";
  status: "pending" | "paid" | "projected";
}

export interface RevenueChartPoint {
  month: string;
  monthKey: string;
  revenue: number;
  isCurrent: boolean;
}

export interface WaterfallStagePoint {
  label: string;
  value: number;
  tone: "revenue" | "cost" | "reserve" | "pool";
}

export interface DashboardUnitSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: UnitStatus;
  statusLabel: string;
  routePath: string | null;
  grossRevenue: number;
  platformFees: number;
  variableCosts: number;
  opsTaxAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  distributablePool: number;
  monthOverMonthPercent: number;
  monthOverMonthLabel: string;
  partnerPayouts: DashboardUnitPayout[];
  revenueSeries: RevenueChartPoint[];
  waterfallStages: WaterfallStagePoint[];
  currentSnapshot: MonthlySnapshot | null;
  revenueEvents: RevenueEvent[];
  expenses: Expense[];
}

export interface CapitalContributorSummary {
  partnerName: string;
  cashAmount: number;
  sweatEquityAmount: number;
  totalAmount: number;
}

export interface RecurringExpenseSummary {
  id: string;
  businessUnitName: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  recurrenceInterval: string;
}

export interface ExpenseBreakdownPoint {
  name: string;
  value: number;
}

export interface ManagementDashboardData {
  currentMonthLabel: string;
  currentMonthKey: string;
  overview: {
    totalGrossRevenue: number;
    totalDistributablePool: number;
    wadePendingPayout: number;
    gavinPendingPayout: number;
  };
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
  units: DashboardUnitSummary[];
  scoutCommissions: Array<
    ScoutCommission & {
      partnerName: string;
      businessUnitName: string;
    }
  >;
  capitalSummary: CapitalContributorSummary[];
  recurringExpenses: RecurringExpenseSummary[];
  oneTimeExpenses: Expense[];
  expenseByCategory: ExpenseBreakdownPoint[];
  expenseByBusinessUnit: ExpenseBreakdownPoint[];
  proformaScenarios: ProformaScenario[];
}

export interface ScoutsDashboardFilters {
  scout?: string;
  month?: string;
  product?: string;
}

export interface ScoutCommissionRow {
  id: string;
  scoutId: string | null;
  scoutName: string;
  partnerId: string;
  customerContractId: string | null;
  businessUnitId: string;
  productName: string;
  customerName: string;
  customerEmail: string | null;
  monthlyContractValue: number;
  commissionPercentage: number;
  commissionAmount: number;
  customerPaymentDate: string;
  payoutDate: string;
  monthNumber: number;
  status: "pending" | "paid" | "held";
}

export interface ScoutPayoutGroup {
  payoutDate: string;
  subtotal: number;
  commissionIds: string[];
  commissions: ScoutCommissionRow[];
}

export interface ScoutActiveCustomerSummary {
  id: string;
  customerName: string;
  productName: string;
  monthlyValue: number;
  commissionPercentage: number;
  monthlyCommissionRunRate: number;
}

export interface ScoutLeaderboardEntry {
  scoutId: string;
  partnerId: string | null;
  scoutName: string;
  email: string | null;
  phone: string | null;
  region: string | null;
  isActive: boolean;
  activeCustomers: ScoutActiveCustomerSummary[];
  activeCustomerCount: number;
  monthlyCommissionRunRate: number;
  ytdPaid: number;
  lastActivityDate: string | null;
  stale: boolean;
  currentProducts: string[];
}

export interface ScoutsDashboardData {
  currentMonthLabel: string;
  filters: ScoutsDashboardFilters;
  summary: {
    totalScoutsActive: number;
    totalCommissionsPendingThisCycle: number;
    nextPayoutDate: string;
    totalPaidYearToDate: number;
  };
  pendingGroups: ScoutPayoutGroup[];
  paidCommissions: ScoutCommissionRow[];
  scoutOptions: Array<{ value: string; label: string }>;
  productOptions: Array<{ value: string; label: string }>;
  monthOptions: Array<{ value: string; label: string }>;
  leaderboard: ScoutLeaderboardEntry[];
}

interface DashboardBaseData {
  businessUnits: BusinessUnit[];
  partners: Partner[];
  scouts: Scout[];
  scoutProducts: ScoutProduct[];
  customerContracts: CustomerContract[];
  partnerSplits: PartnerSplit[];
  revenueEvents: RevenueEvent[];
  expenses: Expense[];
  configs: WaterfallConfig[];
  monthlySnapshots: MonthlySnapshot[];
  payoutLedger: PayoutLedger[];
  scoutCommissions: ScoutCommission[];
  capitalContributions: CapitalContribution[];
  marketingContributions: MarketingContribution[];
  proformaScenarios: ProformaScenario[];
}

const UNIT_ORDER = ["kerzie_ai", "zorli", "gotaguuy", "unison", "silver_moon", "silver_naturals"] as const;

const UNIT_META: Record<
  string,
  {
    status: UnitStatus;
    routePath: string | null;
  }
> = {
  kerzie_ai: { status: "active", routePath: null },
  zorli: { status: "pre-launch", routePath: "/dashboard/zorli" },
  gotaguuy: { status: "active", routePath: "/dashboard/gotaguuy" },
  unison: { status: "pre-launch", routePath: "/dashboard/unison" },
  silver_moon: { status: "client", routePath: "/dashboard/silver-moon" },
  silver_naturals: { status: "client", routePath: "/dashboard/silver-naturals" }
};

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatShortMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short"
  }).format(date);
}

function formatMonthOptionLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getMonthKeyFromDateString(dateString: string) {
  return dateString.slice(0, 7);
}

function getNextScoutPayoutDate(fromDate = new Date()) {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const payoutMonth = fromDate.getDate() <= 15 ? month : month + 1;

  return toDateString(new Date(Date.UTC(year, payoutMonth, 15)));
}

function differenceInDays(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00Z`);
  const rightDate = new Date(`${right}T00:00:00Z`);

  return Math.floor((leftDate.getTime() - rightDate.getTime()) / (1000 * 60 * 60 * 24));
}

function sortBusinessUnits(units: BusinessUnit[]) {
  const orderMap = new Map<string, number>(UNIT_ORDER.map((slug, index) => [slug, index]));

  return [...units].sort((left, right) => {
    return (orderMap.get(left.slug) ?? 999) - (orderMap.get(right.slug) ?? 999);
  });
}

function getStatusLabel(status: UnitStatus) {
  if (status === "pre-launch") {
    return "Pre-launch";
  }

  if (status === "client") {
    return "Client";
  }

  return "Active";
}

function getRecurringAnnualEquivalent(expense: Expense) {
  if (expense.recurrence_interval === "annual") {
    return roundCurrency(expense.amount);
  }

  if (expense.recurrence_interval === "monthly") {
    return roundCurrency(expense.amount * 12);
  }

  return roundCurrency(expense.amount);
}

function getRecurringMonthlyEquivalent(expense: Expense) {
  if (expense.recurrence_interval === "annual") {
    return roundCurrency(expense.amount / 12);
  }

  return roundCurrency(expense.amount);
}

function computeMonthOverMonth(currentValue: number, previousValue: number) {
  if (previousValue === 0 && currentValue === 0) {
    return { percent: 0, label: "Flat vs last month" };
  }

  if (previousValue === 0 && currentValue > 0) {
    return { percent: 100, label: "New revenue this month" };
  }

  const percent = roundCurrency(((currentValue - previousValue) / previousValue) * 100);
  const sign = percent > 0 ? "+" : "";

  return {
    percent,
    label: `${sign}${percent.toFixed(1)}% vs last month`
  };
}

function pickConfigValue(configs: WaterfallConfig[], unitId: string, key: string, fallbackValue: number) {
  const unitConfig = [...configs]
    .filter((config) => config.business_unit_id === unitId && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (unitConfig?.config_value !== null && typeof unitConfig?.config_value === "number") {
    return unitConfig.config_value;
  }

  const globalConfig = [...configs]
    .filter((config) => config.business_unit_id === null && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (globalConfig?.config_value !== null && typeof globalConfig?.config_value === "number") {
    return globalConfig.config_value;
  }

  return fallbackValue;
}

function activeSplitsForUnit(
  splits: PartnerSplit[],
  unitId: string,
  asOfDate: string
) {
  return splits
    .filter((split) => {
      return (
        split.business_unit_id === unitId &&
        split.effective_date <= asOfDate &&
        (split.end_date === null || split.end_date >= asOfDate)
      );
    })
    .sort((left, right) => Number(right.percentage) - Number(left.percentage));
}

function activeScoutProductForUnit(
  scoutProducts: ScoutProduct[],
  scoutId: string,
  businessUnitId: string,
  asOfDate: string
) {
  return [...scoutProducts]
    .filter((product) => {
      return (
        product.scout_id === scoutId &&
        product.business_unit_id === businessUnitId &&
        product.effective_date <= asOfDate &&
        (product.end_date === null || product.end_date >= asOfDate)
      );
    })
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];
}

function buildScoutCommissionRows(baseData: DashboardBaseData): ScoutCommissionRow[] {
  const businessUnitById = new Map(baseData.businessUnits.map((unit) => [unit.id, unit]));
  const partnerById = new Map(baseData.partners.map((partner) => [partner.id, partner]));
  const scoutById = new Map(baseData.scouts.map((scout) => [scout.id, scout]));
  const scoutByPartnerId = new Map(
    baseData.scouts
      .filter((scout) => scout.partner_id !== null)
      .map((scout) => [scout.partner_id as string, scout])
  );
  const contractById = new Map(baseData.customerContracts.map((contract) => [contract.id, contract]));

  return baseData.scoutCommissions
    .map((commission) => {
      const contract = commission.customer_contract_id ? contractById.get(commission.customer_contract_id) ?? null : null;
      const scout = contract
        ? scoutById.get(contract.scout_id) ?? null
        : scoutByPartnerId.get(commission.partner_id) ?? null;
      const partner = partnerById.get(commission.partner_id) ?? null;
      const unit = businessUnitById.get(commission.business_unit_id) ?? null;

      return {
        id: commission.id,
        scoutId: scout?.id ?? null,
        scoutName: scout?.name ?? partner?.name ?? "Unknown scout",
        partnerId: commission.partner_id,
        customerContractId: commission.customer_contract_id,
        businessUnitId: commission.business_unit_id,
        productName: unit?.name ?? "Unknown product",
        customerName: contract?.customer_name ?? commission.customer_name,
        customerEmail: contract?.customer_email ?? null,
        monthlyContractValue: roundCurrency(contract ? Number(contract.monthly_value) : Number(commission.contract_value)),
        commissionPercentage: Number(commission.commission_percentage),
        commissionAmount: roundCurrency(Number(commission.commission_amount)),
        customerPaymentDate: commission.customer_payment_date,
        payoutDate: commission.payout_date,
        monthNumber: commission.month_number,
        status: commission.status
      } satisfies ScoutCommissionRow;
    })
    .sort((left, right) => {
      const payoutDateSort = left.payoutDate.localeCompare(right.payoutDate);

      if (payoutDateSort !== 0) {
        return payoutDateSort;
      }

      return left.scoutName.localeCompare(right.scoutName);
    });
}

function buildScoutPayoutGroups(commissions: ScoutCommissionRow[]) {
  const groups = new Map<string, ScoutCommissionRow[]>();

  for (const commission of commissions) {
    const existing = groups.get(commission.payoutDate) ?? [];
    existing.push(commission);
    groups.set(commission.payoutDate, existing);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([payoutDate, groupedCommissions]) => ({
      payoutDate,
      subtotal: roundCurrency(groupedCommissions.reduce((sum, commission) => sum + commission.commissionAmount, 0)),
      commissionIds: groupedCommissions.map((commission) => commission.id),
      commissions: groupedCommissions
    })) satisfies ScoutPayoutGroup[];
}

function buildScoutLeaderboard(baseData: DashboardBaseData, commissionRows: ScoutCommissionRow[], asOfDate: string) {
  const businessUnitById = new Map(baseData.businessUnits.map((unit) => [unit.id, unit]));

  return baseData.scouts
    .map((scout) => {
      const activeContracts = baseData.customerContracts
        .filter((contract) => {
          return (
            contract.scout_id === scout.id &&
            contract.status === "active" &&
            contract.contract_start_date <= asOfDate
          );
        })
        .map((contract) => {
          const commissionPlan = activeScoutProductForUnit(
            baseData.scoutProducts,
            scout.id,
            contract.business_unit_id,
            asOfDate
          );
          const monthlyCommissionRunRate = commissionPlan
            ? calculateCommissionAmount(Number(contract.monthly_value), Number(commissionPlan.commission_percentage))
            : 0;

          return {
            id: contract.id,
            customerName: contract.customer_name,
            productName: businessUnitById.get(contract.business_unit_id)?.name ?? "Unknown product",
            monthlyValue: Number(contract.monthly_value),
            commissionPercentage: commissionPlan ? Number(commissionPlan.commission_percentage) : 0,
            monthlyCommissionRunRate
          } satisfies ScoutActiveCustomerSummary;
        })
        .sort((left, right) => right.monthlyCommissionRunRate - left.monthlyCommissionRunRate);
      const scoutCommissionRows = commissionRows.filter((commission) => commission.scoutId === scout.id);
      const lastCommissionActivity = [...scoutCommissionRows]
        .sort((left, right) => right.customerPaymentDate.localeCompare(left.customerPaymentDate))[0]?.customerPaymentDate;
      const lastContractActivity = [...baseData.customerContracts]
        .filter((contract) => contract.scout_id === scout.id)
        .sort((left, right) => right.contract_start_date.localeCompare(left.contract_start_date))[0]?.contract_start_date;
      const lastActivityDate = [lastCommissionActivity, lastContractActivity, scout.onboard_date]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => right.localeCompare(left))[0] ?? null;

      return {
        scoutId: scout.id,
        partnerId: scout.partner_id,
        scoutName: scout.name,
        email: scout.email,
        phone: scout.phone,
        region: scout.region,
        isActive: scout.is_active,
        activeCustomers: activeContracts,
        activeCustomerCount: activeContracts.length,
        monthlyCommissionRunRate: roundCurrency(
          activeContracts.reduce((sum, contract) => sum + contract.monthlyCommissionRunRate, 0)
        ),
        ytdPaid: roundCurrency(
          scoutCommissionRows
            .filter((commission) => {
              return commission.status === "paid" && commission.payoutDate.startsWith(`${new Date().getFullYear()}-`);
            })
            .reduce((sum, commission) => sum + commission.commissionAmount, 0)
        ),
        lastActivityDate,
        stale: lastActivityDate ? differenceInDays(asOfDate, lastActivityDate) > 60 : true,
        currentProducts: Array.from(new Set(activeContracts.map((contract) => contract.productName))).sort()
      } satisfies ScoutLeaderboardEntry;
    })
    .sort((left, right) => {
      if (right.monthlyCommissionRunRate !== left.monthlyCommissionRunRate) {
        return right.monthlyCommissionRunRate - left.monthlyCommissionRunRate;
      }

      return left.scoutName.localeCompare(right.scoutName);
    });
}

function buildRevenueSeries(revenueEvents: RevenueEvent[], unitId: string, currentMonthStart: Date) {
  const monthMap = new Map<string, number>();

  for (let offset = -11; offset <= 0; offset += 1) {
    const monthDate = addMonths(currentMonthStart, offset);
    monthMap.set(toMonthKey(monthDate), 0);
  }

  revenueEvents
    .filter((event) => event.business_unit_id === unitId)
    .forEach((event) => {
      const key = getMonthKeyFromDateString(event.transaction_date);

      if (monthMap.has(key)) {
        monthMap.set(key, roundCurrency((monthMap.get(key) ?? 0) + Number(event.gross_amount)));
      }
    });

  return Array.from(monthMap.entries()).map(([monthKey, revenue]) => {
    const [year, month] = monthKey.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);

    return {
      month: formatShortMonthLabel(monthDate),
      monthKey,
      revenue,
      isCurrent: monthKey === toMonthKey(currentMonthStart)
    };
  });
}

function buildWaterfallStages(unitSummary: {
  grossRevenue: number;
  platformFees: number;
  variableCosts: number;
  opsTaxAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  distributablePool: number;
}) {
  const afterFees = roundCurrency(unitSummary.grossRevenue - unitSummary.platformFees);
  const afterVariable = roundCurrency(afterFees - unitSummary.variableCosts);
  const afterOpsTax = roundCurrency(afterVariable - unitSummary.opsTaxAllocated);
  const afterMarketing = roundCurrency(afterOpsTax - unitSummary.marketingFund);
  const afterReserve = roundCurrency(afterMarketing - unitSummary.operatingReserve);

  return [
    { label: "Gross", value: unitSummary.grossRevenue, tone: "revenue" as const },
    { label: "After Fees", value: afterFees, tone: "cost" as const },
    { label: "After Variable", value: afterVariable, tone: "cost" as const },
    { label: "After Ops Tax", value: afterOpsTax, tone: "cost" as const },
    { label: "After Marketing", value: afterMarketing, tone: "reserve" as const },
    { label: "After Reserve", value: afterReserve, tone: "reserve" as const },
    { label: "Distributable", value: unitSummary.distributablePool, tone: "pool" as const }
  ];
}

function ensureSupabase() {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase service-role client is not configured.");
  }

  return supabase;
}

async function fetchDashboardBaseData(): Promise<DashboardBaseData> {
  const supabase = ensureSupabase();

  const results = (await Promise.all([
    supabase.from("business_units").select("*").eq("is_active", true),
    supabase.from("partners").select("*"),
    supabase.from("scouts").select("*").order("name"),
    supabase.from("scout_products").select("*"),
    supabase.from("customer_contracts").select("*").order("contract_start_date", { ascending: false }).limit(500),
    supabase.from("partner_splits").select("*"),
    supabase.from("revenue_events").select("*").order("transaction_date", { ascending: false }).limit(500),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(500),
    supabase.from("waterfall_config").select("*"),
    supabase.from("monthly_snapshots").select("*").order("snapshot_month", { ascending: false }).limit(200),
    supabase.from("payout_ledger").select("*").limit(500),
    supabase.from("scout_commissions").select("*").order("payout_date", { ascending: true }).limit(200),
    supabase.from("capital_contributions").select("*").limit(200),
    supabase.from("marketing_contributions").select("*").limit(200),
    supabase.from("proforma_scenarios").select("*").limit(200)
  ])) as Array<{ data: unknown[] | null; error: { message: string } | null }>;

  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const [
    businessUnitsResult,
    partnersResult,
    scoutsResult,
    scoutProductsResult,
    customerContractsResult,
    partnerSplitsResult,
    revenueEventsResult,
    expensesResult,
    configsResult,
    monthlySnapshotsResult,
    payoutLedgerResult,
    scoutCommissionsResult,
    capitalContributionsResult,
    marketingContributionsResult,
    proformaScenariosResult
  ] = results;

  return {
    businessUnits: sortBusinessUnits((businessUnitsResult.data ?? []) as BusinessUnit[]),
    partners: (partnersResult.data ?? []) as Partner[],
    scouts: (scoutsResult.data ?? []) as Scout[],
    scoutProducts: (scoutProductsResult.data ?? []) as ScoutProduct[],
    customerContracts: (customerContractsResult.data ?? []) as CustomerContract[],
    partnerSplits: (partnerSplitsResult.data ?? []) as PartnerSplit[],
    revenueEvents: (revenueEventsResult.data ?? []) as RevenueEvent[],
    expenses: (expensesResult.data ?? []) as Expense[],
    configs: (configsResult.data ?? []) as WaterfallConfig[],
    monthlySnapshots: (monthlySnapshotsResult.data ?? []) as MonthlySnapshot[],
    payoutLedger: (payoutLedgerResult.data ?? []) as PayoutLedger[],
    scoutCommissions: (scoutCommissionsResult.data ?? []) as ScoutCommission[],
    capitalContributions: (capitalContributionsResult.data ?? []) as CapitalContribution[],
    marketingContributions: (marketingContributionsResult.data ?? []) as MarketingContribution[],
    proformaScenarios: (proformaScenariosResult.data ?? []) as ProformaScenario[]
  };
}

export async function getManagementDashboardData(): Promise<ManagementDashboardData> {
  noStore();

  const baseData = await fetchDashboardBaseData();
  const currentMonthStart = getMonthStart();
  const currentMonthKey = toMonthKey(currentMonthStart);
  const previousMonthKey = toMonthKey(addMonths(currentMonthStart, -1));
  const currentDateString = toDateString(new Date());

  const partnerById = new Map(baseData.partners.map((partner) => [partner.id, partner]));
  const unitById = new Map(baseData.businessUnits.map((unit) => [unit.id, unit]));
  const scoutCommissionRows = buildScoutCommissionRows(baseData);

  const currentMonthRevenue = baseData.revenueEvents.filter(
    (event) => getMonthKeyFromDateString(event.transaction_date) === currentMonthKey
  );
  const previousMonthRevenue = baseData.revenueEvents.filter(
    (event) => getMonthKeyFromDateString(event.transaction_date) === previousMonthKey
  );
  const currentMonthExpenses = baseData.expenses.filter(
    (expense) => getMonthKeyFromDateString(expense.expense_date) === currentMonthKey
  );
  const currentMonthSnapshots = baseData.monthlySnapshots.filter(
    (snapshot) => getMonthKeyFromDateString(snapshot.snapshot_month) === currentMonthKey
  );
  const currentSnapshotByUnitId = new Map(currentMonthSnapshots.map((snapshot) => [snapshot.business_unit_id, snapshot]));
  const currentSnapshotById = new Map(currentMonthSnapshots.map((snapshot) => [snapshot.id, snapshot]));

  const currentMonthPendingLedger = baseData.payoutLedger.filter((entry) => {
    const snapshot = currentSnapshotById.get(entry.snapshot_id);

    return snapshot && entry.status === "pending";
  });

  const totalCurrentGross = roundCurrency(
    currentMonthRevenue.reduce((sum, event) => sum + Number(event.gross_amount), 0)
  );
  const globalOpsTaxThisMonth = roundCurrency(
    currentMonthExpenses
      .filter((expense) => expense.business_unit_id === null && expense.category === "ops_tax")
      .reduce((sum, expense) => sum + Number(expense.amount), 0)
  );

  const units = baseData.businessUnits.map((unit) => {
    const unitMeta = UNIT_META[unit.slug] ?? { status: "active" as const, routePath: null };
    const unitRevenueEvents = baseData.revenueEvents.filter((event) => event.business_unit_id === unit.id);
    const unitRevenueThisMonth = currentMonthRevenue.filter((event) => event.business_unit_id === unit.id);
    const unitRevenuePreviousMonth = previousMonthRevenue.filter((event) => event.business_unit_id === unit.id);
    const unitExpenses = baseData.expenses.filter((expense) => expense.business_unit_id === unit.id);
    const unitExpensesThisMonth = currentMonthExpenses.filter((expense) => expense.business_unit_id === unit.id);
    const snapshot = currentSnapshotByUnitId.get(unit.id) ?? null;
    const marketingFundPercentage = pickConfigValue(baseData.configs, unit.id, "marketing_fund_percentage", 10);
    const operatingReservePercentage = pickConfigValue(baseData.configs, unit.id, "operating_reserve_percentage", 12);
    const unitGrossThisMonth = roundCurrency(
      unitRevenueThisMonth.reduce((sum, event) => sum + Number(event.gross_amount), 0)
    );
    const unitPlatformFeesThisMonth = roundCurrency(
      unitRevenueThisMonth.reduce((sum, event) => sum + Number(event.platform_fee_amount), 0)
    );
    const allocatedGlobalOpsTax = baseData.businessUnits.length
      ? roundCurrency(
          totalCurrentGross > 0
            ? globalOpsTaxThisMonth * (unitGrossThisMonth / totalCurrentGross)
            : globalOpsTaxThisMonth / baseData.businessUnits.length
        )
      : 0;
    const unitOpsTaxThisMonth = roundCurrency(
      unitExpensesThisMonth
        .filter((expense) => expense.category === "ops_tax")
        .reduce((sum, expense) => sum + Number(expense.amount), 0)
    );
    const unitVariableThisMonth = roundCurrency(
      unitExpensesThisMonth
        .filter((expense) => expense.category === "variable")
        .reduce((sum, expense) => sum + Number(expense.amount), 0)
    );
    const currentMonthMarketingContributionApplied = roundCurrency(
      baseData.marketingContributions
        .filter(
          (contribution) =>
            contribution.business_unit_id === unit.id &&
            contribution.is_recovered &&
            contribution.recovery_date !== null &&
            getMonthKeyFromDateString(contribution.recovery_date) === currentMonthKey
        )
        .reduce((sum, contribution) => sum + Number(contribution.amount), 0)
    );

    const derivedWaterfall = calculateWaterfall({
      revenueEvents: unitRevenueThisMonth.map((event) => ({
        grossAmount: Number(event.gross_amount),
        platformFeeAmount: Number(event.platform_fee_amount)
      })),
      expenses: [
        ...unitExpensesThisMonth
          .filter((expense) => expense.category === "variable")
          .map((expense) => ({
            amount: Number(expense.amount),
            category: "variable" as const
          })),
        {
          amount: roundCurrency(unitOpsTaxThisMonth + allocatedGlobalOpsTax),
          category: "ops_tax" as const
        }
      ],
      marketingFundPercentage,
      operatingReservePercentage,
      marketingContributionsApplied: currentMonthMarketingContributionApplied
    });

    const grossRevenue = snapshot ? Number(snapshot.gross_revenue) : derivedWaterfall.grossRevenue;
    const platformFees = snapshot ? Number(snapshot.platform_fees) : derivedWaterfall.platformFees;
    const variableCosts = snapshot ? Number(snapshot.variable_costs) : derivedWaterfall.variableCosts;
    const opsTaxAllocated = snapshot ? Number(snapshot.ops_tax_allocated) : derivedWaterfall.opsTaxAllocated;
    const marketingFund = snapshot ? Number(snapshot.marketing_fund) : derivedWaterfall.marketingFund;
    const operatingReserve = snapshot ? Number(snapshot.operating_reserve) : derivedWaterfall.operatingReserve;
    const distributablePool = snapshot ? Number(snapshot.distributable_pool) : derivedWaterfall.distributablePool;

    const currentMonthLedger = baseData.payoutLedger.filter((entry) => {
      const entrySnapshot = currentSnapshotById.get(entry.snapshot_id);

      return entrySnapshot && entry.business_unit_id === unit.id;
    });
    const derivedSplitRows =
      unit.slug === "silver_naturals"
        ? (() => {
            const silverNaturalsConfig = [...baseData.configs]
              .filter(
                (config) =>
                  config.business_unit_id === unit.id && config.config_key === "silver_naturals_wade_percentage"
              )
              .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];
            const wade = baseData.partners.find((partner) => partner.name === "Wade Kerzie");
            const gavin = baseData.partners.find((partner) => partner.name === "Gavin Matthews");

            if (!silverNaturalsConfig || silverNaturalsConfig.config_value === null || !wade || !gavin) {
              return [] as Array<{ partner_id: string; percentage: number }>;
            }

            return [
              {
                partner_id: wade.id,
                percentage: Number(silverNaturalsConfig.config_value)
              },
              {
                partner_id: gavin.id,
                percentage: roundCurrency(100 - Number(silverNaturalsConfig.config_value))
              }
            ];
          })()
        : activeSplitsForUnit(baseData.partnerSplits, unit.id, currentDateString).map((split) => ({
            partner_id: split.partner_id,
            percentage: Number(split.percentage)
          }));

    const partnerPayouts: DashboardUnitPayout[] =
      currentMonthLedger.length > 0
        ? currentMonthLedger
            .map((entry) => {
              const partner = partnerById.get(entry.partner_id);

              return {
                partnerId: entry.partner_id,
                partnerName: partner?.name ?? "Unknown partner",
                percentage: 0,
                amount: Number(entry.gross_payout),
                source: "ledger" as const,
                status: entry.status
              };
            })
            .sort((left, right) => right.amount - left.amount)
        : derivedSplitRows.map((split) => {
            const partner = partnerById.get(split.partner_id);

            return {
              partnerId: split.partner_id,
              partnerName: partner?.name ?? "Unknown partner",
              percentage: split.percentage,
              amount: roundCurrency(distributablePool * (split.percentage / 100)),
              source: "derived" as const,
              status: "projected" as const
            };
          });

    const currentGrossForDelta = roundCurrency(
      unitRevenueThisMonth.reduce((sum, event) => sum + Number(event.gross_amount), 0)
    );
    const previousGrossForDelta = roundCurrency(
      unitRevenuePreviousMonth.reduce((sum, event) => sum + Number(event.gross_amount), 0)
    );
    const monthOverMonth = computeMonthOverMonth(currentGrossForDelta, previousGrossForDelta);

    return {
      id: unit.id,
      slug: unit.slug,
      name: unit.name,
      description: unit.description,
      status: unitMeta.status,
      statusLabel: getStatusLabel(unitMeta.status),
      routePath: unitMeta.routePath,
      grossRevenue,
      platformFees,
      variableCosts,
      opsTaxAllocated,
      marketingFund,
      operatingReserve,
      distributablePool,
      monthOverMonthPercent: monthOverMonth.percent,
      monthOverMonthLabel: monthOverMonth.label,
      partnerPayouts,
      revenueSeries: buildRevenueSeries(baseData.revenueEvents, unit.id, currentMonthStart),
      waterfallStages: buildWaterfallStages({
        grossRevenue,
        platformFees,
        variableCosts,
        opsTaxAllocated,
        marketingFund,
        operatingReserve,
        distributablePool
      }),
      currentSnapshot: snapshot,
      revenueEvents: unitRevenueEvents.sort((left, right) => right.transaction_date.localeCompare(left.transaction_date)).slice(0, 30),
      expenses: unitExpenses.sort((left, right) => right.expense_date.localeCompare(left.expense_date)).slice(0, 30)
    };
  });

  const payoutFallbackByPartnerName = units.flatMap((unit) => unit.partnerPayouts);
  const wadePendingFromLedger = currentMonthPendingLedger
    .filter((entry) => partnerById.get(entry.partner_id)?.name === "Wade Kerzie")
    .reduce((sum, entry) => sum + Number(entry.gross_payout), 0);
  const gavinPendingFromLedger = currentMonthPendingLedger
    .filter((entry) => partnerById.get(entry.partner_id)?.name === "Gavin Matthews")
    .reduce((sum, entry) => sum + Number(entry.gross_payout), 0);

  const overview = {
    totalGrossRevenue: roundCurrency(units.reduce((sum, unit) => sum + unit.grossRevenue, 0)),
    totalDistributablePool: roundCurrency(units.reduce((sum, unit) => sum + unit.distributablePool, 0)),
    wadePendingPayout:
      wadePendingFromLedger > 0
        ? roundCurrency(wadePendingFromLedger)
        : roundCurrency(
            payoutFallbackByPartnerName
              .filter((payout) => payout.partnerName === "Wade Kerzie")
              .reduce((sum, payout) => sum + payout.amount, 0)
          ),
    gavinPendingPayout:
      gavinPendingFromLedger > 0
        ? roundCurrency(gavinPendingFromLedger)
        : roundCurrency(
            payoutFallbackByPartnerName
              .filter((payout) => payout.partnerName === "Gavin Matthews")
              .reduce((sum, payout) => sum + payout.amount, 0)
          )
  };

  const recurringExpenses = baseData.expenses
    .filter((expense) => expense.is_recurring)
    .map((expense) => ({
      id: expense.id,
      businessUnitName: expense.business_unit_id ? unitById.get(expense.business_unit_id)?.name ?? "Unknown unit" : "Kerzie Global",
      category: expense.category,
      vendor: expense.vendor ?? "Unknown vendor",
      description: expense.description,
      amount: Number(expense.amount),
      monthlyEquivalent: getRecurringMonthlyEquivalent(expense),
      annualEquivalent: getRecurringAnnualEquivalent(expense),
      recurrenceInterval: expense.recurrence_interval
    }))
    .sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent);

  const oneTimeExpenses = baseData.expenses
    .filter((expense) => !expense.is_recurring || expense.recurrence_interval === "one_time")
    .sort((left, right) => right.expense_date.localeCompare(left.expense_date));

  const expenseByCategoryMap = new Map<string, number>();
  const expenseByUnitMap = new Map<string, number>();

  for (const expense of baseData.expenses) {
    expenseByCategoryMap.set(
      expense.category,
      roundCurrency((expenseByCategoryMap.get(expense.category) ?? 0) + Number(expense.amount))
    );

    const unitName = expense.business_unit_id ? unitById.get(expense.business_unit_id)?.name ?? "Unknown unit" : "Kerzie Global";
    expenseByUnitMap.set(unitName, roundCurrency((expenseByUnitMap.get(unitName) ?? 0) + Number(expense.amount)));
  }

  const expenseByCategory = Array.from(expenseByCategoryMap.entries()).map(([name, value]) => ({ name, value }));
  const expenseByBusinessUnit = Array.from(expenseByUnitMap.entries()).map(([name, value]) => ({ name, value }));

  const zorli = baseData.businessUnits.find((unit) => unit.slug === "zorli");
  const capitalSummaryNames = ["Wade Kerzie", "Gavin Matthews", "Hunter Pinnell"];
  const capitalSummary = capitalSummaryNames.map((partnerName) => {
    const partner = baseData.partners.find((entry) => entry.name === partnerName);
    const contributions = baseData.capitalContributions.filter(
      (entry) => entry.business_unit_id === zorli?.id && entry.partner_id === partner?.id
    );
    const cashAmount = roundCurrency(
      contributions
        .filter((entry) => entry.contribution_type === "cash")
        .reduce((sum, entry) => sum + Number(entry.amount), 0)
    );
    const sweatEquityAmount = roundCurrency(
      contributions
        .filter((entry) => entry.contribution_type === "sweat_equity")
        .reduce((sum, entry) => sum + Number(entry.amount), 0)
    );

    return {
      partnerName,
      cashAmount,
      sweatEquityAmount,
      totalAmount: roundCurrency(cashAmount + sweatEquityAmount)
    };
  });

  return {
    currentMonthLabel: formatMonthLabel(currentMonthStart),
    currentMonthKey,
    overview,
    businessUnits: baseData.businessUnits.map((unit) => ({ id: unit.id, name: unit.name, slug: unit.slug })),
    units,
    scoutCommissions: scoutCommissionRows
      .filter((commission) => commission.status === "pending" || commission.status === "held")
      .map((commission) => ({
        id: commission.id,
        partner_id: commission.partnerId,
        business_unit_id: commission.businessUnitId,
        customer_contract_id: commission.customerContractId,
        month_number: commission.monthNumber,
        customer_name: commission.customerName,
        contract_value: commission.monthlyContractValue,
        commission_percentage: commission.commissionPercentage,
        commission_amount: commission.commissionAmount,
        customer_payment_date: commission.customerPaymentDate,
        payout_date: commission.payoutDate,
        status: commission.status,
        created_at: "",
        updated_at: "",
        partnerName: commission.scoutName,
        businessUnitName: commission.productName
      })),
    capitalSummary,
    recurringExpenses,
    oneTimeExpenses,
    expenseByCategory,
    expenseByBusinessUnit,
    proformaScenarios: baseData.proformaScenarios
  };
}

export async function getUnitDashboardData(slug: string) {
  const dashboardData = await getManagementDashboardData();
  const unit = dashboardData.units.find((entry) => entry.slug === slug);

  if (!unit) {
    throw new Error(`Unknown business unit slug: ${slug}`);
  }

  return {
    currentMonthLabel: dashboardData.currentMonthLabel,
    businessUnits: dashboardData.businessUnits,
    unit
  };
}

export async function getExpensesDashboardData() {
  const dashboardData = await getManagementDashboardData();

  return {
    currentMonthLabel: dashboardData.currentMonthLabel,
    businessUnits: dashboardData.businessUnits,
    recurringExpenses: dashboardData.recurringExpenses,
    oneTimeExpenses: dashboardData.oneTimeExpenses,
    expenseByCategory: dashboardData.expenseByCategory,
    expenseByBusinessUnit: dashboardData.expenseByBusinessUnit
  };
}

export async function getScoutsDashboardData(filters: ScoutsDashboardFilters = {}): Promise<ScoutsDashboardData> {
  noStore();

  const baseData = await fetchDashboardBaseData();
  const currentMonthStart = getMonthStart();
  const currentDateString = toDateString(new Date());
  const nextPayoutDate = getNextScoutPayoutDate(new Date());
  const currentYearPrefix = `${new Date().getFullYear()}-`;
  const scoutCommissionRows = buildScoutCommissionRows(baseData);
  const pendingGroups = buildScoutPayoutGroups(
    scoutCommissionRows.filter((commission) => commission.status === "pending" || commission.status === "held")
  );
  const allPaidCommissions = scoutCommissionRows.filter((commission) => commission.status === "paid");
  const paidCommissions = allPaidCommissions.filter((commission) => {
    if (filters.scout && commission.scoutId !== filters.scout) {
      return false;
    }

    if (filters.product && commission.businessUnitId !== filters.product) {
      return false;
    }

    if (filters.month && getMonthKeyFromDateString(commission.payoutDate) !== filters.month) {
      return false;
    }

    return true;
  });
  const leaderboard = buildScoutLeaderboard(baseData, scoutCommissionRows, currentDateString);

  return {
    currentMonthLabel: formatMonthLabel(currentMonthStart),
    filters,
    summary: {
      totalScoutsActive: baseData.scouts.filter((scout) => scout.is_active).length,
      totalCommissionsPendingThisCycle: roundCurrency(
        pendingGroups
          .filter((group) => group.payoutDate === nextPayoutDate)
          .reduce((sum, group) => sum + group.subtotal, 0)
      ),
      nextPayoutDate,
      totalPaidYearToDate: roundCurrency(
        allPaidCommissions
          .filter((commission) => commission.payoutDate.startsWith(currentYearPrefix))
          .reduce((sum, commission) => sum + commission.commissionAmount, 0)
      )
    },
    pendingGroups,
    paidCommissions,
    scoutOptions: baseData.scouts
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((scout) => ({
        value: scout.id,
        label: scout.name
      })),
    productOptions: baseData.businessUnits.map((unit) => ({
      value: unit.id,
      label: unit.name
    })),
    monthOptions: Array.from(new Set(allPaidCommissions.map((commission) => getMonthKeyFromDateString(commission.payoutDate))))
      .sort((left, right) => right.localeCompare(left))
      .map((monthKey) => ({
        value: monthKey,
        label: formatMonthOptionLabel(monthKey)
      })),
    leaderboard
  };
}

export async function getUpcomingScoutCommissions(daysAhead = 7) {
  noStore();

  const baseData = await fetchDashboardBaseData();
  const commissionRows = buildScoutCommissionRows(baseData);
  const startDate = toDateString(new Date());
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + Math.max(0, Math.trunc(daysAhead)));
  const cutoffDate = toDateString(cutoff);

  return commissionRows.filter((commission) => {
    return (
      (commission.status === "pending" || commission.status === "held") &&
      commission.payoutDate >= startDate &&
      commission.payoutDate <= cutoffDate
    );
  });
}

export async function getProformaDashboardData() {
  const dashboardData = await getManagementDashboardData();

  return {
    currentMonthLabel: dashboardData.currentMonthLabel,
    units: dashboardData.units,
    proformaScenarios: dashboardData.proformaScenarios
  };
}

export async function recalculateMonthlySnapshotForUnit(businessUnitId: string, monthDate: string) {
  return recalculateMonthlySnapshotForUnitFinance(businessUnitId, monthDate);
}
