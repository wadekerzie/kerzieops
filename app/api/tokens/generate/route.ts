import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateStakeholderToken, getStakeholderSharePath } from "@/lib/tokens";

const payloadSchema = z.object({
  partnerId: z.string().uuid(),
  businessUnitIds: z.array(z.string().uuid()).min(1),
  redirectTo: z.string().default("/dashboard/settings")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return payloadSchema.parse({
      partnerId: body.partnerId,
      businessUnitIds: Array.isArray(body.businessUnitIds) ? body.businessUnitIds : [],
      redirectTo: body.redirectTo ?? "/dashboard/settings"
    });
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    partnerId: String(formData.get("partnerId") ?? ""),
    businessUnitIds: formData
      .getAll("businessUnitIds")
      .map((value) => String(value))
      .filter(Boolean),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/settings")
  });
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    const token = await generateStakeholderToken(payload.partnerId, payload.businessUnitIds);

    revalidatePath("/dashboard/settings");

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        token,
        path: getStakeholderSharePath(token)
      });
    }

    return NextResponse.redirect(new URL(payload.redirectTo, request.url), 303);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to generate stakeholder token."
      },
      { status: 400 }
    );
  }
}
