import { unstable_noStore as noStore } from "next/cache";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import { roundCurrency } from "@/lib/utils";
import { calculateWaterfall, type PartnerSplitInput, type PartnerPayout, type WaterfallResult } from "@/lib/waterfall";
import type {
  BusinessUnit,
  ConsultingProject,
  ConsultingProjectPayment,
  Expense,
  ExpenseInsert,
  MonthlyClose,
  MonthlyCloseInsert,
  MonthlySnapshot,
  MonthlySnapshotInsert,
  Partner,
  PartnerSplit,
  PayoutLedger,
  PayoutLedgerInsert,
  RevenueEvent,
  RevenueEventInsert,
  ScoutCommission,
  WaterfallConfig
} from "@/types";

export const SILVER_NATURALS_WADE_PERCENTAGE_KEY = "silver_naturals_wade_percentage";

interface FinanceBaseData {
  businessUnits: BusinessUnit[];
  partners: Partner[];
  partnerSplits: PartnerSplit[];
  revenueEvents: RevenueEvent[];
  expenses: Expense[];
  configs: WaterfallConfig[];
  monthlySnapshots: MonthlySnapshot[];
  payoutLedger: PayoutLedger[];
  scoutCommissions: ScoutCommission[];
  consultingProjects: ConsultingProject[];
  consultingProjectPayments: ConsultingProjectPayment[];
  monthlyCloses: MonthlyClose[];
}

export interface SilverNaturalsAgreementStatus {
  businessUnitId: string | null;
  finalized: boolean;
  wadePercentage: number | null;
  gavinPercentage: number | null;
  bannerMessage: string | null;
}

export interface MonthlySnapshotComputation {
  businessUnit: BusinessUnit;
  monthStart: string;
  grossRevenue: number;
  platformFees: number;
  variableCosts: number;
  opsTaxAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  marketingContributionsApplied: number;
  setupFeeRevenue: number;
  setupFeeDistributablePool: number;
  distributablePool: number;
  partnerPayouts: PartnerPayout[];
  waterfall: WaterfallResult;
  agreementPending: boolean;
}

export interface RevenueEntryPageData {
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
  today: string;
  silverNaturalsAgreement: SilverNaturalsAgreementStatus;
}

export interface RecurringExpenseManagementRow {
  id: string;
  businessUnitId: string | null;
  businessUnitName: string;
  category: Expense["category"];
  vendor: string;
  description: string;
  amount: number;
  isRecurring: boolean;
  recurrenceInterval: Expense["recurrence_interval"];
  monthlyEquivalent: number;
  annualEquivalent: number;
  receiptUrl: string | null;
  isActive: boolean;
  expenseDate: string;
  nextBillingDate: string | null;
}

export interface ConsultingProjectRow {
  id: string;
  businessUnitId: string;
  businessUnitName: string;
  projectName: string;
  clientName: string;
  projectValue: number;
  startDate: string;
  endDate: string | null;
  status: ConsultingProject["status"];
  description: string | null;
  collectedToDate: number;
  remainingBalance: number;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    description: string | null;
    invoiceNumber: string | null;
    notes: string | null;
  }>;
}

export interface ExpenseManagementData {
  currentMonthLabel: string;
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
  recurringExpenses: RecurringExpenseManagementRow[];
  oneTimeExpenses: Expense[];
  consultingProjects: ConsultingProjectRow[];
}

export interface MonthlyCloseRevenueRow {
  id: string;
  businessUnitId: string;
  businessUnitName: string;
  transactionDate: string;
  customerName: string | null;
  description: string | null;
  grossAmount: number;
  reviewStatus: RevenueEvent["review_status"];
  reviewNotes: string | null;
  isSetupFee: boolean;
  isPendingAgreement: boolean;
}

export interface MonthlyCloseStepState {
  label: string;
  complete: boolean;
  description: string;
}

export interface MonthlyCloseData {
  monthKey: string;
  monthLabel: string;
  closeRecord: MonthlyClose | null;
  revenueEvents: MonthlyCloseRevenueRow[];
  recurringExpenses: RecurringExpenseManagementRow[];
  dueScoutCommissions: Array<
    ScoutCommission & {
      scoutName: string;
      businessUnitName: string;
    }
  >;
  snapshots: Array<{
    unitId: string;
    unitName: string;
    unitSlug: string;
    distributablePool: number;
    partnerPayouts: PartnerPayout[];
  }>;
  stepStates: MonthlyCloseStepState[];
}

