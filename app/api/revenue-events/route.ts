import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recalculateMonthlySnapshotForUnit } from "@/lib/dashboard-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { RevenueEventInsert } from "@/types";

const payloadSchema = z.object({
  businessUnitId: z.string().uuid(),
  source: z.enum(["stripe", "ach", "check", "manual"]),
  grossAmount: z.coerce.number().min(0),
  transactionDate: z.string().min(1),
  description: z.string().min(1),
  stripePaymentId: z.string().optional().or(z.literal("")),
  isAttributed: z.boolean().optional()
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const revenueEventInsert: RevenueEventInsert = {
    business_unit_id: payload.businessUnitId,
    source: payload.source,
    gross_amount: payload.grossAmount,
    platform_fee_percentage: 0,
    transaction_date: payload.transactionDate,
    description: payload.description,
    stripe_payment_id: payload.stripePaymentId || null,
    is_attributed: payload.isAttributed ?? false
  };

  const { data: insertedEvent, error } = await supabase
    .from("revenue_events")
    .insert(revenueEventInsert as never)
    .select("id, business_unit_id, transaction_date")
    .single<{ id: string; business_unit_id: string; transaction_date: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const snapshotResult = await recalculateMonthlySnapshotForUnit(payload.businessUnitId, payload.transactionDate);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/proforma");

  if (snapshotResult.businessUnitSlug === "zorli") revalidatePath("/dashboard/zorli");
  if (snapshotResult.businessUnitSlug === "gotaguuy") revalidatePath("/dashboard/gotaguuy");
  if (snapshotResult.businessUnitSlug === "unison") revalidatePath("/dashboard/unison");
  if (snapshotResult.businessUnitSlug === "silver_moon") revalidatePath("/dashboard/silver-moon");
  if (snapshotResult.businessUnitSlug === "silver_naturals") revalidatePath("/dashboard/silver-naturals");

  return NextResponse.json({
    ok: true,
    revenueEventId: insertedEvent?.id ?? null,
    snapshot: snapshotResult
  });
}
