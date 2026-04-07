import type { Json } from "@/types";
import {
  calculateGotaGuyEconomics,
  calculateSilverMoonEconomics,
  calculateWaterfall,
  calculateZorliUnitEconomics,
  type PartnerSplitInput
} from "@/lib/waterfall";
import { formatCurrency, roundCurrency } from "@/lib/utils";

export type ProformaBusinessUnitType = "zorli" | "gotaguuy" | "silver_moon" | "unison";

export interface ProformaSharedAssumptions {
  partnerSplits: PartnerSplitInput[];
  opsTaskAllocated?: number;
  marketingFundPercentage?: number;
  operatingReservePercentage?: number;
}

export interface ZorliProformaAssumptions extends ProformaSharedAssumptions {
  startingSubscribers: number;
  monthlyGrowthRate: number;
  churnRate?: number;
  monthlyPrice?: number;
  appleFeePercentage?: number;
  avgQueriesPerUserPerMonth?: number;
  llmCostPerQuery?: number;
  marketingSpendMonthly: number;
  hunterMarketingContribution?: number;
}

export interface GotaGuyProformaAssumptions extends ProformaSharedAssumptions {
  startingJobsPerMonth: number;
  monthlyGrowthRate: number;
  platformFeePerJob?: number;
  avgJobValue: number;
  twilioSmsPerJob?: number;
  claudeCallsPerJob?: number;
}

export interface SilverMoonProformaAssumptions extends ProformaSharedAssumptions {
  startingMonthlyAttributedSales: number;
  monthlyGrowthRate: number;
  avgTransactionValue?: number;
  transactionsPerMonth: number;
  kerzieCommissionRate?: number;
}

export interface UnisonProformaAssumptions extends ProformaSharedAssumptions {
  startingActiveSubscriptions: number;
  monthlyNewSubscriptions: number;
  monthlyChurn: number;
  monthlySubscriptionValue: number;
  scoutCommissionRate: number;
}

export type ProformaAssumptions =
  | ZorliProformaAssumptions
  | GotaGuyProformaAssumptions
  | SilverMoonProformaAssumptions
  | UnisonProformaAssumptions;

export interface ProformaInput {
  businessUnitId: string;
  scenarioName: string;
  startMonth: Date;
  assumptions: ProformaAssumptions;
}

export interface ProformaMonthPartnerPayout {
  name: string;
  percentage: number;
  amount: number;
}

export interface ProformaMonthResult {
  monthLabel: string;
  grossRevenue: number;
  platformFees: number;
  variableCosts: number;
  opsTaskAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  distributablePool: number;
  partnerPayouts: ProformaMonthPartnerPayout[];
  subscriberCount?: number;
  jobCount?: number;
  transactionCount?: number;
  activeSubscriptionCount?: number;
  keyMetric: number;
}

export interface ProformaTotals {
  grossRevenue: number;
  platformFees: number;
  variableCosts: number;
  opsTaskAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  distributablePool: number;
  partnerPayouts: ProformaMonthPartnerPayout[];
  keyMetric: number;
}

export interface ProformaResult {
  scenarioName: string;
  businessUnit: {
    id: string;
    type: ProformaBusinessUnitType;
  };
  months: ProformaMonthResult[];
  totals: ProformaTotals;
  breakeven: {
    monthIndex: number | null;
    monthLabel: string | null;
  };
}

export interface ProformaExportableScenarioState {
  businessUnitId: string;
  scenarioName: string;
  startMonth: string;
  assumptions: Json;
}

function encodeBase64Url(value: string) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const encoded = window.btoa(unescape(encodeURIComponent(value)));

    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    return decodeURIComponent(escape(window.atob(padded)));
  }

  return Buffer.from(value, "base64url").toString("utf8");
}

const DEFAULT_ZORLI_CHURN_RATE = 0.05;
const DEFAULT_ZORLI_MONTHLY_PRICE = 7.99;
const DEFAULT_ZORLI_APPLE_FEE_PERCENTAGE = 0.15;
const DEFAULT_ZORLI_AVG_QUERIES = 10;
const DEFAULT_ZORLI_LLM_COST = 0.02;
const DEFAULT_GOTA_GUY_PLATFORM_FEE = 25;
const DEFAULT_GOTA_GUY_TWILIO_SMS_PER_JOB = 8;
const DEFAULT_GOTA_GUY_CLAUDE_CALLS_PER_JOB = 3;
const DEFAULT_SILVER_MOON_AVG_TRANSACTION_VALUE = 1250;
const DEFAULT_SILVER_MOON_KERZIE_COMMISSION_RATE = 0.15;