function ensureSupabase() {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase service-role client is not configured.");
  }

  return supabase;
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthKeyFromDateString(dateString: string) {
  return dateString.slice(0, 7);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function getRecurringMonthlyEquivalent(expense: Expense) {
  if (expense.recurrence_interval === "annual") {
    return roundCurrency(Number(expense.amount) / 12);
  }

  return roundCurrency(Number(expense.amount));
}

function getRecurringAnnualEquivalent(expense: Expense) {
  if (expense.recurrence_interval === "annual") {
    return roundCurrency(Number(expense.amount));
  }

  return roundCurrency(Number(expense.amount) * 12);
}

function isExpenseActiveForMonth(expense: Expense, monthStart: Date) {
  if (!expense.is_active) {
    return false;
  }

  const expenseStart = getMonthStart(new Date(`${expense.expense_date}T00:00:00`));

  return expenseStart <= monthStart;
}

function expenseAmountForMonth(expense: Expense, monthStart: Date) {
  if (expense.is_recurring) {
    return isExpenseActiveForMonth(expense, monthStart) ? getRecurringMonthlyEquivalent(expense) : 0;
  }

  return getMonthKeyFromDateString(expense.expense_date) === toMonthKey(monthStart) ? Number(expense.amount) : 0;
}

export async function fetchFinanceBaseData(): Promise<FinanceBaseData> {
  const supabase = ensureSupabase();

  const results = (await Promise.all([
    supabase.from("business_units").select("*").eq("is_active", true).order("name"),
    supabase.from("partners").select("*").eq("is_active", true),
    supabase.from("partner_splits").select("*"),
    supabase.from("revenue_events").select("*").order("transaction_date", { ascending: false }).limit(2000),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(2000),
    supabase.from("waterfall_config").select("*"),
    supabase.from("monthly_snapshots").select("*").order("snapshot_month", { ascending: false }).limit(500),
    supabase.from("payout_ledger").select("*").limit(2000),
    supabase.from("scout_commissions").select("*").order("payout_date", { ascending: true }).limit(500),
    supabase.from("consulting_projects").select("*").order("start_date", { ascending: false }).limit(500),
    supabase.from("consulting_project_payments").select("*").order("payment_date", { ascending: false }).limit(1000),
    supabase.from("monthly_closes").select("*").order("close_month", { ascending: false }).limit(120)
  ])) as Array<{ data: unknown[] | null; error: { message: string } | null }>;

  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const [
    businessUnitsResult,
    partnersResult,
    partnerSplitsResult,
    revenueEventsResult,
    expensesResult,
    configsResult,
    monthlySnapshotsResult,
    payoutLedgerResult,
    scoutCommissionsResult,
    consultingProjectsResult,
    consultingProjectPaymentsResult,
    monthlyClosesResult
  ] = results;

  return {
    businessUnits: (businessUnitsResult.data ?? []) as BusinessUnit[],
    partners: (partnersResult.data ?? []) as Partner[],
    partnerSplits: (partnerSplitsResult.data ?? []) as PartnerSplit[],
    revenueEvents: (revenueEventsResult.data ?? []) as RevenueEvent[],
    expenses: (expensesResult.data ?? []) as Expense[],
    configs: (configsResult.data ?? []) as WaterfallConfig[],
    monthlySnapshots: (monthlySnapshotsResult.data ?? []) as MonthlySnapshot[],
    payoutLedger: (payoutLedgerResult.data ?? []) as PayoutLedger[],
    scoutCommissions: (scoutCommissionsResult.data ?? []) as ScoutCommission[],
    consultingProjects: (consultingProjectsResult.data ?? []) as ConsultingProject[],
    consultingProjectPayments: (consultingProjectPaymentsResult.data ?? []) as ConsultingProjectPayment[],
    monthlyCloses: (monthlyClosesResult.data ?? []) as MonthlyClose[]
  };
}

function getSilverNaturalsAgreementStatusFromBase(baseData: FinanceBaseData): SilverNaturalsAgreementStatus {
  const unit = baseData.businessUnits.find((entry) => entry.slug === "silver_naturals") ?? null;

  if (!unit) {
    return {
      businessUnitId: null,
      finalized: false,
      wadePercentage: null,
      gavinPercentage: null,
      bannerMessage: null
    };
  }

  const config = [...baseData.configs]
    .filter((entry) => entry.business_unit_id === unit.id && entry.config_key === SILVER_NATURALS_WADE_PERCENTAGE_KEY)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];
  const wadePercentage = typeof config?.config_value === "number" ? Number(config.config_value) : null;
  const finalized = wadePercentage !== null;

  return {
    businessUnitId: unit.id,
    finalized,
    wadePercentage,
    gavinPercentage: wadePercentage !== null ? roundCurrency(100 - wadePercentage) : null,
    bannerMessage: finalized
      ? null
      : "Silver Naturals agreement not finalized. Revenue logged but payout calculations suspended until percentage is confirmed."
  };
}

