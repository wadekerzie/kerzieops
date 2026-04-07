import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  payoutDate: z.string().min(1),
  commissionIds: z.array(z.string().uuid()).default([]),
  redirectTo: z.string().default("/dashboard/scouts")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return payloadSchema.parse({
      payoutDate: body.payoutDate,
      commissionIds: Array.isArray(body.commissionIds) ? body.commissionIds : [],
      redirectTo: body.redirectTo ?? "/dashboard/scouts"
    });
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    payoutDate: String(formData.get("payoutDate") ?? ""),
    commissionIds: String(formData.get("commissionIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/scouts")
  });
}

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);
  let query = supabase
    .from("scout_commissions")
    .update({ status: "paid" } as never)
    .eq("payout_date", payload.payoutDate)
    .in("status", ["pending", "held"]);

  if (payload.commissionIds.length > 0) {
    query = query.in("id", payload.commissionIds);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/scouts");

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL(payload.redirectTo, request.url), 303);
}