function normalizeRate(input: number | undefined, fallback = 0) {
  const value = input ?? fallback;

  if (!Number.isFinite(value)) {
    return fallback;
  }

  if (Math.abs(value) > 1) {
    return value / 100;
  }

  return value;
}

function toMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function roundCount(value: number) {
  return Math.max(0, Math.round(value));
}

function inferBusinessUnitType(assumptions: ProformaAssumptions): ProformaBusinessUnitType {
  if ("startingSubscribers" in assumptions) {
    return "zorli";
  }

  if ("startingJobsPerMonth" in assumptions) {
    return "gotaguuy";
  }

  if ("startingMonthlyAttributedSales" in assumptions) {
    return "silver_moon";
  }

  return "unison";
}

function sumPartnerPayouts(months: ProformaMonthResult[]) {
  const totals = new Map<string, ProformaMonthPartnerPayout>();

  for (const month of months) {
    for (const payout of month.partnerPayouts) {
      const current = totals.get(payout.name);

      if (current) {
        current.amount = roundCurrency(current.amount + payout.amount);
      } else {
        totals.set(payout.name, {
          name: payout.name,
          percentage: payout.percentage,
          amount: payout.amount
        });
      }
    }
  }

  return Array.from(totals.values()).sort((left, right) => right.amount - left.amount);
}

function buildBreakeven(months: ProformaMonthResult[]) {
  const monthIndex = months.findIndex((month) => month.distributablePool > 0);

  return {
    monthIndex: monthIndex === -1 ? null : monthIndex + 1,
    monthLabel: monthIndex === -1 ? null : months[monthIndex]?.monthLabel ?? null
  };
}

function toPartnerPayouts(
  payouts: Array<{
    name: string;
    percentage: number;
    amount?: number;
    amountTotal?: number;
  }>
) {
  return payouts.map((payout) => ({
    name: payout.name,
    percentage: payout.percentage,
    amount: roundCurrency(payout.amount ?? payout.amountTotal ?? 0)
  }));
}

function buildZorliMonths(startMonth: Date, assumptions: ZorliProformaAssumptions): ProformaMonthResult[] {
  const months: ProformaMonthResult[] = [];
  const growthRate = normalizeRate(assumptions.monthlyGrowthRate);
  const churnRate = normalizeRate(assumptions.churnRate, DEFAULT_ZORLI_CHURN_RATE);
  const monthlyPrice = assumptions.monthlyPrice ?? DEFAULT_ZORLI_MONTHLY_PRICE;
  const appleFeePercentage = assumptions.appleFeePercentage ?? DEFAULT_ZORLI_APPLE_FEE_PERCENTAGE;
  const avgQueriesPerUserPerMonth = assumptions.avgQueriesPerUserPerMonth ?? DEFAULT_ZORLI_AVG_QUERIES;
  const llmCostPerQuery = assumptions.llmCostPerQuery ?? DEFAULT_ZORLI_LLM_COST;
  const netMarketingSpend = roundCurrency(
    Math.max(0, assumptions.marketingSpendMonthly - (assumptions.hunterMarketingContribution ?? 0))
  );
  let subscribers = roundCount(assumptions.startingSubscribers);

  for (let index = 0; index < 12; index += 1) {
    const monthDate = addMonths(startMonth, index);
    const economics = calculateZorliUnitEconomics({
      subscriberCount: subscribers,
      monthlyPrice,
      appleFeePercentage,
      avgQueriesPerUserPerMonth,
      llmCostPerQuery,
      opsTaskAllocated: assumptions.opsTaskAllocated ?? 0,
      marketingFundPercentage: assumptions.marketingFundPercentage ?? 10,
      operatingReservePercentage: assumptions.operatingReservePercentage ?? 12,
      marketingContributionsApplied: -netMarketingSpend,
      partnerSplits: assumptions.partnerSplits
    });

    months.push({
      monthLabel: toMonthLabel(monthDate),
      grossRevenue: economics.grossRevenue,
      platformFees: economics.appleFees,
      variableCosts: economics.llmCosts,
      opsTaskAllocated: economics.opsTaskAllocated,
      marketingFund: economics.marketingFund,
      operatingReserve: economics.operatingReserve,
      distributablePool: economics.distributablePool,
      partnerPayouts: toPartnerPayouts(economics.partnerPayouts),
      subscriberCount: subscribers,
      keyMetric: subscribers
    });

    subscribers = roundCount(subscribers + subscribers * growthRate - subscribers * churnRate);
  }

  return months;
}

