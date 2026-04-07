const DEFAULT_MARKETING_FUND_PERCENTAGE = 0.1;
const DEFAULT_OPERATING_RESERVE_PERCENTAGE = 0.12;
const DEFAULT_ZORLI_MONTHLY_PRICE = 7.99;
const DEFAULT_ZORLI_APPLE_FEE_PERCENTAGE = 0.15;
const DEFAULT_ZORLI_LLM_COST_PER_QUERY = 0.02;
const DEFAULT_SILVER_MOON_STRIPE_FEE_PERCENTAGE = 0.029;
const DEFAULT_SILVER_MOON_STRIPE_FEE_FLAT = 0.3;
const DEFAULT_SILVER_MOON_KERZIE_PERCENTAGE = 0.15;
const DEFAULT_SILVER_MOON_WADE_PERCENTAGE = 0.85;
const DEFAULT_SILVER_MOON_GAVIN_PERCENTAGE = 0.2;
const DEFAULT_GOTA_GUY_PLATFORM_FEE_PER_JOB = 25;
const DEFAULT_GOTA_GUY_TWILIO_COST_PER_SMS = 0.0079;
const DEFAULT_GOTA_GUY_CLAUDE_COST_PER_CALL = 0.015;

type Cents = bigint;

export interface PartnerSplitInput {
  partnerId: string;
  name: string;
  percentage: number;
}

export interface WaterfallStep {
  label: string;
  amount: number;
  runningTotal: number;
}

export interface PartnerPayout {
  partnerId: string;
  name: string;
  percentage: number;
  amount: number;
}

export interface WaterfallInput {
  grossRevenue: number;
  platformFeePercentage: number;
  platformFeeFlat: number;
  variableCosts: number;
  opsTaskActual: number;
  marketingFundPercentage?: number;
  operatingReservePercentage?: number;
  marketingContributionsApplied?: number;
  partnerSplits: PartnerSplitInput[];
}

export interface WaterfallResult {
  grossRevenue: number;
  platformFees: number;
  netAfterPlatform: number;
  variableCosts: number;
  netAfterVariable: number;
  opsTaskAllocated: number;
  opsTaxAllocated: number;
  netAfterOpsTax: number;
  marketingFund: number;
  netAfterMarketing: number;
  operatingReserve: number;
  netAfterReserve: number;
  marketingContributionsApplied: number;
  distributablePool: number;
  partnerPayouts: PartnerPayout[];
  waterfallSteps: WaterfallStep[];
}

export interface WaterfallRevenueLineItem {
  grossAmount: number;
  platformFeePercentage?: number;
  platformFeeAmount?: number;
}

export interface WaterfallExpenseLineItem {
  amount: number;
  category: "ops_tax" | "marketing" | "reserve" | "variable" | "capital" | "one_time";
}

/**
 * Legacy request payload retained so older Prompt 3 dashboard code can keep calling
 * `calculateWaterfall` without any follow-up edits.
 */
export interface WaterfallCalculationInput {
  revenueEvents: WaterfallRevenueLineItem[];
  expenses: WaterfallExpenseLineItem[];
  marketingFundPercentage: number;
  operatingReservePercentage: number;
  marketingContributionsApplied?: number;
  opsTaxMethod?: "actual";
  partnerSplits?: PartnerSplitInput[];
}

export type WaterfallCalculationResult = WaterfallResult;

export interface ZorliUnitInput {
  subscriberCount: number;
  monthlyPrice?: number;
  appleFeePercentage?: number;
  avgQueriesPerUserPerMonth: number;
  llmCostPerQuery?: number;
  opsTaskAllocated: number;
  marketingFundPercentage?: number;
  operatingReservePercentage?: number;
  partnerSplits: PartnerSplitInput[];
  marketingContributionsApplied?: number;
}

export interface ZorliPartnerPayout {
  partnerId: string;
  name: string;
  percentage: number;
  amountTotal: number;
  amountPerSubscriber: number;
}

export interface ZorliUnitResult {
  grossRevenue: number;
  appleFees: number;
  netAfterApple: number;
  llmCosts: number;
  netAfterLLM: number;
  opsTaskAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  marketingContributionsApplied: number;
  distributablePool: number;
  perSubscriberNetToPool: number;
  partnerPayouts: ZorliPartnerPayout[];
}

