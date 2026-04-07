import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";

import { recalculateMonthlySnapshotForUnit } from "@/lib/finance-data";
import {
  calculateStripeFeeAmount,
  calculateStripeFeePercentage,
  getSilverMoonStripeAccountId,
  getSilverMoonStripeRequestOptions,
  getStripeClient,
  listRecentSilverMoonCharges
} from "@/lib/stripe";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import { roundCurrency } from "@/lib/utils";
import type {
  BusinessUnit,
  Json,
  RevenueEvent,
  RevenueEventInsert,
  SilverMoonExistingCustomer,
  SilverMoonExistingCustomerInsert,
  StripeWebhookEvent,
  StripeWebhookEventInsert,
  WaterfallConfig
} from "@/types";

const SILVER_MOON_SLUG = "silver_moon";
const DEFAULT_SILVER_MOON_COMMISSION_RATE = 15;
const SILVER_MOON_AGREEMENT_NOTE =
  "Existing customer repurchases excluded. New customer definition: email not present in existing_customers table at time of engagement.";

export interface SilverMoonPaymentRecord {
  amount: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  paymentId: string;
  timestamp: string;
  metadata: Record<string, string>;
  description: string | null;
}

export interface ProcessSilverMoonPaymentResult {
  status: "processed" | "ignored";
  revenueEventId: string | null;
  snapshotMonth: string | null;
  attributed: boolean;
  reason: string;
}

export interface SilverMoonWebhookStatusData {
  lastWebhookReceivedAt: string | null;
  totalWebhooksReceived: number;
  failedWebhookCount: number;
  failedEvents: Array<{
    id: string;
    stripeEventId: string;
    eventType: string;
    paymentId: string | null;
    receivedAt: string;
    lastError: string | null;
  }>;
}

export interface SilverMoonOperationsData {
  existingCustomersCount: number;
  existingCustomersPreview: Array<{
    id: string;
    email: string;
    name: string | null;
    firstPurchaseDate: string;
    notes: string | null;
  }>;
  webhookStatus: SilverMoonWebhookStatusData;
  agreement: {
    commissionRate: number;
    effectiveDate: string;
    notes: string;
  };
}

function ensureSupabase() {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase service-role client is not configured.");
  }

  return supabase;
}

function toDateString(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function normalizeMetadata(metadata: Stripe.Metadata | null | undefined) {
  return Object.fromEntries(Object.entries(metadata ?? {}).map(([key, value]) => [key, value ?? ""]));
}

async function getSilverMoonBusinessUnit() {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("business_units")
    .select("id, name, slug, description, is_active, created_at, updated_at")
    .eq("slug", SILVER_MOON_SLUG)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Silver Moon business unit is not configured in Supabase.");
  }

  return data as BusinessUnit;
}

async function getSilverMoonConfig(unitId: string, configKey: string) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("waterfall_config")
    .select("*")
    .eq("business_unit_id", unitId)
    .eq("config_key", configKey)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WaterfallConfig | null) ?? null;
}

