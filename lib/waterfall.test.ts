declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeNull: () => void;
  toHaveLength: (expected: number) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
};

import {
  calculateGotaGuyEconomics,
  calculateOpsTaskAllocation,
  calculateScoutPayoutDate,
  calculateSilverMoonEconomics,
  calculateWaterfall,
  calculateZorliUnitEconomics
} from "@/lib/waterfall";

describe("calculateWaterfall", () => {
  it("applies the full waterfall in the requested order and splits the final pool", () => {
    const result = calculateWaterfall({
      grossRevenue: 1000,
      platformFeePercentage: 0.029,
      platformFeeFlat: 0.3,
      variableCosts: 50,
      opsTaskActual: 100,
      marketingFundPercentage: 0.1,
      operatingReservePercentage: 0.12,
      marketingContributionsApplied: 25,
      partnerSplits: [
        { partnerId: "wade", name: "Wade", percentage: 0.6 },
        { partnerId: "gavin", name: "Gavin", percentage: 0.4 }
      ]
    });

    expect(result.grossRevenue).toBe(1000);
    expect(result.platformFees).toBe(29.3);
    expect(result.netAfterPlatform).toBe(970.7);
    expect(result.variableCosts).toBe(50);
    expect(result.netAfterVariable).toBe(920.7);
    expect(result.opsTaskAllocated).toBe(100);
    expect(result.opsTaxAllocated).toBe(100);
    expect(result.netAfterOpsTax).toBe(820.7);
    expect(result.marketingFund).toBe(82.07);
    expect(result.netAfterMarketing).toBe(738.63);
    expect(result.operatingReserve).toBe(88.64);
    expect(result.netAfterReserve).toBe(649.99);
    expect(result.marketingContributionsApplied).toBe(25);
    expect(result.distributablePool).toBe(674.99);
    expect(result.partnerPayouts).toEqual([
      { partnerId: "wade", name: "Wade", percentage: 0.6, amount: 404.99 },
      { partnerId: "gavin", name: "Gavin", percentage: 0.4, amount: 270 }
    ]);
    expect(result.waterfallSteps).toEqual([
      { label: "Gross Revenue", amount: 1000, runningTotal: 1000 },
      { label: "Platform Fees", amount: -29.3, runningTotal: 970.7 },
      { label: "Variable Costs", amount: -50, runningTotal: 920.7 },
      { label: "Ops Task Allocation", amount: -100, runningTotal: 820.7 },
      { label: "Marketing Fund", amount: -82.07, runningTotal: 738.63 },
      { label: "Operating Reserve", amount: -88.64, runningTotal: 649.99 },
      { label: "Marketing Contributions Applied", amount: 25, runningTotal: 674.99 },
      { label: "Distributable Pool", amount: 674.99, runningTotal: 674.99 }
    ]);
  });

  it("returns zeroed distributions when the unit has no revenue", () => {
    const result = calculateWaterfall({
      grossRevenue: 0,
      platformFeePercentage: 0.15,
      platformFeeFlat: 0,
      variableCosts: 0,
      opsTaskActual: 0,
      partnerSplits: [{ partnerId: "solo", name: "Solo", percentage: 1 }]
    });

    expect(result.distributablePool).toBe(0);
    expect(result.marketingFund).toBe(0);
    expect(result.operatingReserve).toBe(0);
    expect(result.partnerPayouts).toEqual([
      { partnerId: "solo", name: "Solo", percentage: 1, amount: 0 }
    ]);
  });

  it("supports the legacy revenueEvents and expenses payload so older dashboard code stays valid", () => {
    const result = calculateWaterfall({
      revenueEvents: [
        { grossAmount: 100, platformFeePercentage: 15 },
        { grossAmount: 50, platformFeeAmount: 2.5 }
      ],
      expenses: [
        { amount: 10, category: "variable" },
        { amount: 5, category: "ops_tax" }
      ],
      marketingFundPercentage: 10,
      operatingReservePercentage: 12,
      marketingContributionsApplied: 3,
      partnerSplits: [{ partnerId: "legacy", name: "Legacy", percentage: 100 }]
    });

    expect(result.grossRevenue).toBe(150);
    expect(result.platformFees).toBe(17.5);
    expect(result.variableCosts).toBe(10);
    expect(result.opsTaskAllocated).toBe(5);
    expect(result.distributablePool).toBe(96.06);
    expect(result.partnerPayouts).toEqual([
      { partnerId: "legacy", name: "Legacy", percentage: 100, amount: 96.06 }
    ]);
  });

  it("reconciles a fully allocated split table across many partners", () => {
    const result = calculateWaterfall({
      grossRevenue: 100,
      platformFeePercentage: 0,
      platformFeeFlat: 0,
      variableCosts: 0,
      opsTaskActual: 0,
      marketingFundPercentage: 0,
      operatingReservePercentage: 0,
      partnerSplits: Array.from({ length: 10 }, (_, index) => ({
        partnerId: `p${index + 1}`,
        name: `Partner ${index + 1}`,
        percentage: 10
      }))
    });

    expect(result.partnerPayouts).toHaveLength(10);
    expect(result.partnerPayouts.every((payout) => payout.amount === 10)).toBe(true);
    expect(result.partnerPayouts.reduce((sum, payout) => sum + payout.amount, 0)).toBe(100);
  });
});

