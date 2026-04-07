import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { upsertMonthlyClose } from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { RevenueEvent } from "@/types";

const payloadSchema = z.object({
  revenueEventId: z.string().uuid(),
  reviewStatus: z.enum(["confirmed", "flagged"]),
  reviewNotes: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const { data: updatedEvent, error } = await supabase
    .from("revenue_events")
    .update({
      review_status: payload.reviewStatus,
      review_notes: payload.reviewNotes || null
    } as never)
    .eq("id", payload.revenueEventId)
    .select("*")
    .single<RevenueEvent>();

  if (error || !updatedEvent) {
    return NextResponse.json({ message: error?.message ?? "Revenue event not found." }, { status: 400 });
  }

  const eventDate = new Date(`${updatedEvent.transaction_date}T00:00:00`);
  const monthStartDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
  const nextMonthStartDate = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 1);
  const monthStart = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthStart = `${nextMonthStartDate.getFullYear()}-${String(nextMonthStartDate.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: monthEvents, error: monthError } = await supabase
    .from("revenue_events")
    .select("review_status")
    .gte("transaction_date", monthStart)
    .lt("transaction_date", nextMonthStart);

  if (monthError) {
    return NextResponse.json({ message: monthError.message }, { status: 400 });
  }

  await upsertMonthlyClose(updatedEvent.transaction_date, {
    revenue_review_completed: ((monthEvents ?? []) as Array<{ review_status: string }>).every(
      (event) => event.review_status !== "unreviewed"
    )
  });

  revalidatePath("/dashboard/close");

  return NextResponse.json({ ok: true });
}