export interface SilverMoonInput {
  grossAttributedSales: number;
  stripeFeePercentage?: number;
  stripeFeeFlat?: number;
  transactionCount: number;
  kerziePercentage?: number;
  wadePercentage?: number;
  gavinPercentage?: number;
  unitPrice?: number;
}

export interface SilverMoonPerGeneratorEconomics {
  unitPrice: number;
  estimatedAttributedUnitCount: number;
  stripeFeesPerUnit: number;
  netAfterStripePerUnit: number;
  kerzieGrossPerUnit: number;
  wadeNetPerUnit: number;
  gavinNetPerUnit: number;
}

export interface SilverMoonResult {
  grossAttributedSales: number;
  stripeFees: number;
  netAfterStripe: number;
  kerzieGross: number;
  wadeNet: number;
  gavinNet: number;
  perGeneratorEconomics: SilverMoonPerGeneratorEconomics | null;
}

export interface GotaGuyInput {
  jobCount: number;
  platformFeePerJob?: number;
  avgJobValue: number;
  twilioSmsCount: number;
  twilioCostPerSms?: number;
  claudeApiCalls: number;
  claudeCostPerCall?: number;
  opsTaskAllocated: number;
  marketingFundPercentage?: number;
  operatingReservePercentage?: number;
  partnerSplits: PartnerSplitInput[];
}

export interface GotaGuyVariableCosts {
  twilio: number;
  claude: number;
  total: number;
}

export interface GotaGuyPartnerPayout {
  partnerId: string;
  name: string;
  percentage: number;
  amount: number;
}

export interface GotaGuyPerJobEconomics {
  grossRevenuePerJob: number;
  twilioPerJob: number;
  claudePerJob: number;
  variableCostsPerJob: number;
  distributablePoolPerJob: number;
}

export interface GotaGuyResult {
  grossRevenue: number;
  variableCosts: GotaGuyVariableCosts;
  netAfterVariable: number;
  opsTaskAllocated: number;
  marketingFund: number;
  operatingReserve: number;
  distributablePool: number;
  partnerPayouts: GotaGuyPartnerPayout[];
  perJobEconomics: GotaGuyPerJobEconomics;
}

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

interface PartnerAllocationCents {
  partnerId: string;
  name: string;
  percentage: number;
  amountCents: Cents;
}

interface WaterfallCalculationCentsInput {
  grossRevenueCents: Cents;
  platformFeesCents: Cents;
  variableCostsCents: Cents;
  opsTaskAllocatedCents: Cents;
  marketingFundRate: Fraction;
  operatingReserveRate: Fraction;
  marketingContributionsAppliedCents: Cents;
  partnerSplits: PartnerSplitInput[];
}

interface WaterfallCalculationCentsResult {
  grossRevenueCents: Cents;
  platformFeesCents: Cents;
  netAfterPlatformCents: Cents;
  variableCostsCents: Cents;
  netAfterVariableCents: Cents;
  opsTaskAllocatedCents: Cents;
  netAfterOpsTaxCents: Cents;
  marketingFundCents: Cents;
  netAfterMarketingCents: Cents;
  operatingReserveCents: Cents;
  netAfterReserveCents: Cents;
  marketingContributionsAppliedCents: Cents;
  distributablePoolCents: Cents;
  partnerPayouts: PartnerAllocationCents[];
  waterfallSteps: Array<{ label: string; amountCents: Cents; runningTotalCents: Cents }>;
}

function parseDecimal(value: number, label: string): Fraction {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  const negative = value < 0;
  const raw = negative ? -value : value;
  const rawString = Number.isInteger(raw)
    ? raw.toString()
    : raw.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  const [wholePart, fractionalPart = ""] = rawString.split(".");
  const digits = `${wholePart}${fractionalPart}`.replace(/^0+(?=\d)/, "") || "0";
  const denominator = 10n ** BigInt(fractionalPart.length);
  const numerator = BigInt(digits) * (negative ? -1n : 1n);

  return { numerator, denominator };
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error("Cannot divide by zero.");
  }

  const negative = (numerator < 0n) !== (denominator < 0n);
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const rounded = (absoluteNumerator + absoluteDenominator / 2n) / absoluteDenominator;

  return negative ? -rounded : rounded;
}

