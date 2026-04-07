import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { syncSilverMoonTransactions } from "@/lib/silver-moon";

const payloadSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  redirectTo: z.string().default("/dashboard/silver-moon")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return payloadSchema.parse({
      days: body.days ?? 30,
      redirectTo: body.redirectTo ?? "/dashboard/silver-moon"
    });
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    days: String(formData.get("days") ?? "30"),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/silver-moon")
  });
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    const result = await syncSilverMoonTransactions(payload.days);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proforma");
    revalidatePath("/dashboard/silver-moon");

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        ...result
      });
    }

    return NextResponse.redirect(
      new URL(
        `${payload.redirectTo}?sync=${result.syncedCount}&skipped=${result.skippedCount}`,
        request.url
      ),
      303
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to sync Silver Moon Stripe transactions."
      },
      { status: 400 }
    );
  }
}