export async function getSilverNaturalsAgreementStatus() {
  noStore();

  const baseData = await fetchFinanceBaseData();

  return getSilverNaturalsAgreementStatusFromBase(baseData);
}

function resolvePartnerSplitsForUnit(baseData: FinanceBaseData, businessUnitId: string, asOfDate: string): PartnerSplitInput[] {
  const unit = baseData.businessUnits.find((entry) => entry.id === businessUnitId) ?? null;

  if (!unit) {
    return [];
  }

  if (unit.slug === "silver_naturals") {
    const agreement = getSilverNaturalsAgreementStatusFromBase(baseData);
    const wade = baseData.partners.find((partner) => partner.name === "Wade Kerzie");
    const gavin = baseData.partners.find((partner) => partner.name === "Gavin Matthews");

    if (!agreement.finalized || !wade || !gavin || agreement.wadePercentage === null || agreement.gavinPercentage === null) {
      return [];
    }

    return [
      {
        partnerId: wade.id,
        name: wade.name,
        percentage: agreement.wadePercentage
      },
      {
        partnerId: gavin.id,
        name: gavin.name,
        percentage: agreement.gavinPercentage
      }
    ];
  }

  return baseData.partnerSplits
    .filter((split) => {
      return (
        split.business_unit_id === businessUnitId &&
        split.effective_date <= asOfDate &&
        (split.end_date === null || split.end_date >= asOfDate)
      );
    })
    .sort((left, right) => Number(right.percentage) - Number(left.percentage))
    .map((split) => {
      const partner = baseData.partners.find((entry) => entry.id === split.partner_id);

      return {
        partnerId: split.partner_id,
        name: partner?.name ?? "Unknown partner",
        percentage: Number(split.percentage)
      } satisfies PartnerSplitInput;
    });
}

export async function assertMonthUnlocked(monthDate: string, adminOverride = false) {
  if (adminOverride) {
    return;
  }

  const supabase = ensureSupabase();
  const monthStart = toDateString(getMonthStart(new Date(`${monthDate}T00:00:00`)));
  const { data, error } = await supabase
    .from("monthly_closes")
    .select("is_locked")
    .eq("close_month", monthStart)
    .maybeSingle<{ is_locked: boolean }>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.is_locked) {
    throw new Error(`Month ${monthStart} is locked. Use admin override to change closed periods.`);
  }
}

function buildPayouts(distributablePool: number, partnerSplits: PartnerSplitInput[]) {
  return calculateWaterfall({
    grossRevenue: 0,
    platformFeePercentage: 0,
    platformFeeFlat: 0,
    variableCosts: 0,
    opsTaskActual: 0,
    marketingFundPercentage: 0,
    operatingReservePercentage: 0,
    marketingContributionsApplied: distributablePool,
    partnerSplits
  }).partnerPayouts;
}