function toCents(amount: number, label: string): Cents {
  const fraction = parseDecimal(amount, label);

  return roundDivide(fraction.numerator * 100n, fraction.denominator);
}

function centsToNumber(amount: Cents): number {
  return Number(amount) / 100;
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  return {
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator
  };
}

function normalizeRate(value: number | undefined, fallback: number, label: string): Fraction {
  const candidate = value ?? fallback;

  if (!Number.isFinite(candidate) || candidate < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }

  const fraction = parseDecimal(candidate, label);

  if (candidate === 1) {
    return fraction;
  }

  if (candidate > 1) {
    return {
      numerator: fraction.numerator,
      denominator: fraction.denominator * 100n
    };
  }

  return fraction;
}

function multiplyCentsByRate(amountCents: Cents, rate: Fraction): Cents {
  return roundDivide(amountCents * rate.numerator, rate.denominator);
}

function multiplyDollarValuesToCents(values: Array<{ value: number; label: string }>): Cents {
  let numerator = 1n;
  let denominator = 1n;

  for (const { value, label } of values) {
    const fraction = parseDecimal(value, label);
    numerator *= fraction.numerator;
    denominator *= fraction.denominator;
  }

  return roundDivide(numerator * 100n, denominator);
}

function maxCents(left: Cents, right: Cents): Cents {
  return left > right ? left : right;
}

function divideCents(amountCents: Cents, divisor: number, label: string): Cents {
  if (!Number.isFinite(divisor) || divisor <= 0) {
    return 0n;
  }

  const divisorFraction = parseDecimal(divisor, label);

  return roundDivide(amountCents * divisorFraction.denominator, divisorFraction.numerator);
}

function buildPartnerPayouts(distributablePoolCents: Cents, partnerSplits: PartnerSplitInput[]): PartnerAllocationCents[] {
  const payoutBase = maxCents(distributablePoolCents, 0n);

  if (partnerSplits.length === 0 || payoutBase === 0n) {
    return partnerSplits.map((split) => ({
      partnerId: split.partnerId,
      name: split.name,
      percentage: split.percentage,
      amountCents: 0n
    }));
  }

  const normalizedRates = partnerSplits.map((split) => normalizeRate(split.percentage, 0, `${split.name} split percentage`));
  const totalRate = normalizedRates.reduce<Fraction>(
    (sum, current) => addFractions(sum, current),
    { numerator: 0n, denominator: 1n }
  );
  const shouldReconcileToPool = totalRate.numerator === totalRate.denominator;

  if (!shouldReconcileToPool) {
    return partnerSplits.map((split, index) => ({
      partnerId: split.partnerId,
      name: split.name,
      percentage: split.percentage,
      amountCents: multiplyCentsByRate(payoutBase, normalizedRates[index])
    }));
  }

  const preliminary = partnerSplits.map((split, index) => {
    const rate = normalizedRates[index];
    const rawNumerator = payoutBase * rate.numerator;
    const floorAmount = rawNumerator / rate.denominator;
    const remainder = rawNumerator % rate.denominator;

    return {
      partnerId: split.partnerId,
      name: split.name,
      percentage: split.percentage,
      amountCents: floorAmount,
      remainder,
      denominator: rate.denominator
    };
  });

  const allocated = preliminary.reduce<Cents>((sum, split) => sum + split.amountCents, 0n);
  let remainderToDistribute = payoutBase - allocated;
  const byLargestRemainder = [...preliminary].sort((left, right) => {
    const leftScore = left.remainder * right.denominator;
    const rightScore = right.remainder * left.denominator;

    if (leftScore === rightScore) {
      return 0;
    }

    return leftScore > rightScore ? -1 : 1;
  });

  for (let index = 0; index < byLargestRemainder.length && remainderToDistribute > 0n; index += 1) {
    byLargestRemainder[index].amountCents += 1n;
    remainderToDistribute -= 1n;
  }

  const finalized = new Map(
    byLargestRemainder.map((split) => [
      split.partnerId,
      {
        partnerId: split.partnerId,
        name: split.name,
        percentage: split.percentage,
        amountCents: split.amountCents
      }
    ])
  );

  return partnerSplits.map((split) => {
    const match = finalized.get(split.partnerId);

    if (!match) {
      throw new Error(`Missing payout allocation for partner ${split.partnerId}.`);
    }

    return match;
  });
}

