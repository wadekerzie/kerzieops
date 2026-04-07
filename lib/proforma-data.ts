import { unstable_noStore as noStore } from "next/cache";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { BusinessUnit, Partner, PartnerSplit, ProformaScenario, StakeholderAccessToken, WaterfallConfig, MonthlySnapshot } from "@/types";
import type { PartnerSplitInput } from "@/lib/waterfall";
import type {
  GotaGuyProformaAssumptions,
  ProformaAssumptions,
  ProformaInput,
  ProformaResult,
  ProformaBusinessUnitType,
  SilverMoonProformaAssumptions,
  UnisonProformaAssumptions,
  ZorliProformaAssumptions
} from "@/lib/proforma";
import { generateProforma } from "@/lib/proforma";

const SUPPORTED_SLUGS = ["zorli", "gotaguuy", "silver_moon", "unison"] as const;

export interface ProformaShareTokenOption {
  id: string;
  token: string;
  partnerName: string;
}

export interface ProformaUnitContext {
  id: string;
  name: string;
  slug: (typeof SUPPORTED_SLUGS)[number];
  type: ProformaBusinessUnitType;
  partnerSplits: PartnerSplitInput[];
  opsTaskAllocated: number;
  marketingFundPercentage: number;
  operatingReservePercentage: number;
  defaultAssumptions: ProformaAssumptions;
  shareTokens: ProformaShareTokenOption[];
}

export interface SavedProformaScenario {
  id: string;
  businessUnitId: string;
  businessUnitSlug: ProformaUnitContext["slug"];
  scenarioName: string;
  startMonth: string;
  assumptions: ProformaAssumptions;
  result: ProformaResult;
}