export function calculateMonthlySnapshotFromBase(
  baseData: FinanceBaseData,
  businessUnitId: string,
  monthDate: string
): MonthlySnapshotComputation {
  const targetDate = new Date(`${monthDate}T00:00:00`);
  const monthStartDate = getMonthStart(targetDate);
  const monthStart = toDateString(monthStartDate);
  const monthKey = toMonthKey(monthStartDate);
  const unit = baseData.businessUnits.find((entry) => entry.id === businessUnitId);

  if (!unit) {
    throw new Error("Business unit not found for monthly snapshot calculation.");
  }

  const agreement = getSilverNaturalsAgreementStatusFromBase(baseData);
  const unitRevenueThisMonth = baseData.revenueEvents.filter(
    (event) => event.business_unit_id === businessUnitId && getMonthKeyFromDateString(event.transaction_date) === monthKey
  );
  const standardRevenueEvents = unitRevenueThisMonth.filter((event) => !event.is_setup_fee);
  const setupFeeRevenueEvents = unitRevenueThisMonth.filter((event) => event.is_setup_fee);
  const currentMonthExpenses = baseData.expenses.filter((expense) => expenseAmountForMonth(expense, monthStartDate) > 0);
  const unitExpenseAmountByCategory = {
    variable: roundCurrency(
      currentMonthExpenses
        .filter((expense) => expense.business_unit_id === businessUnitId && expense.category === "variable")
        .reduce((sum, expense) => sum + expenseAmountForMonth(expense, monthStartDate), 0)
    ),
    opsTax: roundCurrency(
      currentMonthExpenses
        .filter((expense) => expense.business_unit_id === businessUnitId && expense.category === "ops_tax")
        .reduce((sum, expense) => sum + expenseAmountForMonth(expense, monthStartDate), 0)
    )
  };
  const allRevenueThisMonth = baseData.revenueEvents.filter(
    (event) => getMonthKeyFromDateString(event.transaction_date) === monthKey
  );
  const totalCurrentGross = roundCurrency(
    allRevenueThisMonth.reduce((sum, event) => sum + Number(event.gross_amount), 0)
  );
  const globalOpsTaxThisMonth = roundCurrency(
    currentMonthExpenses
      .filter((expense) => expense.business_unit_id === null && expense.category === "ops_tax")
      .reduce((sum, expense) => sum + expenseAmountForMonth(expense, monthStartDate), 0)
  );
  const unitGrossThisMonth = roundCurrency(
    unitRevenueThisMonth.reduce((sum, event) => sum + Number(event.gross_amount), 0)
  );
  const allocatedGlobalOpsTax = baseData.businessUnits.length
    ? roundCurrency(
        totalCurrentGross > 0 ? globalOpsTaxThisMonth * (unitGrossThisMonth / totalCurrentGross) : globalOpsTaxThisMonth / baseData.businessUnits.length
      )
    : 0;
  const marketingFundPercentage = [...baseData.configs]
    .filter((entry) => entry.config_key === "marketing_fund_percentage" && (entry.business_unit_id === businessUnitId || entry.business_unit_id === null))
    .sort((left, right) => {
      if (left.business_unit_id === businessUnitId && right.business_unit_id !== businessUnitId) {
        return -1;
      }

      if (left.business_unit_id !== businessUnitId && right.business_unit_id === businessUnitId) {
        return 1;
      }

      return right.effective_date.localeCompare(left.effective_date);
    })[0]?.config_value ?? 10;
  const operatingReservePercentage = [...baseData.configs]
    .filter((entry) => entry.config_key === "operating_reserve_percentage" && (entry.business_unit_id === businessUnitId || entry.business_unit_id === null))
    .sort((left, right) => {
      if (left.business_unit_id === businessUnitId && right.business_unit_id !== businessUnitId) {
        return -1;
      }

      if (left.business_unit_id !== businessUnitId && right.business_unit_id === businessUnitId) {
        return 1;
      }

      return right.effective_date.localeCompare(left.effective_date);
    })[0]?.config_value ?? 12;

  const marketingContributionsApplied = 0;
  const standardGrossRevenue = roundCurrency(
    standardRevenueEvents.reduce((sum, event) => sum + Number(event.gross_amount), 0)
  );
  const standardPlatformFees = roundCurrency(
    standardRevenueEvents.reduce((sum, event) => sum + Number(event.platform_fee_amount), 0)
  );
  const standardNetAfterPlatform = roundCurrency(standardGrossRevenue - standardPlatformFees);
  const setupFeeGrossRevenue = roundCurrency(
    setupFeeRevenueEvents.reduce((sum, event) => sum + Number(event.gross_amount), 0)
  );
  const setupFeePlatformFees = roundCurrency(
    setupFeeRevenueEvents.reduce((sum, event) => sum + Number(event.platform_fee_amount), 0)
  );
  const setupFeeNetAfterPlatform = roundCurrency(setupFeeGrossRevenue - setupFeePlatformFees);
  const totalNetAfterPlatform = roundCurrency(standardNetAfterPlatform + setupFeeNetAfterPlatform);
  const totalVariableCosts = unitExpenseAmountByCategory.variable;
  const totalOpsTaxAllocated = roundCurrency(unitExpenseAmountByCategory.opsTax + allocatedGlobalOpsTax);

  const standardShare = totalNetAfterPlatform > 0 ? standardNetAfterPlatform / totalNetAfterPlatform : 1;
  const standardVariableCosts = roundCurrency(totalVariableCosts * standardShare);
  const standardOpsTaxAllocated = roundCurrency(totalOpsTaxAllocated * standardShare);
  const setupFeeVariableCosts = roundCurrency(totalVariableCosts - standardVariableCosts);
  const setupFeeOpsTaxAllocated = roundCurrency(totalOpsTaxAllocated - standardOpsTaxAllocated);

  const standardWaterfall = calculateWaterfall({
    grossRevenue: standardGrossRevenue,
    platformFeePercentage: 0,
    platformFeeFlat: 0,
    variableCosts: standardVariableCosts,
    opsTaskActual: standardOpsTaxAllocated,
    marketingFundPercentage,
    operatingReservePercentage,
    marketingContributionsApplied,
    partnerSplits: []
  });
  const setupFeeDistributablePool = roundCurrency(setupFeeNetAfterPlatform - setupFeeVariableCosts - setupFeeOpsTaxAllocated);
  const distributablePool = roundCurrency(standardWaterfall.distributablePool + setupFeeDistributablePool);
  const partnerSplits = resolvePartnerSplitsForUnit(baseData, businessUnitId, monthStart);
  const agreementPending = unit.slug === "silver_naturals" && !agreement.finalized;
  const partnerPayouts = agreementPending ? [] : buildPayouts(distributablePool, partnerSplits);

  return {
    businessUnit: unit,
    monthStart,
    grossRevenue: roundCurrency(standardGrossRevenue + setupFeeGrossRevenue),
    platformFees: roundCurrency(standardPlatformFees + setupFeePlatformFees),
    variableCosts: totalVariableCosts,
    opsTaxAllocated: totalOpsTaxAllocated,
    marketingFund: standardWaterfall.marketingFund,
    operatingReserve: standardWaterfall.operatingReserve,
    marketingContributionsApplied: standardWaterfall.marketingContributionsApplied,
    setupFeeRevenue: setupFeeGrossRevenue,
    setupFeeDistributablePool,
    distributablePool,
    partnerPayouts,
    agreementPending,
    waterfall: {
      ...standardWaterfall,
      grossRevenue: roundCurrency(standardWaterfall.grossRevenue + setupFeeGrossRevenue),
      platformFees: roundCurrency(standardWaterfall.platformFees + setupFeePlatformFees),
      netAfterPlatform: roundCurrency(standardWaterfall.netAfterPlatform + setupFeeNetAfterPlatform),
      variableCosts: totalVariableCosts,
      netAfterVariable: roundCurrency(standardWaterfall.netAfterPlatform + setupFeeNetAfterPlatform - totalVariableCosts),
      opsTaskAllocated: totalOpsTaxAllocated,
      opsTaxAllocated: totalOpsTaxAllocated,
      netAfterOpsTax: roundCurrency(standardWaterfall.netAfterPlatform + setupFeeNetAfterPlatform - totalVariableCosts - totalOpsTaxAllocated),
      distributablePool,
      partnerPayouts
    }
  };
}