function buildWaterfallSteps(result: WaterfallCalculationCentsResult): Array<{ label: string; amountCents: Cents; runningTotalCents: Cents }> {
  return [
    {
      label: "Gross Revenue",
      amountCents: result.grossRevenueCents,
      runningTotalCents: result.grossRevenueCents
    },
    {
      label: "Platform Fees",
      amountCents: -result.platformFeesCents,
      runningTotalCents: result.netAfterPlatformCents
    },
    {
      label: "Variable Costs",
      amountCents: -result.variableCostsCents,
      runningTotalCents: result.netAfterVariableCents
    },
    {
      label: "Ops Task Allocation",
      amountCents: -result.opsTaskAllocatedCents,
      runningTotalCents: result.netAfterOpsTaxCents
    },
    {
      label: "Marketing Fund",
      amountCents: -result.marketingFundCents,
      runningTotalCents: result.netAfterMarketingCents
    },
    {
      label: "Operating Reserve",
      amountCents: -result.operatingReserveCents,
      runningTotalCents: result.netAfterReserveCents
    },
    {
      label: "Marketing Contributions Applied",
      amountCents: result.marketingContributionsAppliedCents,
      runningTotalCents: result.distributablePoolCents
    },
    {
      label: "Distributable Pool",
      amountCents: result.distributablePoolCents,
      runningTotalCents: result.distributablePoolCents
    }
  ];
}

function calculateWaterfallCents(input: WaterfallCalculationCentsInput): WaterfallCalculationCentsResult {
  const netAfterPlatformCents = input.grossRevenueCents - input.platformFeesCents;
  const netAfterVariableCents = netAfterPlatformCents - input.variableCostsCents;
  const netAfterOpsTaxCents = netAfterVariableCents - input.opsTaskAllocatedCents;
  const marketingFundCents = multiplyCentsByRate(maxCents(netAfterOpsTaxCents, 0n), input.marketingFundRate);
  const netAfterMarketingCents = netAfterOpsTaxCents - marketingFundCents;
  const operatingReserveCents = multiplyCentsByRate(maxCents(netAfterMarketingCents, 0n), input.operatingReserveRate);
  const netAfterReserveCents = netAfterMarketingCents - operatingReserveCents;
  const distributablePoolCents = netAfterReserveCents + input.marketingContributionsAppliedCents;
  const partnerPayouts = buildPartnerPayouts(distributablePoolCents, input.partnerSplits);
  const partialResult = {
    grossRevenueCents: input.grossRevenueCents,
    platformFeesCents: input.platformFeesCents,
    netAfterPlatformCents,
    variableCostsCents: input.variableCostsCents,
    netAfterVariableCents,
    opsTaskAllocatedCents: input.opsTaskAllocatedCents,
    netAfterOpsTaxCents,
    marketingFundCents,
    netAfterMarketingCents,
    operatingReserveCents,
    netAfterReserveCents,
    marketingContributionsAppliedCents: input.marketingContributionsAppliedCents,
    distributablePoolCents,
    partnerPayouts
  };

  return {
    ...partialResult,
    waterfallSteps: buildWaterfallSteps({
      ...partialResult,
      waterfallSteps: []
    })
  };
}

function isLegacyWaterfallInput(input: WaterfallInput | WaterfallCalculationInput): input is WaterfallCalculationInput {
  return "revenueEvents" in input;
}