async function findRevenueEventByPaymentId(paymentId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("revenue_events")
    .select("id, business_unit_id, transaction_date, is_attributed")
    .eq("stripe_payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Pick<RevenueEvent, "id" | "business_unit_id" | "transaction_date" | "is_attributed"> | null) ?? null;
}

async function findExistingCustomer(email: string | null) {
  if (!email) {
    return null;
  }

  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("silver_moon_existing_customers")
    .select("id, email, name, first_purchase_date, notes, created_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SilverMoonExistingCustomer | null) ?? null;
}

async function createRevenueEvent(input: RevenueEventInsert) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("revenue_events")
    .insert(input as never)
    .select("id, business_unit_id, transaction_date, is_attributed")
    .single<Pick<RevenueEvent, "id" | "business_unit_id" | "transaction_date" | "is_attributed">>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function upsertWebhookEventRecord(log: {
  stripeEventId: string;
  stripeAccountId: string | null;
  eventType: string;
  paymentId: string | null;
  source: "webhook" | "sync" | "retry";
  status: "received" | "processed" | "failed" | "ignored";
  payload: Record<string, unknown>;
  processedAt?: string | null;
  lastError?: string | null;
}) {
  const supabase = ensureSupabase();
  const insert: StripeWebhookEventInsert = {
    stripe_event_id: log.stripeEventId,
    stripe_account_id: log.stripeAccountId,
    event_type: log.eventType,
    payment_id: log.paymentId,
    source: log.source,
    status: log.status,
    processed_at: log.processedAt ?? null,
    last_error: log.lastError ?? null,
    payload: log.payload as Json
  };
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .upsert(insert as never, { onConflict: "stripe_event_id" })
    .select("id, stripe_event_id, stripe_account_id, event_type, payment_id, source, status, received_at, processed_at, last_error, payload, created_at, updated_at")
    .single<StripeWebhookEvent>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function extractChargePaymentId(charge: Stripe.Charge) {
  if (typeof charge.payment_intent === "string" && charge.payment_intent.length > 0) {
    return charge.payment_intent;
  }

  if (charge.payment_intent && typeof charge.payment_intent === "object" && "id" in charge.payment_intent) {
    return charge.payment_intent.id;
  }

  return charge.id;
}

async function hydratePaymentIntentContact(paymentIntent: Stripe.PaymentIntent) {
  const stripe = getStripeClient();

  if (!paymentIntent.latest_charge) {
    return {
      customerEmail: normalizeEmail(paymentIntent.receipt_email),
      customerName: paymentIntent.shipping?.name ?? null,
      description: null
    };
  }

  const charge =
    typeof paymentIntent.latest_charge === "string"
      ? await stripe.charges.retrieve(paymentIntent.latest_charge, getSilverMoonStripeRequestOptions())
      : paymentIntent.latest_charge;

  return {
    customerEmail: normalizeEmail(charge.billing_details.email) ?? normalizeEmail(paymentIntent.receipt_email),
    customerName: charge.billing_details.name ?? paymentIntent.shipping?.name ?? null,
    description: charge.description ?? null
  };
}

/**
 * Normalizes Stripe webhook objects into one payment record shape so Silver Moon attribution
 * can treat webhooks and manual syncs with the same downstream processing path.
 */
export async function extractSilverMoonPaymentFromEvent(event: Stripe.Event) {
  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;

    return {
      amount: roundCurrency(charge.amount / 100),
      currency: charge.currency,
      customerEmail: normalizeEmail(charge.billing_details.email),
      customerName: charge.billing_details.name ?? null,
      paymentId: extractChargePaymentId(charge),
      timestamp: new Date(charge.created * 1000).toISOString(),
      metadata: normalizeMetadata(charge.metadata),
      description: charge.description ?? null
    } satisfies SilverMoonPaymentRecord;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return null;
    }

    const paymentId =
      typeof session.payment_intent === "string" && session.payment_intent.length > 0
        ? session.payment_intent
        : session.payment_intent && typeof session.payment_intent === "object" && "id" in session.payment_intent
          ? session.payment_intent.id
          : session.id;

    return {
      amount: roundCurrency((session.amount_total ?? 0) / 100),
      currency: session.currency ?? "usd",
      customerEmail: normalizeEmail(session.customer_details?.email) ?? normalizeEmail(session.customer_email),
      customerName: session.customer_details?.name ?? null,
      paymentId,
      timestamp: new Date(session.created * 1000).toISOString(),
      metadata: normalizeMetadata(session.metadata),
      description: null
    } satisfies SilverMoonPaymentRecord;
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const contact = await hydratePaymentIntentContact(paymentIntent);

    return {
      amount: roundCurrency((paymentIntent.amount_received || paymentIntent.amount) / 100),
      currency: paymentIntent.currency,
      customerEmail: contact.customerEmail,
      customerName: contact.customerName,
      paymentId: paymentIntent.id,
      timestamp: new Date(paymentIntent.created * 1000).toISOString(),
      metadata: normalizeMetadata(paymentIntent.metadata),
      description: contact.description
    } satisfies SilverMoonPaymentRecord;
  }

  return null;
}

export function buildSilverMoonPaymentFromCharge(charge: Stripe.Charge) {
  return {
    amount: roundCurrency(charge.amount / 100),
    currency: charge.currency,
    customerEmail: normalizeEmail(charge.billing_details.email),
    customerName: charge.billing_details.name ?? null,
    paymentId: extractChargePaymentId(charge),
    timestamp: new Date(charge.created * 1000).toISOString(),
    metadata: normalizeMetadata(charge.metadata),
    description: charge.description ?? null
  } satisfies SilverMoonPaymentRecord;
}

/**
 * Persists one Silver Moon payment into `revenue_events`, classifying it as attributed or
 * non-attributed by checking the engagement-time customer snapshot before recalculating the
 * affected month-end waterfall snapshot.
 */
export async function processSilverMoonPaymentRecord(
  payment: SilverMoonPaymentRecord
): Promise<ProcessSilverMoonPaymentResult> {
  if (!payment.paymentId) {
    return {
      status: "ignored",
      revenueEventId: null,
      snapshotMonth: null,
      attributed: false,
      reason: "No canonical Stripe payment identifier was available."
    };
  }

  const existingEvent = await findRevenueEventByPaymentId(payment.paymentId);

  if (existingEvent) {
    return {
      status: "ignored",
      revenueEventId: existingEvent.id,
      snapshotMonth: existingEvent.transaction_date.slice(0, 7),
      attributed: existingEvent.is_attributed,
      reason: "Revenue event already exists for this Stripe payment."
    };
  }

  const unit = await getSilverMoonBusinessUnit();
  const normalizedEmail = normalizeEmail(payment.customerEmail);
  const existingCustomer = await findExistingCustomer(normalizedEmail);
  const feeAmount = calculateStripeFeeAmount(payment.amount);
  const feePercentage = calculateStripeFeePercentage(payment.amount, feeAmount);
  const transactionDate = toDateString(new Date(payment.timestamp));
  const attributionLabel = existingCustomer ? "existing customer repurchase" : "Kerzie-attributed new sale";
  const customerLabel = payment.customerName || normalizedEmail || "Unknown customer";
  const description =
    payment.description ??
    `Silver Moon Stripe payment from ${customerLabel} (${attributionLabel})`;
  let revenueEvent: Pick<RevenueEvent, "id" | "business_unit_id" | "transaction_date" | "is_attributed">;

  try {
    revenueEvent = await createRevenueEvent({
      business_unit_id: unit.id,
      source: "stripe",
      revenue_type: "one_time",
      gross_amount: payment.amount,
      platform_fee_percentage: feePercentage,
      transaction_date: transactionDate,
      description,
      payment_method: "stripe",
      customer_name: customerLabel,
      stripe_payment_id: payment.paymentId,
      invoice_number: null,
      notes: null,
      is_attributed: !existingCustomer,
      is_setup_fee: false,
      is_pending_agreement: false,
      review_status: "unreviewed",
      review_notes: null
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("duplicate")) {
      const duplicateEvent = await findRevenueEventByPaymentId(payment.paymentId);

      if (duplicateEvent) {
        return {
          status: "ignored",
          revenueEventId: duplicateEvent.id,
          snapshotMonth: duplicateEvent.transaction_date.slice(0, 7),
          attributed: duplicateEvent.is_attributed,
          reason: "Revenue event already exists for this Stripe payment."
        };
      }
    }

    throw error;
  }

  await recalculateMonthlySnapshotForUnit(unit.id, transactionDate);

  return {
    status: "processed",
    revenueEventId: revenueEvent.id,
    snapshotMonth: transactionDate.slice(0, 7),
    attributed: !existingCustomer,
    reason: existingCustomer ? "Logged as existing customer repurchase." : "Logged as attributed new sale."
  };
}

/**
 * Records and processes a verified Stripe event for Silver Moon. Duplicate or unsupported
 * events are safely marked ignored so Stripe retries do not create double-counted revenue.
 */
export async function processSilverMoonStripeEvent(
  event: Stripe.Event,
  source: "webhook" | "retry" = "webhook"
) {
  const stripeAccountId = event.account ?? getSilverMoonStripeAccountId();
  const payment = await extractSilverMoonPaymentFromEvent(event);
  const paymentId = payment?.paymentId ?? null;

  await upsertWebhookEventRecord({
    stripeEventId: event.id,
    stripeAccountId,
    eventType: event.type,
    paymentId,
    source,
    status: "received",
    payload: event as unknown as Record<string, unknown>
  });

  if (!payment) {
    const ignored = {
      status: "ignored" as const,
      revenueEventId: null,
      snapshotMonth: null,
      attributed: false,
      reason: `Event type ${event.type} did not contain a paid Silver Moon transaction.`
    };

    await upsertWebhookEventRecord({
      stripeEventId: event.id,
      stripeAccountId,
      eventType: event.type,
      paymentId,
      source,
      status: "ignored",
      payload: event as unknown as Record<string, unknown>,
      processedAt: new Date().toISOString(),
      lastError: ignored.reason
    });

    return ignored;
  }

  try {
    const result = await processSilverMoonPaymentRecord(payment);

    await upsertWebhookEventRecord({
      stripeEventId: event.id,
      stripeAccountId,
      eventType: event.type,
      paymentId,
      source,
      status: result.status === "processed" ? "processed" : "ignored",
      payload: event as unknown as Record<string, unknown>,
      processedAt: new Date().toISOString(),
      lastError: result.status === "ignored" ? result.reason : null
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Silver Moon webhook processing error.";

    await upsertWebhookEventRecord({
      stripeEventId: event.id,
      stripeAccountId,
      eventType: event.type,
      paymentId,
      source,
      status: "failed",
      payload: event as unknown as Record<string, unknown>,
      processedAt: new Date().toISOString(),
      lastError: message
    });

    throw error;
  }
}

/**
 * Replays one failed Stripe webhook event from the stored operational log so Wade can resolve
 * temporary database or network issues without waiting for a new customer charge.
 */
export async function retrySilverMoonWebhookEvent(webhookEventId: string) {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("id, stripe_event_id, stripe_account_id, event_type, payment_id, source, status, received_at, processed_at, last_error, payload, created_at, updated_at")
    .eq("id", webhookEventId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Stripe webhook log entry not found.");
  }

  const webhookEvent = data as StripeWebhookEvent;

  if (typeof webhookEvent.payload !== "object" || webhookEvent.payload === null) {
    throw new Error("Stored webhook payload is not replayable.");
  }

  return processSilverMoonStripeEvent(webhookEvent.payload as unknown as Stripe.Event, "webhook");
}

/**
 * Pulls the last N days of successful Silver Moon Stripe charges and reconciles them against
 * existing `revenue_events`, creating any missing rows to backfill webhook gaps.
 */
export async function syncSilverMoonTransactions(days = 30) {
  const charges = await listRecentSilverMoonCharges(days);
  const stripeAccountId = getSilverMoonStripeAccountId();
  const results: Array<ProcessSilverMoonPaymentResult & { paymentId: string }> = [];

  for (const charge of charges) {
    if (!charge.paid || charge.status !== "succeeded") {
      continue;
    }

    const payment = buildSilverMoonPaymentFromCharge(charge);
    const syntheticEventId = `sync:${payment.paymentId}`;

    try {
      const result = await processSilverMoonPaymentRecord(payment);

      await upsertWebhookEventRecord({
        stripeEventId: syntheticEventId,
        stripeAccountId,
        eventType: "sync.charge",
        paymentId: payment.paymentId,
        source: "sync",
        status: result.status === "processed" ? "processed" : "ignored",
        payload: { chargeId: charge.id, paymentId: payment.paymentId, created: charge.created },
        processedAt: new Date().toISOString(),
        lastError: result.status === "ignored" ? result.reason : null
      });

      results.push({
        ...result,
        paymentId: payment.paymentId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Silver Moon sync error.";

      await upsertWebhookEventRecord({
        stripeEventId: syntheticEventId,
        stripeAccountId,
        eventType: "sync.charge",
        paymentId: payment.paymentId,
        source: "sync",
        status: "failed",
        payload: { chargeId: charge.id, paymentId: payment.paymentId, created: charge.created },
        processedAt: new Date().toISOString(),
        lastError: message
      });
    }
  }

  return {
    syncedCount: results.filter((result) => result.status === "processed").length,
    skippedCount: results.filter((result) => result.status === "ignored").length,
    results
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
}

function resolveCsvValue(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

/**
 * Parses Gerry's exported Silver Moon customer CSV into normalized rows that can be seeded
 * into the existing-customer exclusion table.
 */
export function parseSilverMoonExistingCustomersCsv(csvText: string) {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const email = normalizeEmail(resolveCsvValue(record, ["email", "customer_email"]));
      const firstPurchaseDate = resolveCsvValue(record, [
        "first_purchase_date",
        "first purchase date",
        "purchase_date",
        "created",
        "created_at"
      ]);

      if (!email || !firstPurchaseDate) {
        return null;
      }

      return {
        email,
        name: resolveCsvValue(record, ["name", "customer_name"]) || null,
        first_purchase_date: firstPurchaseDate.slice(0, 10),
        notes: resolveCsvValue(record, ["notes", "note"]) || null
      } satisfies SilverMoonExistingCustomerInsert;
    })
    .filter((record): record is SilverMoonExistingCustomerInsert => Boolean(record));
}

export async function upsertSilverMoonExistingCustomers(entries: SilverMoonExistingCustomerInsert[]) {
  const supabase = ensureSupabase();
  const normalizedEntries = entries.map((entry) => ({
    email: normalizeEmail(entry.email) ?? entry.email,
    name: entry.name ?? null,
    first_purchase_date: entry.first_purchase_date,
    notes: entry.notes ?? null
  }));

  if (normalizedEntries.length === 0) {
    return {
      insertedCount: 0
    };
  }

  const { error } = await supabase.from("silver_moon_existing_customers").upsert(
    normalizedEntries as never,
    { onConflict: "email" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    insertedCount: normalizedEntries.length
  };
}

export async function getSilverMoonOperationsData(): Promise<SilverMoonOperationsData> {
  noStore();

  const supabase = ensureSupabase();
  const unit = await getSilverMoonBusinessUnit();
  const [
    countResult,
    previewResult,
    lastWebhookResult,
    totalWebhookResult,
    failedWebhookResult,
    failedEventsResult,
    commissionRateConfig,
    agreementDateConfig
  ] = await Promise.all([
    supabase.from("silver_moon_existing_customers").select("id", { count: "exact", head: true }),
    supabase
      .from("silver_moon_existing_customers")
      .select("id, email, name, first_purchase_date, notes, created_at")
      .order("first_purchase_date", { ascending: false })
      .limit(8),
    supabase
      .from("stripe_webhook_events")
      .select("received_at")
      .eq("source", "webhook")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("stripe_webhook_events").select("id", { count: "exact", head: true }).eq("source", "webhook"),
    supabase
      .from("stripe_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("source", "webhook")
      .eq("status", "failed"),
    supabase
      .from("stripe_webhook_events")
      .select("id, stripe_event_id, event_type, payment_id, received_at, last_error")
      .eq("source", "webhook")
      .eq("status", "failed")
      .order("received_at", { ascending: false })
      .limit(10),
    getSilverMoonConfig(unit.id, "silver_moon_commission_rate"),
    getSilverMoonConfig(unit.id, "silver_moon_agreement_effective_date")
  ]);

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  if (previewResult.error) {
    throw new Error(previewResult.error.message);
  }

  if (lastWebhookResult.error) {
    throw new Error(lastWebhookResult.error.message);
  }

  if (totalWebhookResult.error) {
    throw new Error(totalWebhookResult.error.message);
  }

  if (failedWebhookResult.error) {
    throw new Error(failedWebhookResult.error.message);
  }

  if (failedEventsResult.error) {
    throw new Error(failedEventsResult.error.message);
  }

  return {
    existingCustomersCount: countResult.count ?? 0,
    existingCustomersPreview: ((previewResult.data ?? []) as SilverMoonExistingCustomer[]).map((customer) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      firstPurchaseDate: customer.first_purchase_date,
      notes: customer.notes
    })),
    webhookStatus: {
      lastWebhookReceivedAt: (lastWebhookResult.data as { received_at: string } | null)?.received_at ?? null,
      totalWebhooksReceived: totalWebhookResult.count ?? 0,
      failedWebhookCount: failedWebhookResult.count ?? 0,
      failedEvents: ((failedEventsResult.data ?? []) as Array<Pick<StripeWebhookEvent, "id" | "stripe_event_id" | "event_type" | "payment_id" | "received_at" | "last_error">>).map((event) => ({
        id: event.id,
        stripeEventId: event.stripe_event_id,
        eventType: event.event_type,
        paymentId: event.payment_id,
        receivedAt: event.received_at,
        lastError: event.last_error
      }))
    },
    agreement: {
      commissionRate: Number(commissionRateConfig?.config_value ?? DEFAULT_SILVER_MOON_COMMISSION_RATE),
      effectiveDate: agreementDateConfig?.effective_date ?? toDateString(new Date()),
      notes: agreementDateConfig?.notes ?? SILVER_MOON_AGREEMENT_NOTE
    }
  };
}