export async function recalculateMonthlySnapshotForUnit(businessUnitId: string, monthDate: string) {
  const supabase = ensureSupabase();
  const baseData = await fetchFinanceBaseData();
  const snapshot = calculateMonthlySnapshotFromBase(baseData, businessUnitId, monthDate);

  const snapshotInsert: MonthlySnapshotInsert = {
    business_unit_id: businessUnitId,
    snapshot_month: snapshot.monthStart,
    gross_revenue: snapshot.grossRevenue,
    platform_fees: snapshot.platformFees,
    variable_costs: snapshot.variableCosts,
    ops_tax_allocated: snapshot.opsTaxAllocated,
    marketing_fund: snapshot.marketingFund,
    operating_reserve: snapshot.operatingReserve,
    marketing_contributions_applied: snapshot.marketingContributionsApplied,
    setup_fee_revenue: snapshot.setupFeeRevenue,
    setup_fee_distributable_pool: snapshot.setupFeeDistributablePool,
    distributable_pool: snapshot.distributablePool
  };

  const { error } = await supabase.from("monthly_snapshots").upsert(snapshotInsert as never, {
    onConflict: "business_unit_id,snapshot_month"
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    businessUnitId,
    businessUnitSlug: snapshot.businessUnit.slug,
    monthStart: snapshot.monthStart,
    waterfall: snapshot.waterfall,
    partnerPayouts: snapshot.partnerPayouts,
    agreementPending: snapshot.agreementPending
  };
}

export async function getRevenueEntryPageData(): Promise<RevenueEntryPageData> {
  noStore();

  const baseData = await fetchFinanceBaseData();

  return {
    businessUnits: baseData.businessUnits.map((unit) => ({
      id: unit.id,
      name: unit.name,
      slug: unit.slug
    })),
    today: toDateString(new Date()),
    silverNaturalsAgreement: getSilverNaturalsAgreementStatusFromBase(baseData)
  };
}

export async function getExpenseManagementData(): Promise<ExpenseManagementData> {
  noStore();

  const baseData = await fetchFinanceBaseData();
  const unitById = new Map(baseData.businessUnits.map((unit) => [unit.id, unit]));
  const recurringExpenses = baseData.expenses
    .filter((expense) => expense.is_recurring)
    .map((expense) => ({
      id: expense.id,
      businessUnitId: expense.business_unit_id,
      businessUnitName: expense.business_unit_id ? unitById.get(expense.business_unit_id)?.name ?? "Unknown unit" : "Kerzie Global",
      category: expense.category,
      vendor: expense.vendor ?? "Unknown vendor",
      description: expense.description,
      amount: Number(expense.amount),
      isRecurring: expense.is_recurring,
      recurrenceInterval: expense.recurrence_interval,
      monthlyEquivalent: getRecurringMonthlyEquivalent(expense),
      annualEquivalent: getRecurringAnnualEquivalent(expense),
      receiptUrl: expense.receipt_url,
      isActive: expense.is_active,
      expenseDate: expense.expense_date,
      nextBillingDate: expense.next_billing_date
    }))
    .sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent);
  const projectPaymentsByProjectId = new Map<string, ConsultingProjectPayment[]>();

  for (const payment of baseData.consultingProjectPayments) {
    const existing = projectPaymentsByProjectId.get(payment.project_id) ?? [];
    existing.push(payment);
    projectPaymentsByProjectId.set(payment.project_id, existing);
  }

  const consultingProjects = baseData.consultingProjects.map((project) => {
    const payments = (projectPaymentsByProjectId.get(project.id) ?? []).sort((left, right) => right.payment_date.localeCompare(left.payment_date));
    const collectedToDate = roundCurrency(payments.reduce((sum, payment) => sum + Number(payment.amount), 0));

    return {
      id: project.id,
      businessUnitId: project.business_unit_id,
      businessUnitName: unitById.get(project.business_unit_id)?.name ?? "Kerzie AI",
      projectName: project.project_name,
      clientName: project.client_name,
      projectValue: Number(project.project_value),
      startDate: project.start_date,
      endDate: project.end_date,
      status: project.status,
      description: project.description,
      collectedToDate,
      remainingBalance: roundCurrency(Number(project.project_value) - collectedToDate),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.payment_date,
        description: payment.description,
        invoiceNumber: payment.invoice_number,
        notes: payment.notes
      }))
    } satisfies ConsultingProjectRow;
  });

  return {
    currentMonthLabel: formatMonthLabel(getMonthStart()),
    businessUnits: baseData.businessUnits.map((unit) => ({ id: unit.id, name: unit.name, slug: unit.slug })),
    recurringExpenses,
    oneTimeExpenses: baseData.expenses
      .filter((expense) => !expense.is_recurring || expense.recurrence_interval === "one_time")
      .sort((left, right) => right.expense_date.localeCompare(left.expense_date)),
    consultingProjects
  };
}