function mapWaterfallInputToCents(input: WaterfallInput | WaterfallCalculationInput): WaterfallCalculationCentsInput {
  if (isLegacyWaterfallInput(input)) {
    const grossRevenueCents = input.revenueEvents.reduce((sum, event) => sum + toCents(event.grossAmount, "Revenue gross amount"), 0n);
    const platformFeesCents = input.revenueEvents.reduce((sum, event) => {
      if (typeof event.platformFeeAmount === "number") {
        return sum + toCents(event.platformFeeAmount, "Platform fee amount");
      }

      return sum + multiplyCentsByRate(toCents(event.grossAmount, "Revenue gross amount"), normalizeRate(event.platformFeePercentage, 0, "Platform fee percentage"));
    }, 0n);
    const variableCostsCents = input.expenses
      .filter((expense) => expense.category === "variable")
      .reduce((sum, expense) => sum + toCents(expense.amount, "Variable expense amount"), 0n);
    const opsTaskAllocatedCents = input.expenses
      .filter((expense) => expense.category === "ops_tax")
      .reduce((sum, expense) => sum + toCents(expense.amount, "Ops tax amount"), 0n);

    return {
      grossRevenueCents,
      platformFeesCents,
      variableCostsCents,
      opsTaskAllocatedCents,
      marketingFundRate: normalizeRate(
        input.marketingFundPercentage,
        DEFAULT_MARKETING_FUND_PERCENTAGE,
        "Marketing fund percentage"
      ),
      operatingReserveRate: normalizeRate(
        input.operatingReservePercentage,
        DEFAULT_OPERATING_RESERVE_PERCENTAGE,
        "Operating reserve percentage"
      ),
      marketingContributionsAppliedCents: toCents(
        input.marketingContributionsApplied ?? 0,
        "Marketing contributions applied"
      ),
      partnerSplits: input.partnerSplits ?? []
    };
  }

  const grossRevenueCents = toCents(input.grossRevenue, "Gross revenue");
  const platformFeePercentage = normalizeRate(input.platformFeePercentage, 0, "Platform fee percentage");
  const platformFeesCents =
    multiplyCentsByRate(grossRevenueCents, platformFeePercentage) + toCents(input.platformFeeFlat, "Platform flat fee");

  return {
    grossRevenueCents,
    platformFeesCents,
    variableCostsCents: toCents(input.variableCosts, "Variable costs"),
    opsTaskAllocatedCents: toCents(input.opsTaskActual, "Ops task allocation"),
    marketingFundRate: normalizeRate(
      input.marketingFundPercentage,
      DEFAULT_MARKETING_FUND_PERCENTAGE,
      "Marketing fund percentage"
    ),
    operatingReserveRate: normalizeRate(
      input.operatingReservePercentage,
      DEFAULT_OPERATING_RESERVE_PERCENTAGE,
      "Operating reserve percentage"
    ),
    marketingContributionsAppliedCents: toCents(
      input.marketingContributionsApplied ?? 0,
      "Marketing contributions applied"
    ),
    partnerSplits: input.partnerSplits
  };
}

/**
 * Applies Kerzie's standard financial waterfall to a business unit.
 *
 * Business logic:
 * 1. Remove platform fees from gross revenue.
 * 2. Remove direct variable costs tied to serving that revenue.
 * 3. Remove the unit's allocated share of recurring operations overhead.
 * 4. Sweep the remaining positive balance into marketing and reserve buckets.
 * 5. Add back any recoverable marketing contributions that should be returned before distributions.
 * 6. Split only the final positive distributable pool across partners.
 *
 * The function is intentionally pure and performs deterministic integer-based monetary math so the
 * same input always produces the same payout ledger inputs.
 */
export function calculateWaterfall(input: WaterfallInput | WaterfallCalculationInput): WaterfallResult {
  const result = calculateWaterfallCents(mapWaterfallInputToCents(input));

  return {
    grossRevenue: centsToNumber(result.grossRevenueCents),
    platformFees: centsToNumber(result.platformFeesCents),
    netAfterPlatform: centsToNumber(result.netAfterPlatformCents),
    variableCosts: centsToNumber(result.variableCostsCents),
    netAfterVariable: centsToNumber(result.netAfterVariableCents),
    opsTaskAllocated: centsToNumber(result.opsTaskAllocatedCents),
    opsTaxAllocated: centsToNumber(result.opsTaskAllocatedCents),
    netAfterOpsTax: centsToNumber(result.netAfterOpsTaxCents),
    marketingFund: centsToNumber(result.marketingFundCents),
    netAfterMarketing: centsToNumber(result.netAfterMarketingCents),
    operatingReserve: centsToNumber(result.operatingReserveCents),
    netAfterReserve: centsToNumber(result.netAfterReserveCents),
    marketingContributionsApplied: centsToNumber(result.marketingContributionsAppliedCents),
    distributablePool: centsToNumber(result.distributablePoolCents),
    partnerPayouts: result.partnerPayouts.map((payout) => ({
      partnerId: payout.partnerId,
      name: payout.name,
      percentage: payout.percentage,
      amount: centsToNumber(payout.amountCents)
    })),
    waterfallSteps: result.waterfallSteps.map((step) => ({
      label: step.label,
      amount: centsToNumber(step.amountCents),
      runningTotal: centsToNumber(step.runningTotalCents)
    }))
  };
}

