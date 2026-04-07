import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { setSilverNaturalsAgreementPercentage } from "@/lib/finance-data";

const payloadSchema = z.object({
  wadePercentage: z.coerce.number().min(0).max(100)
});

export async function POST(request: Request) {
  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const result = await setSilverNaturalsAgreementPercentage(payload.wadePercentage);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/revenue/new");
  revalidatePath("/dashboard/close");
  revalidatePath("/dashboard/silver-naturals");

  return NextResponse.json({
    ok: true,
    ...result
  });
}