export async function upsertMonthlyClose(monthDate: string, updates: Partial<MonthlyCloseInsert>) {
  const supabase = ensureSupabase();
  const monthStart = toDateString(getMonthStart(new Date(`${monthDate}T00:00:00`)));
  const { data: existing, error: existingError } = await supabase
    .from("monthly_closes")
    .select("*")
    .eq("close_month", monthStart)
    .maybeSingle<MonthlyClose>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload: MonthlyCloseInsert = {
    close_month: monthStart,
    revenue_review_completed: updates.revenue_review_completed ?? existing?.revenue_review_completed ?? false,
    recurring_expenses_confirmed: updates.recurring_expenses_confirmed ?? existing?.recurring_expenses_confirmed ?? false,
    commissions_review_completed: updates.commissions_review_completed ?? existing?.commissions_review_completed ?? false,
    snapshot_generated: updates.snapshot_generated ?? existing?.snapshot_generated ?? false,
    payouts_calculated: updates.payouts_calculated ?? existing?.payouts_calculated ?? false,
    pdf_exported: updates.pdf_exported ?? existing?.pdf_exported ?? false,
    is_locked: updates.is_locked ?? existing?.is_locked ?? false,
    locked_at: updates.locked_at ?? existing?.locked_at ?? null,
    locked_by_email: updates.locked_by_email ?? existing?.locked_by_email ?? null,
    anomaly_notes: updates.anomaly_notes ?? existing?.anomaly_notes ?? null,
    admin_override_note: updates.admin_override_note ?? existing?.admin_override_note ?? null
  };

  const { data, error } = await supabase
    .from("monthly_closes")
    .upsert(payload as never, {
      onConflict: "close_month"
    })
    .select("*")
    .single<MonthlyClose>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function setSilverNaturalsAgreementPercentage(percentage: number) {
  const supabase = ensureSupabase();
  const baseData = await fetchFinanceBaseData();
  const unit = baseData.businessUnits.find((entry) => entry.slug === "silver_naturals");

  if (!unit) {
    throw new Error("Silver Naturals business unit not found.");
  }

  const insert = {
    business_unit_id: unit.id,
    config_key: SILVER_NATURALS_WADE_PERCENTAGE_KEY,
    config_value: percentage,
    effective_date: toDateString(new Date()),
    notes: "Wade partner percentage entered from dashboard settings. Gavin receives the remainder."
  };

  const { error: configError } = await supabase.from("waterfall_config").insert(insert as never);

  if (configError) {
    throw new Error(configError.message);
  }

  const { error: revenueError } = await supabase
    .from("revenue_events")
    .update({ is_pending_agreement: false } as never)
    .eq("business_unit_id", unit.id)
    .eq("is_pending_agreement", true);

  if (revenueError) {
    throw new Error(revenueError.message);
  }

  const monthSet = new Set(
    baseData.revenueEvents
      .filter((event) => event.business_unit_id === unit.id)
      .map((event) => event.transaction_date.slice(0, 7))
  );

  for (const monthKey of monthSet) {
    await recalculateMonthlySnapshotForUnit(unit.id, `${monthKey}-01`);
  }

  return {
    businessUnitId: unit.id,
    wadePercentage: percentage,
    gavinPercentage: roundCurrency(100 - percentage)
  };
}

export async function generateSnapshotsForMonth(monthDate: string) {
  const baseData = await fetchFinanceBaseData();
  const results = [];

  for (const unit of baseData.businessUnits) {
    results.push(await recalculateMonthlySnapshotForUnit(unit.id, monthDate));
  }

  return results;
}

export async function generatePayoutLedgerForMonth(monthDate: string) {
  const supabase = ensureSupabase();
  const baseData = await fetchFinanceBaseData();
  const monthStart = toDateString(getMonthStart(new Date(`${monthDate}T00:00:00`)));
  const snapshots = baseData.monthlySnapshots.filter((snapshot) => snapshot.snapshot_month === monthStart);
  const existingLedgerBySnapshotPartner = new Map(
    baseData.payoutLedger.map((entry) => [`${entry.snapshot_id}:${entry.partner_id}`, entry])
  );

  for (const snapshot of snapshots) {
    const computation = calculateMonthlySnapshotFromBase(baseData, snapshot.business_unit_id, monthStart);

    for (const payout of computation.partnerPayouts) {
      const existing = existingLedgerBySnapshotPartner.get(`${snapshot.id}:${payout.partnerId}`) ?? null;
      const payload: Partial<PayoutLedgerInsert> = {
        snapshot_id: snapshot.id,
        partner_id: payout.partnerId,
        business_unit_id: snapshot.business_unit_id,
        gross_payout: payout.amount,
        status: existing?.status ?? "pending",
        payout_date: existing?.payout_date ?? null,
        payment_method: existing?.payment_method ?? null,
        tax_reserve_note: existing?.tax_reserve_note ?? null
      };

      if (existing) {
        const { error } = await supabase
          .from("payout_ledger")
          .update(payload as never)
          .eq("id", existing.id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("payout_ledger").insert(payload as never);

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  return true;
}

export async function getMonthlyCloseData(month?: string): Promise<MonthlyCloseData> {
  noStore();

  const baseData = await fetchFinanceBaseData();
  const [year, monthNumber] = (month ?? toMonthKey(getMonthStart())).split("-").map(Number);
  const monthStartDate = new Date(year, (monthNumber ?? 1) - 1, 1);
  const monthKey = toMonthKey(monthStartDate);
  const monthStart = toDateString(monthStartDate);
  const partnerById = new Map(baseData.partners.map((partner) => [partner.id, partner]));
  const unitById = new Map(baseData.businessUnits.map((unit) => [unit.id, unit]));
  const closeRecord = baseData.monthlyCloses.find((entry) => entry.close_month === monthStart) ?? null;
  const revenueEvents = baseData.revenueEvents
    .filter((event) => getMonthKeyFromDateString(event.transaction_date) === monthKey)
    .map((event) => ({
      id: event.id,
      businessUnitId: event.business_unit_id,
      businessUnitName: unitById.get(event.business_unit_id)?.name ?? "Unknown unit",
      transactionDate: event.transaction_date,
      customerName: event.customer_name,
      description: event.description,
      grossAmount: Number(event.gross_amount),
      reviewStatus: event.review_status,
      reviewNotes: event.review_notes,
      isSetupFee: event.is_setup_fee,
      isPendingAgreement: event.is_pending_agreement
    }))
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate));
  const recurringExpenses = (await getExpenseManagementData()).recurringExpenses.filter((expense) => expense.isActive);
  const dueScoutCommissions = baseData.scoutCommissions
    .filter((commission) => getMonthKeyFromDateString(commission.payout_date) === monthKey)
    .map((commission) => ({
      ...commission,
      scoutName: partnerById.get(commission.partner_id)?.name ?? "Unknown scout",
      businessUnitName: unitById.get(commission.business_unit_id)?.name ?? "Unknown unit"
    }));
  const snapshots = baseData.businessUnits.map((unit) => {
    const computation = calculateMonthlySnapshotFromBase(baseData, unit.id, monthStart);

    return {
      unitId: unit.id,
      unitName: unit.name,
      unitSlug: unit.slug,
      distributablePool: computation.distributablePool,
      partnerPayouts: computation.partnerPayouts
    };
  });
  const stepStates: MonthlyCloseStepState[] = [
    {
      label: "Review revenue",
      complete: closeRecord?.revenue_review_completed ?? revenueEvents.every((event) => event.reviewStatus !== "unreviewed"),
      description: "Confirm every revenue event or flag anomalies."
    },
    {
      label: "Recurring expenses",
      complete: closeRecord?.recurring_expenses_confirmed ?? false,
      description: "Confirm active recurring subscriptions and their billing cadence."
    },
    {
      label: "Scout commissions",
      complete:
        closeRecord?.commissions_review_completed ??
        dueScoutCommissions.every((commission) => commission.status === "paid" || commission.status === "held"),
      description: "Mark each due scout commission as paid or hold."
    },
    {
      label: "Generate snapshots",
      complete: closeRecord?.snapshot_generated ?? baseData.monthlySnapshots.some((snapshot) => snapshot.snapshot_month === monthStart),
      description: "Recalculate all monthly snapshots for the close month."
    },
    {
      label: "Partner payouts",
      complete: closeRecord?.payouts_calculated ?? baseData.payoutLedger.some((entry) => {
        const snapshot = baseData.monthlySnapshots.find((item) => item.id === entry.snapshot_id);

        return snapshot?.snapshot_month === monthStart;
      }),
      description: "Persist payout ledger rows for Wade, Gavin, and any other active split."
    },
    {
      label: "Export PDF",
      complete: closeRecord?.pdf_exported ?? false,
      description: "Open the payout summary print view and save it as PDF."
    },
    {
      label: "Lock month",
      complete: closeRecord?.is_locked ?? false,
      description: "Freeze the month against further edits unless admin override is used."
    }
  ];

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthStartDate),
    closeRecord,
    revenueEvents,
    recurringExpenses,
    dueScoutCommissions,
    snapshots,
    stepStates
  };
}

export function buildManualRevenueInsert(payload: {
  businessUnitId: string;
  source: RevenueEvent["source"];
  revenueType: RevenueEvent["revenue_type"];
  grossAmount: number;
  paymentMethod: RevenueEvent["payment_method"];
  transactionDate: string;
  customerName?: string;
  description?: string;
  invoiceNumber?: string;
  notes?: string;
  stripePaymentId?: string;
  isAttributed?: boolean;
  isSetupFee?: boolean;
  isPendingAgreement?: boolean;
}): RevenueEventInsert {
  return {
    business_unit_id: payload.businessUnitId,
    source: payload.source,
    revenue_type: payload.revenueType,
    gross_amount: payload.grossAmount,
    platform_fee_percentage: 0,
    transaction_date: payload.transactionDate,
    description: payload.description?.trim() || null,
    payment_method: payload.paymentMethod ?? null,
    customer_name: payload.customerName?.trim() || null,
    stripe_payment_id: payload.stripePaymentId?.trim() || null,
    invoice_number: payload.invoiceNumber?.trim() || null,
    notes: payload.notes?.trim() || null,
    is_attributed: payload.isAttributed ?? false,
    is_setup_fee: payload.isSetupFee ?? false,
    is_pending_agreement: payload.isPendingAgreement ?? false,
    review_status: "unreviewed",
    review_notes: null
  };
}

export function buildExpenseInsert(payload: {
  businessUnitId: string | null;
  category: Expense["category"];
  amount: number;
  description: string;
  vendor?: string;
  expenseDate: string;
  isRecurring: boolean;
  recurrenceInterval: Expense["recurrence_interval"];
  receiptUrl?: string;
  nextBillingDate?: string | null;
}): ExpenseInsert {
  return {
    business_unit_id: payload.businessUnitId,
    category: payload.category,
    amount: payload.amount,
    description: payload.description,
    vendor: payload.vendor?.trim() || null,
    expense_date: payload.expenseDate,
    is_recurring: payload.isRecurring,
    recurrence_interval: payload.recurrenceInterval,
    receipt_url: payload.receiptUrl?.trim() || null,
    is_active: true,
    next_billing_date: payload.nextBillingDate ?? null
  };
}