/**
 * Kerzie pays scout commissions on the 15th of the month after the customer payment clears.
 * That standard delay gives bookkeeping time to confirm funds, record the source payment,
 * and pay scouts on a predictable twice-monthly rhythm.
 */
export function calculateScoutPayoutDate(customerPaymentDate: Date): Date {
  if (!(customerPaymentDate instanceof Date) || Number.isNaN(customerPaymentDate.getTime())) {
    throw new Error("customerPaymentDate must be a valid Date.");
  }

  return new Date(
    Date.UTC(customerPaymentDate.getUTCFullYear(), customerPaymentDate.getUTCMonth() + 1, 15)
  );
}

/**
 * Allocates shared monthly operating costs by revenue contribution instead of by headcount.
 * Pre-launch units intentionally receive no burden until they start generating revenue, which
 * protects new launches from being penalized before they have any traction.
 */
export function calculateOpsTaskAllocation(
  globalMonthlyCosts: number,
  activeBusinessUnits: number,
  unitRevenueWeight: number,
  totalRevenue: number
): number {
  if (
    !Number.isFinite(globalMonthlyCosts) ||
    !Number.isFinite(activeBusinessUnits) ||
    !Number.isFinite(unitRevenueWeight) ||
    !Number.isFinite(totalRevenue)
  ) {
    throw new Error("Ops task allocation inputs must be finite numbers.");
  }

  if (globalMonthlyCosts <= 0 || activeBusinessUnits <= 0 || unitRevenueWeight <= 0 || totalRevenue <= 0) {
    return 0;
  }

  const globalMonthlyCostsCents = toCents(globalMonthlyCosts, "Global monthly costs");
  const unitRevenueCents = toCents(unitRevenueWeight, "Unit revenue weight");
  const totalRevenueCents = toCents(totalRevenue, "Total revenue");
  const allocatedCents = roundDivide(globalMonthlyCostsCents * unitRevenueCents, totalRevenueCents);

  return centsToNumber(allocatedCents);
}

/**
 * Models Zorli's monthly subscription economics after Apple's store fee, AI usage, shared ops,
 * growth reinvestment, and reserve retention. This lets Kerzie understand both total pool output
 * and what each subscriber contributes to partner payouts.
 */
export function calculateZorliUnitEconomics(input: ZorliUnitInput): ZorliUnitResult {
  const subscriberCount = Number.isFinite(input.subscriberCount) ? input.subscriberCount : 0;
  const grossRevenueCents = multiplyDollarValuesToCents([
    { value: subscriberCount, label: "Subscriber count" },
    { value: input.monthlyPrice ?? DEFAULT_ZORLI_MONTHLY_PRICE, label: "Monthly price" }
  ]);
  const appleFeesCents = multiplyCentsByRate(
    grossRevenueCents,
    normalizeRate(input.appleFeePercentage, DEFAULT_ZORLI_APPLE_FEE_PERCENTAGE, "Apple fee percentage")
  );
  const llmCostsCents = multiplyDollarValuesToCents([
    { value: subscriberCount, label: "Subscriber count" },
    { value: input.avgQueriesPerUserPerMonth, label: "Average queries per user per month" },
    { value: input.llmCostPerQuery ?? DEFAULT_ZORLI_LLM_COST_PER_QUERY, label: "LLM cost per query" }
  ]);
  const waterfall = calculateWaterfallCents({
    grossRevenueCents,
    platformFeesCents: appleFeesCents,
    variableCostsCents: llmCostsCents,
    opsTaskAllocatedCents: toCents(input.opsTaskAllocated, "Ops task allocation"),
    marketingFundRate: normalizeRate(
      input.marketingFundPercentage,
      DEFAULT_MARKETING_FUND_PERCENTAGE,
      "Marketing fund percentage"
    ),
    operatingReserveRate: normalizeRate(
      input.operatingReservePercentage,
      DEFAULT_OPERATING_RESERVE_PERCENTAGE,
      "Operating reserve percentage"
    ),
    marketingContributionsAppliedCents: toCents(
      input.marketingContributionsApplied ?? 0,
      "Marketing contributions applied"
    ),
    partnerSplits: input.partnerSplits
  });

  return {
    grossRevenue: centsToNumber(grossRevenueCents),
    appleFees: centsToNumber(appleFeesCents),
    netAfterApple: centsToNumber(waterfall.netAfterPlatformCents),
    llmCosts: centsToNumber(llmCostsCents),
    netAfterLLM: centsToNumber(waterfall.netAfterVariableCents),
    opsTaskAllocated: centsToNumber(waterfall.opsTaskAllocatedCents),
    marketingFund: centsToNumber(waterfall.marketingFundCents),
    operatingReserve: centsToNumber(waterfall.operatingReserveCents),
    marketingContributionsApplied: centsToNumber(waterfall.marketingContributionsAppliedCents),
    distributablePool: centsToNumber(waterfall.distributablePoolCents),
    perSubscriberNetToPool: centsToNumber(divideCents(waterfall.distributablePoolCents, subscriberCount, "Subscriber count")),
    partnerPayouts: waterfall.partnerPayouts.map((payout) => ({
      partnerId: payout.partnerId,
      name: payout.name,
      percentage: payout.percentage,
      amountTotal: centsToNumber(payout.amountCents),
      amountPerSubscriber: centsToNumber(divideCents(payout.amountCents, subscriberCount, "Subscriber count"))
    }))
  };
}

