import Stripe from "stripe";

import { roundCurrency } from "@/lib/utils";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";
const STRIPE_FEE_PERCENTAGE = 2.9;
const STRIPE_FEE_FLAT = 0.3;

export function getStripeClient() {
  const apiKey = process.env.STRIPE_API_KEY;

  if (!apiKey) {
    throw new Error("STRIPE_API_KEY is not configured.");
  }

  return new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION
  });
}

export function getSilverMoonStripeAccountId() {
  const accountId = process.env.STRIPE_SILVER_MOON_ACCOUNT_ID;

  if (!accountId) {
    throw new Error("STRIPE_SILVER_MOON_ACCOUNT_ID is not configured.");
  }

  return accountId;
}

export function getSilverMoonStripeRequestOptions(): Stripe.RequestOptions {
  return {
    stripeAccount: getSilverMoonStripeAccountId()
  };
}

export function calculateStripeFeeAmount(grossAmount: number) {
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    return 0;
  }

  return roundCurrency(grossAmount * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FEE_FLAT);
}

export function calculateStripeFeePercentage(grossAmount: number, feeAmount: number) {
  if (!Number.isFinite(grossAmount) || grossAmount <= 0 || !Number.isFinite(feeAmount) || feeAmount <= 0) {
    return 0;
  }

  return Math.round((feeAmount / grossAmount) * 100 * 10000) / 10000;
}

function getCreatedTimestamp(days: number) {
  const safeDays = Math.max(0, Math.trunc(days));

  return Math.floor(Date.now() / 1000) - safeDays * 24 * 60 * 60;
}

/**
 * Lists recent successful Silver Moon charges from the connected Stripe account so Kerzie Ops
 * can backfill or reconcile revenue attribution if a webhook was missed.
 */
export async function listRecentSilverMoonCharges(days = 30) {
  const stripe = getStripeClient();
  const requestOptions = getSilverMoonStripeRequestOptions();
  const charges: Stripe.Charge[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripe.charges.list(
      {
        limit: 100,
        created: {
          gte: getCreatedTimestamp(days)
        },
        expand: ["data.balance_transaction"],
        starting_after: startingAfter
      },
      requestOptions
    );

    charges.push(...response.data);

    if (!response.has_more || response.data.length === 0) {
      break;
    }

    startingAfter = response.data[response.data.length - 1]?.id;
  }

  return charges;
}

/**
 * Pulls recent balance transactions for the Silver Moon connected account. This is used for
 * reconciliation work when Gerry's Stripe ledger needs to be matched against Kerzie Ops.
 */
export async function listSilverMoonBalanceTransactions(days = 30) {
  const stripe = getStripeClient();
  const requestOptions = getSilverMoonStripeRequestOptions();
  const transactions: Stripe.BalanceTransaction[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const response = await stripe.balanceTransactions.list(
      {
        limit: 100,
        created: {
          gte: getCreatedTimestamp(days)
        },
        starting_after: startingAfter
      },
      requestOptions
    );

    transactions.push(...response.data);

    if (!response.has_more || response.data.length === 0) {
      break;
    }

    startingAfter = response.data[response.data.length - 1]?.id;
  }

  return transactions;
}