function buildGotaGuyMonths(startMonth: Date, assumptions: GotaGuyProformaAssumptions): ProformaMonthResult[] {
  const months: ProformaMonthResult[] = [];
  const growthRate = normalizeRate(assumptions.monthlyGrowthRate);
  const platformFeePerJob = assumptions.platformFeePerJob ?? DEFAULT_GOTA_GUY_PLATFORM_FEE;
  const twilioSmsPerJob = assumptions.twilioSmsPerJob ?? DEFAULT_GOTA_GUY_TWILIO_SMS_PER_JOB;
  const claudeCallsPerJob = assumptions.claudeCallsPerJob ?? DEFAULT_GOTA_GUY_CLAUDE_CALLS_PER_JOB;
  let jobs = roundCount(assumptions.startingJobsPerMonth);

  for (let index = 0; index < 12; index += 1) {
    const monthDate = addMonths(startMonth, index);
    const economics = calculateGotaGuyEconomics({
      jobCount: jobs,
      platformFeePerJob,
      avgJobValue: assumptions.avgJobValue,
      twilioSmsCount: jobs * twilioSmsPerJob,
      claudeApiCalls: jobs * claudeCallsPerJob,
      opsTaskAllocated: assumptions.opsTaskAllocated ?? 0,
      marketingFundPercentage: assumptions.marketingFundPercentage ?? 10,
      operatingReservePercentage: assumptions.operatingReservePercentage ?? 12,
      partnerSplits: assumptions.partnerSplits
    });

    months.push({
      monthLabel: toMonthLabel(monthDate),
      grossRevenue: economics.grossRevenue,
      platformFees: 0,
      variableCosts: economics.variableCosts.total,
      opsTaskAllocated: economics.opsTaskAllocated,
      marketingFund: economics.marketingFund,
      operatingReserve: economics.operatingReserve,
      distributablePool: economics.distributablePool,
      partnerPayouts: toPartnerPayouts(economics.partnerPayouts),
      jobCount: jobs,
      keyMetric: jobs
    });

    jobs = roundCount(jobs + jobs * growthRate);
  }

  return months;
}

function buildSilverMoonMonths(startMonth: Date, assumptions: SilverMoonProformaAssumptions): ProformaMonthResult[] {
  const months: ProformaMonthResult[] = [];
  const growthRate = normalizeRate(assumptions.monthlyGrowthRate);
  const avgTransactionValue = assumptions.avgTransactionValue ?? DEFAULT_SILVER_MOON_AVG_TRANSACTION_VALUE;
  const kerzieCommissionRate = assumptions.kerzieCommissionRate ?? DEFAULT_SILVER_MOON_KERZIE_COMMISSION_RATE;
  let grossSales = roundCurrency(assumptions.startingMonthlyAttributedSales);
  let transactionCount = Math.max(0, assumptions.transactionsPerMonth);

  for (let index = 0; index < 12; index += 1) {
    const monthDate = addMonths(startMonth, index);
    const economics = calculateSilverMoonEconomics({
      grossAttributedSales: grossSales,
      transactionCount,
      kerziePercentage: kerzieCommissionRate,
      unitPrice: avgTransactionValue
    });
    const wadePercentage = economics.kerzieGross > 0 ? roundCurrency((economics.wadeNet / economics.kerzieGross) * 100) : 0;
    const gavinPercentage = economics.kerzieGross > 0 ? roundCurrency((economics.gavinNet / economics.kerzieGross) * 100) : 0;

    months.push({
      monthLabel: toMonthLabel(monthDate),
      grossRevenue: economics.grossAttributedSales,
      platformFees: economics.stripeFees,
      variableCosts: 0,
      opsTaskAllocated: 0,
      marketingFund: 0,
      operatingReserve: 0,
      distributablePool: economics.kerzieGross,
      partnerPayouts: [
        { name: "Wade Kerzie", percentage: wadePercentage, amount: economics.wadeNet },
        { name: "Gavin Matthews", percentage: gavinPercentage, amount: economics.gavinNet }
      ],
      transactionCount,
      keyMetric: transactionCount
    });

    grossSales = roundCurrency(grossSales * (1 + growthRate));
    transactionCount = roundCount(grossSales / avgTransactionValue);
  }

  return months;
}

