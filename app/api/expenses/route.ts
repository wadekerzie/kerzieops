import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertMonthUnlocked,
  buildExpenseInsert,
  fetchFinanceBaseData,
  generateSnapshotsForMonth,
  recalculateMonthlySnapshotForUnit
} from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  businessUnitId: z.string().min(1),
  category: z.enum(["ops_tax", "marketing", "reserve", "variable", "capital", "one_time"]),
  vendor: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().min(0),
  expenseDate: z.string().min(1),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.enum(["monthly", "annual", "one_time"]).default("one_time"),
  description: z.string().min(1),
  receiptUrl: z.string().optional().or(z.literal("")),
  nextBillingDate: z.string().optional().or(z.literal("")),
  adminOverride: z.boolean().optional()
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);

  try {
    await assertMonthUnlocked(payload.expenseDate, payload.adminOverride ?? false);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "This month is locked." },
      { status: 400 }
    );
  }

  const businessUnitId = payload.businessUnitId === "global" ? null : payload.businessUnitId;
  const expenseInsert = buildExpenseInsert({
    businessUnitId,
    category: payload.category,
    amount: payload.amount,
    description: payload.description,
    vendor: payload.vendor,
    expenseDate: payload.expenseDate,
    isRecurring: payload.isRecurring,
    recurrenceInterval: payload.isRecurring ? payload.recurrenceInterval : "one_time",
    receiptUrl: payload.receiptUrl,
    nextBillingDate: payload.nextBillingDate || null
  });

  const { data, error } = await supabase.from("expenses").insert(expenseInsert as never).select("id").single<{ id: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (businessUnitId) {
    await recalculateMonthlySnapshotForUnit(businessUnitId, payload.expenseDate);
  } else {
    await generateSnapshotsForMonth(payload.expenseDate);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/close");

  const baseData = await fetchFinanceBaseData();

  for (const unit of baseData.businessUnits) {
    if (unit.slug === "zorli") revalidatePath("/dashboard/zorli");
    if (unit.slug === "gotaguuy") revalidatePath("/dashboard/gotaguuy");
    if (unit.slug === "unison") revalidatePath("/dashboard/unison");
    if (unit.slug === "silver_moon") revalidatePath("/dashboard/silver-moon");
    if (unit.slug === "silver_naturals") revalidatePath("/dashboard/silver-naturals");
  }

  return NextResponse.json({
    ok: true,
    expenseId: data?.id ?? null
  });
}
