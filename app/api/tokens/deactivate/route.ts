import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  tokenId: z.string().uuid(),
  redirectTo: z.string().default("/dashboard/settings")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return payloadSchema.parse({
      tokenId: body.tokenId,
      redirectTo: body.redirectTo ?? "/dashboard/settings"
    });
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    tokenId: String(formData.get("tokenId") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/settings")
  });
}

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  try {
    const payload = await readPayload(request);
    const { error } = await supabase
      .from("stakeholder_access_tokens")
      .update({ is_active: false } as never)
      .eq("id", payload.tokenId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    revalidatePath("/dashboard/settings");

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.redirect(new URL(payload.redirectTo, request.url), 303);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to deactivate stakeholder token."
      },
      { status: 400 }
    );
  }
}