function buildUnisonMonths(startMonth: Date, assumptions: UnisonProformaAssumptions): ProformaMonthResult[] {
  const months: ProformaMonthResult[] = [];
  const churnRate = normalizeRate(assumptions.monthlyChurn);
  const scoutCommissionRate = normalizeRate(assumptions.scoutCommissionRate);
  let activeSubscriptions = roundCount(assumptions.startingActiveSubscriptions);

  for (let index = 0; index < 12; index += 1) {
    const monthDate = addMonths(startMonth, index);
    const grossRevenue = roundCurrency(activeSubscriptions * assumptions.monthlySubscriptionValue);
    const scoutCommissions = roundCurrency(grossRevenue * scoutCommissionRate);
    const waterfall = calculateWaterfall({
      grossRevenue,
      platformFeePercentage: 0,
      platformFeeFlat: 0,
      variableCosts: scoutCommissions,
      opsTaskActual: assumptions.opsTaskAllocated ?? 0,
      marketingFundPercentage: assumptions.marketingFundPercentage ?? 10,
      operatingReservePercentage: assumptions.operatingReservePercentage ?? 12,
      marketingContributionsApplied: 0,
      partnerSplits: assumptions.partnerSplits
    });

    months.push({
      monthLabel: toMonthLabel(monthDate),
      grossRevenue: waterfall.grossRevenue,
      platformFees: waterfall.platformFees,
      variableCosts: waterfall.variableCosts,
      opsTaskAllocated: waterfall.opsTaskAllocated,
      marketingFund: waterfall.marketingFund,
      operatingReserve: waterfall.operatingReserve,
      distributablePool: waterfall.distributablePool,
      partnerPayouts: toPartnerPayouts(waterfall.partnerPayouts),
      activeSubscriptionCount: activeSubscriptions,
      keyMetric: activeSubscriptions
    });

    activeSubscriptions = roundCount(
      activeSubscriptions + assumptions.monthlyNewSubscriptions - activeSubscriptions * churnRate
    );
  }

  return months;
}

export function generateProforma(input: ProformaInput): ProformaResult {
  const unitType = inferBusinessUnitType(input.assumptions);
  let months: ProformaMonthResult[] = [];

  if (unitType === "zorli") {
    months = buildZorliMonths(input.startMonth, input.assumptions as ZorliProformaAssumptions);
  }

  if (unitType === "gotaguuy") {
    months = buildGotaGuyMonths(input.startMonth, input.assumptions as GotaGuyProformaAssumptions);
  }

  if (unitType === "silver_moon") {
    months = buildSilverMoonMonths(input.startMonth, input.assumptions as SilverMoonProformaAssumptions);
  }

  if (unitType === "unison") {
    months = buildUnisonMonths(input.startMonth, input.assumptions as UnisonProformaAssumptions);
  }

  return {
    scenarioName: input.scenarioName,
    businessUnit: {
      id: input.businessUnitId,
      type: unitType
    },
    months,
    totals: {
      grossRevenue: roundCurrency(months.reduce((sum, month) => sum + month.grossRevenue, 0)),
      platformFees: roundCurrency(months.reduce((sum, month) => sum + month.platformFees, 0)),
      variableCosts: roundCurrency(months.reduce((sum, month) => sum + month.variableCosts, 0)),
      opsTaskAllocated: roundCurrency(months.reduce((sum, month) => sum + month.opsTaskAllocated, 0)),
      marketingFund: roundCurrency(months.reduce((sum, month) => sum + month.marketingFund, 0)),
      operatingReserve: roundCurrency(months.reduce((sum, month) => sum + month.operatingReserve, 0)),
      distributablePool: roundCurrency(months.reduce((sum, month) => sum + month.distributablePool, 0)),
      partnerPayouts: sumPartnerPayouts(months),
      keyMetric: roundCurrency(months.reduce((sum, month) => sum + month.keyMetric, 0))
    },
    breakeven: buildBreakeven(months)
  };
}

