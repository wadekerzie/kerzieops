import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recalculateMonthlySnapshotForUnit } from "@/lib/dashboard-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { ExpenseInsert } from "@/types";

const payloadSchema = z.object({
  businessUnitId: z.string().min(1),
  category: z.enum(["ops_tax", "marketing", "reserve", "variable", "capital", "one_time"]),
  vendor: z.string().min(1),
  amount: z.coerce.number().min(0),
  expenseDate: z.string().min(1)
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const businessUnitId = payload.businessUnitId === "global" ? null : payload.businessUnitId;
  const expenseInsert: ExpenseInsert = {
    business_unit_id: businessUnitId,
    category: payload.category,
    amount: payload.amount,
    description: `${payload.vendor} ${payload.category.replace("_", " ")} expense`,
    vendor: payload.vendor,
    expense_date: payload.expenseDate,
    is_recurring: false,
    recurrence_interval: "one_time"
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(expenseInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (businessUnitId) {
    await recalculateMonthlySnapshotForUnit(businessUnitId, payload.expenseDate);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");

  return NextResponse.json({
    ok: true,
    expenseId: data?.id ?? null
  });
}
