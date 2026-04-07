declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  toBeCloseTo: (expected: number, precision?: number) => void;
};

import { generateProforma } from "@/lib/proforma";

const splits = [
  { partnerId: "wade", name: "Wade Kerzie", percentage: 50 },
  { partnerId: "gavin", name: "Gavin Matthews", percentage: 30 },
  { partnerId: "hunter", name: "Hunter Pinnell", percentage: 20 }
];

describe("generateProforma", () => {
  it("builds a 12-month Zorli subscriber model and finds breakeven", () => {
    const result = generateProforma({
      businessUnitId: "zorli-id",
      scenarioName: "Zorli Base",
      startMonth: new Date("2026-05-01T00:00:00Z"),
      assumptions: {
        startingSubscribers: 100,
        monthlyGrowthRate: 5,
        churnRate: 5,
        monthlyPrice: 7.99,
        appleFeePercentage: 0.15,
        avgQueriesPerUserPerMonth: 10,
        llmCostPerQuery: 0.02,
        marketingSpendMonthly: 0,
        partnerSplits: splits,
        opsTaskAllocated: 100,
        marketingFundPercentage: 10,
        operatingReservePercentage: 12
      }
    });

    expect(result.businessUnit.type).toBe("zorli");
    expect(result.months).toHaveLength(12);
    expect(result.months[0]?.subscriberCount).toBe(100);
    expect(result.months[0]?.grossRevenue).toBeCloseTo(799, 2);
    expect(result.breakeven.monthIndex).toBe(1);
    expect(result.totals.partnerPayouts).toHaveLength(3);
  });

  it("projects GotaGuy jobs and payout growth over 12 months", () => {
    const result = generateProforma({
      businessUnitId: "gota-id",
      scenarioName: "Gota Scale",
      startMonth: new Date("2026-05-01T00:00:00Z"),
      assumptions: {
        startingJobsPerMonth: 50,
        monthlyGrowthRate: 10,
        platformFeePerJob: 25,
        avgJobValue: 400,
        twilioSmsPerJob: 8,
        claudeCallsPerJob: 3,
        partnerSplits: splits.slice(0, 2),
        opsTaskAllocated: 50,
        marketingFundPercentage: 10,
        operatingReservePercentage: 12
      }
    });

    expect(result.businessUnit.type).toBe("gotaguuy");
    expect(result.months[0]?.jobCount).toBe(50);
    expect((result.months[11]?.jobCount ?? 0) > 50).toBe(true);
    expect((result.months[11]?.distributablePool ?? 0) > (result.months[0]?.distributablePool ?? 0)).toBe(true);
  });

  it("keeps Silver Moon payouts tied to Kerzie's commission share", () => {
    const result = generateProforma({
      businessUnitId: "silver-id",
      scenarioName: "Gerry Scenario",
      startMonth: new Date("2026-05-01T00:00:00Z"),
      assumptions: {
        startingMonthlyAttributedSales: 6250,
        monthlyGrowthRate: 0,
        avgTransactionValue: 1250,
        transactionsPerMonth: 5,
        kerzieCommissionRate: 0.15,
        partnerSplits: [],
        opsTaskAllocated: 0,
        marketingFundPercentage: 0,
        operatingReservePercentage: 0
      }
    });

    expect(result.businessUnit.type).toBe("silver_moon");
    expect(result.months[0]?.transactionCount).toBe(5);
    expect(result.months[0]?.partnerPayouts).toHaveLength(2);
    expect((result.months[0]?.distributablePool ?? 0) > 0).toBe(true);
  });

  it("models Unison recurring subscriptions with scout commission drag", () => {
    const result = generateProforma({
      businessUnitId: "unison-id",
      scenarioName: "Unison Base",
      startMonth: new Date("2026-05-01T00:00:00Z"),
      assumptions: {
        startingActiveSubscriptions: 20,
        monthlyNewSubscriptions: 5,
        monthlyChurn: 5,
        monthlySubscriptionValue: 500,
        scoutCommissionRate: 10,
        partnerSplits: splits.slice(0, 2),
        opsTaskAllocated: 100,
        marketingFundPercentage: 10,
        operatingReservePercentage: 12
      }
    });

    expect(result.businessUnit.type).toBe("unison");
    expect(result.months[0]?.activeSubscriptionCount).toBe(20);
    expect(result.months[0]?.variableCosts).toBeCloseTo(1000, 2);
    expect((result.months[11]?.activeSubscriptionCount ?? 0) > 20).toBe(true);
  });
});