export function buildProformaAssumptionSummary(assumptions: ProformaAssumptions) {
  if ("startingSubscribers" in assumptions) {
    return [
      `Starting subscribers: ${assumptions.startingSubscribers}`,
      `Growth: ${(normalizeRate(assumptions.monthlyGrowthRate) * 100).toFixed(1)}%`,
      `Churn: ${(normalizeRate(assumptions.churnRate, DEFAULT_ZORLI_CHURN_RATE) * 100).toFixed(1)}%`,
      `Monthly price: ${formatCurrency(assumptions.monthlyPrice ?? DEFAULT_ZORLI_MONTHLY_PRICE)}`,
      `Marketing spend: ${formatCurrency(assumptions.marketingSpendMonthly)}`
    ];
  }

  if ("startingJobsPerMonth" in assumptions) {
    return [
      `Starting jobs: ${assumptions.startingJobsPerMonth}`,
      `Job growth: ${(normalizeRate(assumptions.monthlyGrowthRate) * 100).toFixed(1)}%`,
      `Platform fee per job: ${formatCurrency(assumptions.platformFeePerJob ?? DEFAULT_GOTA_GUY_PLATFORM_FEE)}`,
      `Average job value: ${formatCurrency(assumptions.avgJobValue)}`
    ];
  }

  if ("startingMonthlyAttributedSales" in assumptions) {
    return [
      `Starting attributed sales: ${formatCurrency(assumptions.startingMonthlyAttributedSales)}`,
      `Growth: ${(normalizeRate(assumptions.monthlyGrowthRate) * 100).toFixed(1)}%`,
      `Average transaction value: ${formatCurrency(assumptions.avgTransactionValue ?? DEFAULT_SILVER_MOON_AVG_TRANSACTION_VALUE)}`,
      `Starting transactions: ${assumptions.transactionsPerMonth}`
    ];
  }

  return [
    `Starting subscriptions: ${assumptions.startingActiveSubscriptions}`,
    `Monthly new subscriptions: ${assumptions.monthlyNewSubscriptions}`,
    `Monthly churn: ${(normalizeRate(assumptions.monthlyChurn) * 100).toFixed(1)}%`,
    `Subscription value: ${formatCurrency(assumptions.monthlySubscriptionValue)}`,
    `Scout commission: ${(normalizeRate(assumptions.scoutCommissionRate) * 100).toFixed(1)}%`
  ];
}

export function serializeProformaState(input: ProformaInput) {
  const state: ProformaExportableScenarioState = {
    businessUnitId: input.businessUnitId,
    scenarioName: input.scenarioName,
    startMonth: input.startMonth.toISOString(),
    assumptions: input.assumptions as unknown as Json
  };

  return encodeBase64Url(JSON.stringify(state));
}

export function deserializeProformaState(serialized: string): ProformaInput {
  const state = JSON.parse(decodeBase64Url(serialized)) as ProformaExportableScenarioState;

  return {
    businessUnitId: state.businessUnitId,
    scenarioName: state.scenarioName,
    startMonth: new Date(state.startMonth),
    assumptions: state.assumptions as unknown as ProformaAssumptions
  };
}

/**
 * Legacy helper preserved so the original Prompt 3 API route keeps working.
 */
export interface ProformaTierInput {
  tierName: string;
  subscribers: number;
  price: number;
  llmCostPerUser: number;
  allocatedOpsTaxPerUser: number;
}

export interface ProformaScenarioInput {
  appleCutPercentage?: number;
  tiers: ProformaTierInput[];
}

export interface ProformaTierResult extends ProformaTierInput {
  appleCutPerSubscriber: number;
  netDistributablePerSubscriber: number;
  totalNetDistributable: number;
}

export interface ProformaScenarioResult {
  appleCutPercentage: number;
  tiers: ProformaTierResult[];
  totalSubscribers: number;
  totalNetDistributable: number;
}

export function calculateProformaTier(input: ProformaTierInput, appleCutPercentage = 15): ProformaTierResult {
  const appleCutPerSubscriber = roundCurrency(input.price * (appleCutPercentage / 100));
  const netDistributablePerSubscriber = roundCurrency(
    input.price - appleCutPerSubscriber - input.llmCostPerUser - input.allocatedOpsTaxPerUser
  );
  const totalNetDistributable = roundCurrency(netDistributablePerSubscriber * input.subscribers);

  return {
    ...input,
    appleCutPerSubscriber,
    netDistributablePerSubscriber,
    totalNetDistributable
  };
}

export function calculateProformaScenario(input: ProformaScenarioInput): ProformaScenarioResult {
  const appleCutPercentage = input.appleCutPercentage ?? 15;
  const tiers = input.tiers.map((tier) => calculateProformaTier(tier, appleCutPercentage));

  return {
    appleCutPercentage,
    tiers,
    totalSubscribers: tiers.reduce((sum, tier) => sum + tier.subscribers, 0),
    totalNetDistributable: roundCurrency(tiers.reduce((sum, tier) => sum + tier.totalNetDistributable, 0))
  };
}