/**
 * Calculates how attributed Silver Moon sales flow through Stripe and then into the negotiated
 * Kerzie, Wade, and Gavin participation stack. The optional per-unit view helps evaluate content
 * generator performance on a normalized basis when a sale price is known.
 */
export function calculateSilverMoonEconomics(input: SilverMoonInput): SilverMoonResult {
  const grossAttributedSalesCents = toCents(input.grossAttributedSales, "Gross attributed sales");
  const stripeFeesCents =
    multiplyCentsByRate(
      grossAttributedSalesCents,
      normalizeRate(
        input.stripeFeePercentage,
        DEFAULT_SILVER_MOON_STRIPE_FEE_PERCENTAGE,
        "Stripe fee percentage"
      )
    ) +
    multiplyDollarValuesToCents([
      { value: input.transactionCount, label: "Transaction count" },
      { value: input.stripeFeeFlat ?? DEFAULT_SILVER_MOON_STRIPE_FEE_FLAT, label: "Stripe flat fee" }
    ]);
  const netAfterStripeCents = grossAttributedSalesCents - stripeFeesCents;
  const kerzieGrossCents = multiplyCentsByRate(
    netAfterStripeCents,
    normalizeRate(
      input.kerziePercentage,
      DEFAULT_SILVER_MOON_KERZIE_PERCENTAGE,
      "Kerzie percentage"
    )
  );
  const wadeBaseCents = multiplyCentsByRate(
    kerzieGrossCents,
    normalizeRate(input.wadePercentage, DEFAULT_SILVER_MOON_WADE_PERCENTAGE, "Wade percentage")
  );
  const gavinNetCents = multiplyCentsByRate(
    wadeBaseCents,
    normalizeRate(input.gavinPercentage, DEFAULT_SILVER_MOON_GAVIN_PERCENTAGE, "Gavin percentage")
  );
  const wadeNetCents = wadeBaseCents - gavinNetCents;
  const unitPrice = input.unitPrice;
  const unitPriceCents = typeof unitPrice === "number" && unitPrice > 0 ? toCents(unitPrice, "Unit price") : 0n;

  return {
    grossAttributedSales: centsToNumber(grossAttributedSalesCents),
    stripeFees: centsToNumber(stripeFeesCents),
    netAfterStripe: centsToNumber(netAfterStripeCents),
    kerzieGross: centsToNumber(kerzieGrossCents),
    wadeNet: centsToNumber(wadeNetCents),
    gavinNet: centsToNumber(gavinNetCents),
    perGeneratorEconomics:
      unitPriceCents > 0n
        ? {
            unitPrice: centsToNumber(unitPriceCents),
            estimatedAttributedUnitCount: Number(grossAttributedSalesCents) / Number(unitPriceCents),
            stripeFeesPerUnit: centsToNumber(divideCents(stripeFeesCents, Number(grossAttributedSalesCents) / Number(unitPriceCents), "Unit count")),
            netAfterStripePerUnit: centsToNumber(
              divideCents(netAfterStripeCents, Number(grossAttributedSalesCents) / Number(unitPriceCents), "Unit count")
            ),
            kerzieGrossPerUnit: centsToNumber(
              divideCents(kerzieGrossCents, Number(grossAttributedSalesCents) / Number(unitPriceCents), "Unit count")
            ),
            wadeNetPerUnit: centsToNumber(divideCents(wadeNetCents, Number(grossAttributedSalesCents) / Number(unitPriceCents), "Unit count")),
            gavinNetPerUnit: centsToNumber(divideCents(gavinNetCents, Number(grossAttributedSalesCents) / Number(unitPriceCents), "Unit count"))
          }
        : null
  };
}

