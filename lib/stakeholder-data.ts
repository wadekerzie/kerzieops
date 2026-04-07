import { unstable_noStore as noStore } from "next/cache";

import { getManagementDashboardData } from "@/lib/dashboard-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { StakeholderAccessContext } from "@/lib/tokens";
import { calculateSilverMoonEconomics, type PartnerSplitInput } from "@/lib/waterfall";
import { roundCurrency } from "@/lib/utils";
import type {
  BusinessUnit,
  CapitalContribution,
  MarketingContribution,
  MonthlySnapshot,
  Partner,
  PartnerSplit,
  RevenueEvent,
  StakeholderAccessToken,
  WaterfallConfig
} from "@/types";

interface StakeholderBaseData {
  businessUnits: BusinessUnit[];
  partners: Partner[];
  tokens: StakeholderAccessToken[];
}

export interface StakeholderTokenSummary {
  id: string;
  token: string;
  partnerName: string;
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
  createdAt: string;
}

export interface StakeholderSettingsData {
  partners: Array<Pick<Partner, "id" | "name" | "role">>;
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
  tokens: StakeholderTokenSummary[];
}

export interface StakeholderTrendPoint {
  label: string;
  key: string;
  value: number;
  isCurrent: boolean;
}

export interface HunterContributionSummary {
  partnerName: string;
  cashAmount: number;
  sweatHours: number;
  hourlyRate: number;
  sweatAmount: number;
  totalAmount: number;
}

export interface HunterStakeholderData {
  currentMonthLabel: string;
  lastUpdatedAt: string;
  unitId: string;
  unitName: string;
  partnerName: string;
  hunterSharePercentage: number;
  summary: {
    grossSubscriberRevenue: number;
    appleFees: number;
    llmCosts: number;
    opsTaxAllocated: number;
    marketingFund: number;
    operatingReserve: number;
    distributablePool: number;
    hunterShare: number;
  };
  distributions: StakeholderTrendPoint[];
  contributions: {
    wade: HunterContributionSummary;
    gavin: HunterContributionSummary;
    hunterMarketingTotal: number;
  };
  proforma: {
    monthlyPrice: number;
    appleFeePercentage: number;
    avgQueriesPerUserPerMonth: number;
    llmCostPerQuery: number;
    opsTaskAllocated: number;
    marketingFundPercentage: number;
    operatingReservePercentage: number;
    marketingContributionsApplied: number;
    partnerSplits: PartnerSplitInput[];
  };
}

export interface GerryStakeholderData {
  currentMonthLabel: string;
  lastUpdatedAt: string;
  silverMoon: {
    unitId: string;
    totalAttributedSales: number;
    stripeFees: number;
    kerzieCommission: number;
    monthlySales: StakeholderTrendPoint[];
    transactionLog: Array<{
      id: string;
      transactionDate: string;
      amount: number;
      maskedStripePaymentId: string;
    }>;
  };
  silverNaturals: {
    unitId: string;
    setupFeeStatus: "paid" | "pending";
  };
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

function formatShortMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short"
  }).format(date);
}

