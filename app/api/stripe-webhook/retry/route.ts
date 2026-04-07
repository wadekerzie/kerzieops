import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { retrySilverMoonWebhookEvent } from "@/lib/silver-moon";

const payloadSchema = z.object({
  webhookEventId: z.string().uuid(),
  redirectTo: z.string().default("/dashboard/silver-moon")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return payloadSchema.parse({
      webhookEventId: body.webhookEventId,
      redirectTo: body.redirectTo ?? "/dashboard/silver-moon"
    });
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    webhookEventId: String(formData.get("webhookEventId") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/silver-moon")
  });
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    const result = await retrySilverMoonWebhookEvent(payload.webhookEventId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proforma");
    revalidatePath("/dashboard/silver-moon");

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        result
      });
    }

    return NextResponse.redirect(new URL(`${payload.redirectTo}?retried=1`, request.url), 303);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to retry the Stripe webhook event."
      },
      { status: 400 }
    );
  }
}