/**
 * Models GotaGuy's marketplace margin after the platform fee revenue, direct messaging/AI costs,
 * shared operations burden, and standard reinvestment/reserve sweeps. The per-job lens exposes
 * whether the platform becomes more attractive as volume grows.
 */
export function calculateGotaGuyEconomics(input: GotaGuyInput): GotaGuyResult {
  const grossRevenueCents = multiplyDollarValuesToCents([
    { value: input.jobCount, label: "Job count" },
    { value: input.platformFeePerJob ?? DEFAULT_GOTA_GUY_PLATFORM_FEE_PER_JOB, label: "Platform fee per job" }
  ]);
  const twilioCostsCents = multiplyDollarValuesToCents([
    { value: input.twilioSmsCount, label: "Twilio SMS count" },
    { value: input.twilioCostPerSms ?? DEFAULT_GOTA_GUY_TWILIO_COST_PER_SMS, label: "Twilio cost per SMS" }
  ]);
  const claudeCostsCents = multiplyDollarValuesToCents([
    { value: input.claudeApiCalls, label: "Claude API calls" },
    { value: input.claudeCostPerCall ?? DEFAULT_GOTA_GUY_CLAUDE_COST_PER_CALL, label: "Claude cost per call" }
  ]);
  const totalVariableCostsCents = twilioCostsCents + claudeCostsCents;
  const waterfall = calculateWaterfallCents({
    grossRevenueCents,
    platformFeesCents: 0n,
    variableCostsCents: totalVariableCostsCents,
    opsTaskAllocatedCents: toCents(input.opsTaskAllocated, "Ops task allocation"),
    marketingFundRate: normalizeRate(
      input.marketingFundPercentage,
      DEFAULT_MARKETING_FUND_PERCENTAGE,
      "Marketing fund percentage"
    ),
    operatingReserveRate: normalizeRate(
      input.operatingReservePercentage,
      DEFAULT_OPERATING_RESERVE_PERCENTAGE,
      "Operating reserve percentage"
    ),
    marketingContributionsAppliedCents: 0n,
    partnerSplits: input.partnerSplits
  });

  return {
    grossRevenue: centsToNumber(grossRevenueCents),
    variableCosts: {
      twilio: centsToNumber(twilioCostsCents),
      claude: centsToNumber(claudeCostsCents),
      total: centsToNumber(totalVariableCostsCents)
    },
    netAfterVariable: centsToNumber(waterfall.netAfterVariableCents),
    opsTaskAllocated: centsToNumber(waterfall.opsTaskAllocatedCents),
    marketingFund: centsToNumber(waterfall.marketingFundCents),
    operatingReserve: centsToNumber(waterfall.operatingReserveCents),
    distributablePool: centsToNumber(waterfall.distributablePoolCents),
    partnerPayouts: waterfall.partnerPayouts.map((payout) => ({
      partnerId: payout.partnerId,
      name: payout.name,
      percentage: payout.percentage,
      amount: centsToNumber(payout.amountCents)
    })),
    perJobEconomics: {
      grossRevenuePerJob: centsToNumber(divideCents(grossRevenueCents, input.jobCount, "Job count")),
      twilioPerJob: centsToNumber(divideCents(twilioCostsCents, input.jobCount, "Job count")),
      claudePerJob: centsToNumber(divideCents(claudeCostsCents, input.jobCount, "Job count")),
      variableCostsPerJob: centsToNumber(divideCents(totalVariableCostsCents, input.jobCount, "Job count")),
      distributablePoolPerJob: centsToNumber(divideCents(waterfall.distributablePoolCents, input.jobCount, "Job count"))
    }
  };
}
