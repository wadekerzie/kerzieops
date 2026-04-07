import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { upsertMonthlyClose } from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  commissionIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["paid", "held"]),
  month: z.string().min(1)
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const { error } = await supabase
    .from("scout_commissions")
    .update({ status: payload.status } as never)
    .in("id", payload.commissionIds);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const [year, month] = payload.month.split("-").map(Number);
  const monthStartDate = new Date(year, month - 1, 1);
  const nextMonthStartDate = new Date(year, month, 1);
  const monthStart = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthStart = `${nextMonthStartDate.getFullYear()}-${String(nextMonthStartDate.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: monthCommissions, error: monthError } = await supabase
    .from("scout_commissions")
    .select("status")
    .gte("payout_date", monthStart)
    .lt("payout_date", nextMonthStart);

  if (monthError) {
    return NextResponse.json({ message: monthError.message }, { status: 400 });
  }

  await upsertMonthlyClose(`${payload.month}-01`, {
    commissions_review_completed: ((monthCommissions ?? []) as Array<{ status: string }>).every(
      (commission) => commission.status === "paid" || commission.status === "held"
    )
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/scouts");
  revalidatePath("/dashboard/close");

  return NextResponse.json({ ok: true });
}
