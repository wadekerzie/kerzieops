import { roundCurrency } from "@/lib/utils";

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
