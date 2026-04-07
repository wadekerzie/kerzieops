import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertMonthUnlocked,
  buildManualRevenueInsert,
  calculateMonthlySnapshotFromBase,
  fetchFinanceBaseData,
  getSilverNaturalsAgreementStatus,
  recalculateMonthlySnapshotForUnit
} from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  businessUnitId: z.string().uuid(),
  source: z.enum(["stripe", "ach", "check", "manual"]),
  revenueType: z.enum(["recurring", "one_time", "setup_fee", "commission"]),
  grossAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["ach", "check", "stripe", "cash"]).nullable().optional(),
  transactionDate: z.string().min(1),
  customerName: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  invoiceNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  stripePaymentId: z.string().optional().or(z.literal("")),
  isAttributed: z.boolean().optional(),
  isSetupFee: z.boolean().optional(),
  adminOverride: z.boolean().optional()
});

function payoutAmountByName(rows: Array<{ name: string; amount: number }>) {
  return {
    wade: rows.find((row) => row.name === "Wade Kerzie")?.amount ?? 0,
    gavin: rows.find((row) => row.name === "Gavin Matthews")?.amount ?? 0
  };
}

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);

  try {
    await assertMonthUnlocked(payload.transactionDate, payload.adminOverride ?? false);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "This month is locked." },
      { status: 400 }
    );
  }

  const baseData = await fetchFinanceBaseData();
  const beforeSnapshot = calculateMonthlySnapshotFromBase(baseData, payload.businessUnitId, payload.transactionDate);
  const silverNaturalsAgreement = await getSilverNaturalsAgreementStatus();
  const isPendingAgreement =
    payload.businessUnitId === silverNaturalsAgreement.businessUnitId && !silverNaturalsAgreement.finalized;
  const revenueEventInsert = buildManualRevenueInsert({
    businessUnitId: payload.businessUnitId,
    source: payload.source,
    revenueType: payload.revenueType,
    grossAmount: payload.grossAmount,
    paymentMethod: payload.paymentMethod ?? null,
    transactionDate: payload.transactionDate,
    customerName: payload.customerName,
    description: payload.description,
    invoiceNumber: payload.invoiceNumber,
    notes: payload.notes,
    stripePaymentId: payload.stripePaymentId,
    isAttributed: payload.isAttributed,
    isSetupFee: payload.isSetupFee || payload.revenueType === "setup_fee",
    isPendingAgreement
  });

  const { data: insertedEvent, error } = await supabase
    .from("revenue_events")
    .insert(revenueEventInsert as never)
    .select("id, business_unit_id, transaction_date")
    .single<{ id: string; business_unit_id: string; transaction_date: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const snapshotResult = await recalculateMonthlySnapshotForUnit(payload.businessUnitId, payload.transactionDate);
  const beforeByName = payoutAmountByName(beforeSnapshot.partnerPayouts);
  const afterByName = payoutAmountByName(snapshotResult.partnerPayouts);
  const payoutDelta = snapshotResult.agreementPending
    ? {
        wade: null,
        gavin: null
      }
    : {
        wade: Number((afterByName.wade - beforeByName.wade).toFixed(2)),
        gavin: Number((afterByName.gavin - beforeByName.gavin).toFixed(2))
      };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/proforma");
  revalidatePath("/dashboard/revenue/new");
  revalidatePath("/dashboard/close");
  revalidatePath("/dashboard/settings");

  if (snapshotResult.businessUnitSlug === "zorli") revalidatePath("/dashboard/zorli");
  if (snapshotResult.businessUnitSlug === "gotaguuy") revalidatePath("/dashboard/gotaguuy");
  if (snapshotResult.businessUnitSlug === "unison") revalidatePath("/dashboard/unison");
  if (snapshotResult.businessUnitSlug === "silver_moon") revalidatePath("/dashboard/silver-moon");
  if (snapshotResult.businessUnitSlug === "silver_naturals") revalidatePath("/dashboard/silver-naturals");

  return NextResponse.json({
    ok: true,
    revenueEventId: insertedEvent?.id ?? null,
    snapshot: snapshotResult,
    payoutDelta,
    confirmation:
      snapshotResult.agreementPending || payoutDelta.wade === null || payoutDelta.gavin === null
        ? "Revenue saved. Silver Naturals payouts remain suspended until the agreement percentage is finalized."
        : `This revenue generates $${payoutDelta.wade.toFixed(2)} for Wade and $${payoutDelta.gavin.toFixed(2)} for Gavin.`
  });
}
