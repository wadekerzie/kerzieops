import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { assertMonthUnlocked, generateSnapshotsForMonth, recalculateMonthlySnapshotForUnit } from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { Expense } from "@/types";

const payloadSchema = z.object({
  businessUnitId: z.string().optional().or(z.literal("")),
  category: z.enum(["ops_tax", "marketing", "reserve", "variable", "capital", "one_time"]).optional(),
  vendor: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().min(0).optional(),
  expenseDate: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceInterval: z.enum(["monthly", "annual", "one_time"]).optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional().or(z.literal("")),
  nextBillingDate: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  adminOverride: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { expenseId: string } }
) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", params.expenseId)
    .single<Expense>();

  if (existingError) {
    return NextResponse.json({ message: existingError.message }, { status: 404 });
  }

  try {
    await assertMonthUnlocked(existing.expense_date, payload.adminOverride ?? false);

    if (payload.expenseDate) {
      await assertMonthUnlocked(payload.expenseDate, payload.adminOverride ?? false);
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "This month is locked." },
      { status: 400 }
    );
  }

  const updatedBusinessUnitId = payload.businessUnitId
    ? payload.businessUnitId === "global"
      ? null
      : payload.businessUnitId
    : existing.business_unit_id;
  const updatePayload = {
    business_unit_id: updatedBusinessUnitId,
    category: payload.category ?? existing.category,
    vendor: payload.vendor === undefined ? existing.vendor : payload.vendor || null,
    amount: payload.amount ?? existing.amount,
    expense_date: payload.expenseDate ?? existing.expense_date,
    is_recurring: payload.isRecurring ?? existing.is_recurring,
    recurrence_interval: payload.recurrenceInterval ?? existing.recurrence_interval,
    description: payload.description ?? existing.description,
    receipt_url: payload.receiptUrl === undefined ? existing.receipt_url : payload.receiptUrl || null,
    next_billing_date: payload.nextBillingDate === undefined ? existing.next_billing_date : payload.nextBillingDate || null,
    is_active: payload.isActive ?? existing.is_active
  };
  const { error } = await supabase.from("expenses").update(updatePayload as never).eq("id", params.expenseId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const affectedMonths = new Set([existing.expense_date, updatePayload.expense_date]);

  for (const monthDate of affectedMonths) {
    if (existing.business_unit_id) {
      await recalculateMonthlySnapshotForUnit(existing.business_unit_id, monthDate);
    } else {
      await generateSnapshotsForMonth(monthDate);
    }

    if (updatedBusinessUnitId && updatedBusinessUnitId !== existing.business_unit_id) {
      await recalculateMonthlySnapshotForUnit(updatedBusinessUnitId, monthDate);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/close");

  return NextResponse.json({ ok: true });
}