function pickConfigValue(configs: WaterfallConfig[], unitId: string, key: string, fallbackValue: number) {
  const unitConfig = [...configs]
    .filter((config) => config.business_unit_id === unitId && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (unitConfig?.config_value !== null && typeof unitConfig?.config_value === "number") {
    return Number(unitConfig.config_value);
  }

  const globalConfig = [...configs]
    .filter((config) => config.business_unit_id === null && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (globalConfig?.config_value !== null && typeof globalConfig?.config_value === "number") {
    return Number(globalConfig.config_value);
  }

  return fallbackValue;
}

function activeSplitsForUnit(splits: PartnerSplit[], unitId: string, asOfDate: string) {
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

function maskStripePaymentId(stripePaymentId: string | null) {
  if (!stripePaymentId) {
    return "Not available";
  }

  const lastFour = stripePaymentId.slice(-4);

  return `••••${lastFour}`;
}

function buildContributionSummary(partnerName: string, contributions: CapitalContribution[], partnerId: string | undefined) {
  const partnerContributions = contributions.filter((contribution) => contribution.partner_id === partnerId);
  const cashAmount = roundCurrency(
    partnerContributions
      .filter((contribution) => contribution.contribution_type === "cash")
      .reduce((sum, contribution) => sum + Number(contribution.amount), 0)
  );
  const sweatEntries = partnerContributions.filter((contribution) => contribution.contribution_type === "sweat_equity");
  const sweatHours = roundCurrency(
    sweatEntries.reduce((sum, contribution) => sum + Number(contribution.hours ?? 0), 0)
  );
  const hourlyRate = Number(sweatEntries[0]?.hourly_rate ?? 150);
  const sweatAmount = roundCurrency(
    sweatEntries.reduce((sum, contribution) => sum + Number(contribution.amount), 0)
  );

  return {
    partnerName,
    cashAmount,
    sweatHours,
    hourlyRate,
    sweatAmount,
    totalAmount: roundCurrency(cashAmount + sweatAmount)
  } satisfies HunterContributionSummary;
}

async function fetchStakeholderBaseData(): Promise<StakeholderBaseData> {
  const supabase = ensureSupabase();
  const [businessUnitsResult, partnersResult, tokensResult] = await Promise.all([
    supabase.from("business_units").select("id, name, slug, description, is_active, created_at, updated_at").eq("is_active", true),
    supabase.from("partners").select("id, name, email, role, is_active, created_at, updated_at").eq("is_active", true),
    supabase
      .from("stakeholder_access_tokens")
      .select("id, partner_id, token, business_unit_ids, expires_at, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
  ]);

  if (businessUnitsResult.error) {
    throw new Error(businessUnitsResult.error.message);
  }

  if (partnersResult.error) {
    throw new Error(partnersResult.error.message);
  }

  if (tokensResult.error) {
    throw new Error(tokensResult.error.message);
  }

  return {
    businessUnits: (businessUnitsResult.data ?? []) as BusinessUnit[],
    partners: (partnersResult.data ?? []) as Partner[],
    tokens: (tokensResult.data ?? []) as StakeholderAccessToken[]
  };
}

export async function getStakeholderSettingsData(): Promise<StakeholderSettingsData> {
  noStore();

  const baseData = await fetchStakeholderBaseData();
  const partnerById = new Map(baseData.partners.map((partner) => [partner.id, partner]));
  const businessUnitById = new Map(baseData.businessUnits.map((businessUnit) => [businessUnit.id, businessUnit]));

  return {
    partners: [...baseData.partners]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((partner) => ({
        id: partner.id,
        name: partner.name,
        role: partner.role
      })),
    businessUnits: [...baseData.businessUnits]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((businessUnit) => ({
        id: businessUnit.id,
        name: businessUnit.name,
        slug: businessUnit.slug
      })),
    tokens: baseData.tokens.map((token) => ({
      id: token.id,
      token: token.token,
      partnerName: partnerById.get(token.partner_id)?.name ?? "Unknown partner",
      businessUnits: token.business_unit_ids
        .map((businessUnitId) => businessUnitById.get(businessUnitId))
        .filter((businessUnit): businessUnit is BusinessUnit => Boolean(businessUnit))
        .map((businessUnit) => ({
          id: businessUnit.id,
          name: businessUnit.name,
          slug: businessUnit.slug
        })),
      createdAt: token.created_at
    }))
  };
}

export async function getHunterStakeholderData(
  accessContext: StakeholderAccessContext
): Promise<HunterStakeholderData | null> {
  noStore();

  const managementDashboard = await getManagementDashboardData();
  const allowedUnitIds = new Set(accessContext.businessUnits.map((businessUnit) => businessUnit.id));
  const unit = managementDashboard.units.find((entry) => entry.slug === "zorli" && allowedUnitIds.has(entry.id));

  if (!unit) {
    return null;
  }

  const supabase = ensureSupabase();
  const [partnersResult, partnerSplitsResult, capitalContributionsResult, marketingContributionsResult, monthlySnapshotsResult, configsResult] =
    await Promise.all([
      supabase.from("partners").select("id, name, email, role, is_active, created_at, updated_at"),
      supabase.from("partner_splits").select("*").eq("business_unit_id", unit.id),
      supabase.from("capital_contributions").select("*").eq("business_unit_id", unit.id),
      supabase.from("marketing_contributions").select("*").eq("business_unit_id", unit.id),
      supabase.from("monthly_snapshots").select("*").eq("business_unit_id", unit.id).order("snapshot_month", { ascending: false }).limit(24),
      supabase.from("waterfall_config").select("*")
    ]);

  if (partnersResult.error) {
    throw new Error(partnersResult.error.message);
  }

  if (partnerSplitsResult.error) {
    throw new Error(partnerSplitsResult.error.message);
  }

  if (capitalContributionsResult.error) {
    throw new Error(capitalContributionsResult.error.message);
  }

  if (marketingContributionsResult.error) {
    throw new Error(marketingContributionsResult.error.message);
  }

  if (monthlySnapshotsResult.error) {
    throw new Error(monthlySnapshotsResult.error.message);
  }

  if (configsResult.error) {
    throw new Error(configsResult.error.message);
  }

  const partners = (partnersResult.data ?? []) as Partner[];
  const partnerSplits = (partnerSplitsResult.data ?? []) as PartnerSplit[];
  const capitalContributions = (capitalContributionsResult.data ?? []) as CapitalContribution[];
  const marketingContributions = (marketingContributionsResult.data ?? []) as MarketingContribution[];
  const monthlySnapshots = (monthlySnapshotsResult.data ?? []) as MonthlySnapshot[];
  const configs = (configsResult.data ?? []) as WaterfallConfig[];
  const currentMonthStart = getMonthStart();
  const currentMonthKey = toMonthKey(currentMonthStart);
  const currentDateString = `${currentMonthKey}-01`;
  const activePartnerSplits = activeSplitsForUnit(partnerSplits, unit.id, currentDateString);
  const proformaPartnerSplits = activePartnerSplits.map((split) => ({
    partnerId: split.partner_id,
    name: partners.find((partner) => partner.id === split.partner_id)?.name ?? "Unknown partner",
    percentage: Number(split.percentage)
  }));
  const hunterSplit = proformaPartnerSplits.find((split) => split.partnerId === accessContext.partner?.id);
  const monthlyPrice = 7.99;
  const llmCostPerQuery = 0.02;
  const inferredSubscriberCount =
    unit.grossRevenue > 0 ? Math.max(1, Math.round(unit.grossRevenue / monthlyPrice)) : 0;
  const avgQueriesPerUserPerMonth =
    inferredSubscriberCount > 0 && unit.variableCosts > 0
      ? roundCurrency(unit.variableCosts / inferredSubscriberCount / llmCostPerQuery)
      : 25;
  const marketingFundPercentage = pickConfigValue(configs, unit.id, "marketing_fund_percentage", 10);
  const operatingReservePercentage = pickConfigValue(configs, unit.id, "operating_reserve_percentage", 12);
  const snapshotByMonth = new Map(monthlySnapshots.map((snapshot) => [snapshot.snapshot_month.slice(0, 7), snapshot]));
  const distributions = Array.from({ length: 12 }, (_, index) => {
    const monthDate = addMonths(currentMonthStart, index - 11);
    const monthKey = toMonthKey(monthDate);
    const snapshot = snapshotByMonth.get(monthKey);
    const distributablePool =
      monthKey === currentMonthKey
        ? unit.distributablePool
        : roundCurrency(Number(snapshot?.distributable_pool ?? 0));

    return {
      label: formatShortMonthLabel(monthDate),
      key: monthKey,
      value: roundCurrency(distributablePool * ((hunterSplit?.percentage ?? 20) / 100)),
      isCurrent: monthKey === currentMonthKey
    } satisfies StakeholderTrendPoint;
  });
  const partnerByName = new Map(partners.map((partner) => [partner.name, partner]));
  const wade = buildContributionSummary("Wade Kerzie", capitalContributions, partnerByName.get("Wade Kerzie")?.id);
  const gavin = buildContributionSummary("Gavin Matthews", capitalContributions, partnerByName.get("Gavin Matthews")?.id);
  const hunterMarketingTotal = roundCurrency(
    marketingContributions
      .filter((contribution) => contribution.partner_id === partnerByName.get("Hunter Pinnell")?.id)
      .reduce((sum, contribution) => sum + Number(contribution.amount), 0)
  );

  return {
    currentMonthLabel: managementDashboard.currentMonthLabel,
    lastUpdatedAt: new Date().toISOString(),
    unitId: unit.id,
    unitName: unit.name,
    partnerName: accessContext.partner?.name ?? "Hunter Pinnell",
    hunterSharePercentage: hunterSplit?.percentage ?? 20,
    summary: {
      grossSubscriberRevenue: unit.grossRevenue,
      appleFees: unit.platformFees,
      llmCosts: unit.variableCosts,
      opsTaxAllocated: unit.opsTaxAllocated,
      marketingFund: unit.marketingFund,
      operatingReserve: unit.operatingReserve,
      distributablePool: unit.distributablePool,
      hunterShare:
        unit.partnerPayouts.find((payout) => payout.partnerId === accessContext.partner?.id)?.amount ??
        roundCurrency(unit.distributablePool * ((hunterSplit?.percentage ?? 20) / 100))
    },
    distributions,
    contributions: {
      wade,
      gavin,
      hunterMarketingTotal
    },
    proforma: {
      monthlyPrice,
      appleFeePercentage: 0.15,
      avgQueriesPerUserPerMonth,
      llmCostPerQuery,
      opsTaskAllocated: unit.opsTaxAllocated,
      marketingFundPercentage,
      operatingReservePercentage,
      marketingContributionsApplied: Number(unit.currentSnapshot?.marketing_contributions_applied ?? 0),
      partnerSplits: proformaPartnerSplits
    }
  };
}

export async function getGerryStakeholderData(
  accessContext: StakeholderAccessContext
): Promise<GerryStakeholderData | null> {
  noStore();

  const managementDashboard = await getManagementDashboardData();
  const allowedUnitIds = new Set(accessContext.businessUnits.map((businessUnit) => businessUnit.id));
  const silverMoon = managementDashboard.units.find((entry) => entry.slug === "silver_moon" && allowedUnitIds.has(entry.id));
  const silverNaturals = managementDashboard.units.find(
    (entry) => entry.slug === "silver_naturals" && allowedUnitIds.has(entry.id)
  );

  if (!silverMoon || !silverNaturals) {
    return null;
  }

  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("revenue_events")
    .select("*")
    .in("business_unit_id", [silverMoon.id, silverNaturals.id])
    .order("transaction_date", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const revenueEvents = (data ?? []) as RevenueEvent[];
  const attributedSilverMoonEvents = revenueEvents.filter(
    (event) => event.business_unit_id === silverMoon.id && event.is_attributed
  );
  const currentMonthStart = getMonthStart();
  const currentMonthKey = toMonthKey(currentMonthStart);
  const currentMonthEvents = attributedSilverMoonEvents.filter(
    (event) => getMonthKeyFromDateString(event.transaction_date) === currentMonthKey
  );
  const economics = calculateSilverMoonEconomics({
    grossAttributedSales: roundCurrency(
      currentMonthEvents.reduce((sum, event) => sum + Number(event.gross_amount), 0)
    ),
    transactionCount: currentMonthEvents.length
  });
  const monthlySales = Array.from({ length: 12 }, (_, index) => {
    const monthDate = addMonths(currentMonthStart, index - 11);
    const monthKey = toMonthKey(monthDate);
    const grossAttributedSales = roundCurrency(
      attributedSilverMoonEvents
        .filter((event) => getMonthKeyFromDateString(event.transaction_date) === monthKey)
        .reduce((sum, event) => sum + Number(event.gross_amount), 0)
    );

    return {
      label: formatShortMonthLabel(monthDate),
      key: monthKey,
      value: grossAttributedSales,
      isCurrent: monthKey === currentMonthKey
    } satisfies StakeholderTrendPoint;
  });
  const silverNaturalsRevenue = revenueEvents.filter((event) => event.business_unit_id === silverNaturals.id);

  return {
    currentMonthLabel: managementDashboard.currentMonthLabel,
    lastUpdatedAt: new Date().toISOString(),
    silverMoon: {
      unitId: silverMoon.id,
      totalAttributedSales: economics.grossAttributedSales,
      stripeFees: economics.stripeFees,
      kerzieCommission: economics.kerzieGross,
      monthlySales,
      transactionLog: attributedSilverMoonEvents.slice(0, 25).map((event) => ({
        id: event.id,
        transactionDate: event.transaction_date,
        amount: Number(event.gross_amount),
        maskedStripePaymentId: maskStripePaymentId(event.stripe_payment_id)
      }))
    },
    silverNaturals: {
      unitId: silverNaturals.id,
      setupFeeStatus: silverNaturalsRevenue.some((event) => Number(event.gross_amount) > 0) ? "paid" : "pending"
    }
  };
}