export interface ProformaWorkspaceData {
  currentMonthLabel: string;
  units: ProformaUnitContext[];
  savedScenarios: SavedProformaScenario[];
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

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function getUnitType(slug: ProformaUnitContext["slug"]): ProformaBusinessUnitType {
  if (slug === "zorli") return "zorli";
  if (slug === "gotaguuy") return "gotaguuy";
  if (slug === "silver_moon") return "silver_moon";

  return "unison";
}

function activeSplitsForUnit(
  splits: PartnerSplit[],
  unitId: string,
  asOfDate: string,
  partners: Partner[]
) {
  return splits
    .filter((split) => {
      return (
        split.business_unit_id === unitId &&
        split.effective_date <= asOfDate &&
        (split.end_date === null || split.end_date >= asOfDate)
      );
    })
    .sort((left, right) => Number(right.percentage) - Number(left.percentage))
    .map((split) => ({
      partnerId: split.partner_id,
      name: partners.find((partner) => partner.id === split.partner_id)?.name ?? "Unknown partner",
      percentage: Number(split.percentage)
    }));
}

function pickConfigValue(configs: WaterfallConfig[], unitId: string, key: string, fallbackValue: number) {
  const unitConfig = [...configs]
    .filter((config) => config.business_unit_id === unitId && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (typeof unitConfig?.config_value === "number") {
    return Number(unitConfig.config_value);
  }

  const globalConfig = [...configs]
    .filter((config) => config.business_unit_id === null && config.config_key === key)
    .sort((left, right) => right.effective_date.localeCompare(left.effective_date))[0];

  if (typeof globalConfig?.config_value === "number") {
    return Number(globalConfig.config_value);
  }

  return fallbackValue;
}

function buildDefaultAssumptions(unit: BusinessUnit, partnerSplits: PartnerSplitInput[], snapshots: MonthlySnapshot[]): ProformaAssumptions {
  const latestSnapshot = [...snapshots]
    .filter((snapshot) => snapshot.business_unit_id === unit.id)
    .sort((left, right) => right.snapshot_month.localeCompare(left.snapshot_month))[0];
  const opsTaskAllocated = Number(latestSnapshot?.ops_tax_allocated ?? 0);

  if (unit.slug === "zorli") {
    return {
      startingSubscribers: 100,
      monthlyGrowthRate: 5,
      churnRate: 5,
      monthlyPrice: 7.99,
      appleFeePercentage: 0.15,
      avgQueriesPerUserPerMonth: 10,
      llmCostPerQuery: 0.02,
      marketingSpendMonthly: 0,
      hunterMarketingContribution: 0,
      partnerSplits,
      opsTaskAllocated,
      marketingFundPercentage: 10,
      operatingReservePercentage: 12
    } satisfies ZorliProformaAssumptions;
  }

  if (unit.slug === "gotaguuy") {
    return {
      startingJobsPerMonth: 50,
      monthlyGrowthRate: 5,
      platformFeePerJob: 25,
      avgJobValue: 400,
      twilioSmsPerJob: 8,
      claudeCallsPerJob: 3,
      partnerSplits,
      opsTaskAllocated,
      marketingFundPercentage: 10,
      operatingReservePercentage: 12
    } satisfies GotaGuyProformaAssumptions;
  }

  if (unit.slug === "silver_moon") {
    return {
      startingMonthlyAttributedSales: 1250 * 5,
      monthlyGrowthRate: 5,
      avgTransactionValue: 1250,
      transactionsPerMonth: 5,
      kerzieCommissionRate: 0.15,
      partnerSplits,
      opsTaskAllocated: 0,
      marketingFundPercentage: 0,
      operatingReservePercentage: 0
    } satisfies SilverMoonProformaAssumptions;
  }

  return {
    startingActiveSubscriptions: 25,
    monthlyNewSubscriptions: 3,
    monthlyChurn: 5,
    monthlySubscriptionValue: 500,
    scoutCommissionRate: 10,
    partnerSplits,
    opsTaskAllocated,
    marketingFundPercentage: 10,
    operatingReservePercentage: 12
  } satisfies UnisonProformaAssumptions;
}

export async function getProformaWorkspaceData(): Promise<ProformaWorkspaceData> {
  noStore();

  const supabase = ensureSupabase();
  const currentMonthStart = getMonthStart();
  const asOfDate = toDateString(currentMonthStart);
  const [
    businessUnitsResult,
    partnersResult,
    partnerSplitsResult,
    configsResult,
    snapshotsResult,
    scenariosResult,
    tokensResult
  ] = await Promise.all([
    supabase.from("business_units").select("*").in("slug", [...SUPPORTED_SLUGS]).eq("is_active", true),
    supabase.from("partners").select("*").eq("is_active", true),
    supabase.from("partner_splits").select("*"),
    supabase.from("waterfall_config").select("*"),
    supabase.from("monthly_snapshots").select("*").limit(500),
    supabase.from("proforma_scenarios").select("*").limit(500),
    supabase.from("stakeholder_access_tokens").select("*").eq("is_active", true).limit(200)
  ]);

  if (businessUnitsResult.error) throw new Error(businessUnitsResult.error.message);
  if (partnersResult.error) throw new Error(partnersResult.error.message);
  if (partnerSplitsResult.error) throw new Error(partnerSplitsResult.error.message);
  if (configsResult.error) throw new Error(configsResult.error.message);
  if (snapshotsResult.error) throw new Error(snapshotsResult.error.message);
  if (scenariosResult.error) throw new Error(scenariosResult.error.message);
  if (tokensResult.error) throw new Error(tokensResult.error.message);

  const businessUnits = (businessUnitsResult.data ?? []) as BusinessUnit[];
  const partners = (partnersResult.data ?? []) as Partner[];
  const partnerSplits = (partnerSplitsResult.data ?? []) as PartnerSplit[];
  const configs = (configsResult.data ?? []) as WaterfallConfig[];
  const snapshots = (snapshotsResult.data ?? []) as MonthlySnapshot[];
  const scenarios = (scenariosResult.data ?? []) as ProformaScenario[];
  const tokens = (tokensResult.data ?? []) as StakeholderAccessToken[];

  const units = businessUnits
    .slice()
    .sort((left, right) => SUPPORTED_SLUGS.indexOf(left.slug as (typeof SUPPORTED_SLUGS)[number]) - SUPPORTED_SLUGS.indexOf(right.slug as (typeof SUPPORTED_SLUGS)[number]))
    .map((unit) => {
      const activePartnerSplits = activeSplitsForUnit(partnerSplits, unit.id, asOfDate, partners);
      const unitTokens = tokens
        .filter((token) => token.business_unit_ids.includes(unit.id))
        .map((token) => ({
          id: token.id,
          token: token.token,
          partnerName: partners.find((partner) => partner.id === token.partner_id)?.name ?? "Unknown partner"
        }))
        .sort((left, right) => left.partnerName.localeCompare(right.partnerName));

      return {
        id: unit.id,
        name: unit.name,
        slug: unit.slug as ProformaUnitContext["slug"],
        type: getUnitType(unit.slug as ProformaUnitContext["slug"]),
        partnerSplits: activePartnerSplits,
        opsTaskAllocated: Number(
          [...snapshots]
            .filter((snapshot) => snapshot.business_unit_id === unit.id)
            .sort((left, right) => right.snapshot_month.localeCompare(left.snapshot_month))[0]?.ops_tax_allocated ?? 0
        ),
        marketingFundPercentage: pickConfigValue(configs, unit.id, "marketing_fund_percentage", 10),
        operatingReservePercentage: pickConfigValue(configs, unit.id, "operating_reserve_percentage", 12),
        defaultAssumptions: buildDefaultAssumptions(unit, activePartnerSplits, snapshots),
        shareTokens: unitTokens
      } satisfies ProformaUnitContext;
    });

  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const savedScenarios: SavedProformaScenario[] = [];

  for (const scenario of scenarios) {
    const unit = unitById.get(scenario.business_unit_id);

    if (!unit) {
      continue;
    }

    const payload = scenario.assumptions as {
      startMonth?: string;
      assumptions?: ProformaAssumptions;
    };
    const assumptions = payload.assumptions ?? unit.defaultAssumptions;
    const startMonth = payload.startMonth ?? currentMonthStart.toISOString();

    savedScenarios.push({
      id: scenario.id,
      businessUnitId: scenario.business_unit_id,
      businessUnitSlug: unit.slug,
      scenarioName: scenario.scenario_name,
      startMonth,
      assumptions,
      result: generateProforma({
        businessUnitId: unit.id,
        scenarioName: scenario.scenario_name,
        startMonth: new Date(startMonth),
        assumptions
      })
    });
  }

  savedScenarios.sort((left, right) => left.scenarioName.localeCompare(right.scenarioName));

  return {
    currentMonthLabel: formatMonthLabel(currentMonthStart),
    units,
    savedScenarios
  };
}

export async function getSavedProformaScenarioById(scenarioId: string) {
  const data = await getProformaWorkspaceData();

  return data.savedScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}