describe("calculateScoutPayoutDate", () => {
  it("always returns the 15th of the following month", () => {
    expect(calculateScoutPayoutDate(new Date("2026-04-03T12:00:00Z")).toISOString().slice(0, 10)).toBe("2026-05-15");
    expect(calculateScoutPayoutDate(new Date("2026-04-30T23:59:59Z")).toISOString().slice(0, 10)).toBe("2026-05-15");
    expect(calculateScoutPayoutDate(new Date("2026-12-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});

describe("calculateOpsTaskAllocation", () => {
  it("allocates shared monthly costs based on revenue weight", () => {
    expect(calculateOpsTaskAllocation(1000, 3, 2500, 10000)).toBe(250);
  });

  it("returns zero for pre-launch units with no revenue", () => {
    expect(calculateOpsTaskAllocation(1000, 6, 0, 10000)).toBe(0);
    expect(calculateOpsTaskAllocation(1000, 6, 500, 0)).toBe(0);
  });
});

describe("calculateZorliUnitEconomics", () => {
  it("models a single subscriber cleanly", () => {
    const result = calculateZorliUnitEconomics({
      subscriberCount: 1,
      avgQueriesPerUserPerMonth: 100,
      opsTaskAllocated: 1,
      marketingFundPercentage: 0.1,
      operatingReservePercentage: 0.12,
      marketingContributionsApplied: 0,
      partnerSplits: [{ partnerId: "wade", name: "Wade", percentage: 1 }]
    });

    expect(result.grossRevenue).toBe(7.99);
    expect(result.appleFees).toBe(1.2);
    expect(result.netAfterApple).toBe(6.79);
    expect(result.llmCosts).toBe(2);
    expect(result.netAfterLLM).toBe(4.79);
    expect(result.opsTaskAllocated).toBe(1);
    expect(result.marketingFund).toBe(0.38);
    expect(result.operatingReserve).toBe(0.41);
    expect(result.distributablePool).toBe(3);
    expect(result.perSubscriberNetToPool).toBe(3);
    expect(result.partnerPayouts).toEqual([
      {
        partnerId: "wade",
        name: "Wade",
        percentage: 1,
        amountTotal: 3,
        amountPerSubscriber: 3
      }
    ]);
  });

  it("returns a zero pool for a pre-launch Zorli scenario with no subscribers", () => {
    const result = calculateZorliUnitEconomics({
      subscriberCount: 0,
      avgQueriesPerUserPerMonth: 100,
      opsTaskAllocated: 25,
      partnerSplits: [{ partnerId: "wade", name: "Wade", percentage: 1 }]
    });

    expect(result.grossRevenue).toBe(0);
    expect(result.distributablePool).toBe(-25);
    expect(result.perSubscriberNetToPool).toBe(0);
    expect(result.partnerPayouts[0]?.amountTotal).toBe(0);
  });
});

describe("calculateSilverMoonEconomics", () => {
  it("calculates the layered Kerzie, Wade, and Gavin splits and optional per-unit view", () => {
    const result = calculateSilverMoonEconomics({
      grossAttributedSales: 1000,
      transactionCount: 4,
      unitPrice: 50
    });

    expect(result.grossAttributedSales).toBe(1000);
    expect(result.stripeFees).toBe(30.2);
    expect(result.netAfterStripe).toBe(969.8);
    expect(result.kerzieGross).toBe(145.47);
    expect(result.wadeNet).toBe(98.92);
    expect(result.gavinNet).toBe(24.73);
    expect(result.perGeneratorEconomics).toEqual({
      unitPrice: 50,
      estimatedAttributedUnitCount: 20,
      stripeFeesPerUnit: 1.51,
      netAfterStripePerUnit: 48.49,
      kerzieGrossPerUnit: 7.27,
      wadeNetPerUnit: 4.95,
      gavinNetPerUnit: 1.24
    });
  });

  it("returns null per-unit economics when no unit price is supplied", () => {
    const result = calculateSilverMoonEconomics({
      grossAttributedSales: 250,
      transactionCount: 1
    });

    expect(result.perGeneratorEconomics).toBeNull();
  });
});

describe("calculateGotaGuyEconomics", () => {
  it("captures GotaGuy platform margin after Twilio, Claude, ops, and reserves", () => {
    const result = calculateGotaGuyEconomics({
      jobCount: 10,
      avgJobValue: 150,
      twilioSmsCount: 100,
      claudeApiCalls: 20,
      opsTaskAllocated: 50,
      marketingFundPercentage: 0.1,
      operatingReservePercentage: 0.12,
      partnerSplits: [
        { partnerId: "wade", name: "Wade", percentage: 70 },
        { partnerId: "gavin", name: "Gavin", percentage: 30 }
      ]
    });

    expect(result.grossRevenue).toBe(250);
    expect(result.variableCosts).toEqual({
      twilio: 0.79,
      claude: 0.3,
      total: 1.09
    });
    expect(result.netAfterVariable).toBe(248.91);
    expect(result.marketingFund).toBe(19.89);
    expect(result.operatingReserve).toBe(21.48);
    expect(result.distributablePool).toBe(157.54);
    expect(result.partnerPayouts).toEqual([
      { partnerId: "wade", name: "Wade", percentage: 70, amount: 110.28 },
      { partnerId: "gavin", name: "Gavin", percentage: 30, amount: 47.26 }
    ]);
    expect(result.perJobEconomics).toEqual({
      grossRevenuePerJob: 25,
      twilioPerJob: 0.08,
      claudePerJob: 0.03,
      variableCostsPerJob: 0.11,
      distributablePoolPerJob: 15.75
    });
  });

  it("returns zeros when there are no completed jobs yet", () => {
    const result = calculateGotaGuyEconomics({
      jobCount: 0,
      avgJobValue: 125,
      twilioSmsCount: 0,
      claudeApiCalls: 0,
      opsTaskAllocated: 0,
      partnerSplits: [{ partnerId: "wade", name: "Wade", percentage: 1 }]
    });

    expect(result.grossRevenue).toBe(0);
    expect(result.variableCosts.total).toBe(0);
    expect(result.distributablePool).toBe(0);
    expect(result.perJobEconomics).toEqual({
      grossRevenuePerJob: 0,
      twilioPerJob: 0,
      claudePerJob: 0,
      variableCostsPerJob: 0,
      distributablePoolPerJob: 0
    });
  });
});
