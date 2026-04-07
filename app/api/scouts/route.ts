import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { PartnerInsert, ScoutInsert } from "@/types";

const payloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  redirectTo: z.string().default("/dashboard/scouts")
});

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return payloadSchema.parse(await request.json());
  }

  const formData = await request.formData();

  return payloadSchema.parse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    region: String(formData.get("region") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? "/dashboard/scouts")
  });
}

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);
  const partnerInsert: PartnerInsert = {
    name: payload.name,
    email: payload.email || null,
    role: "contractor",
    is_active: true
  };
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .insert(partnerInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (partnerError) {
    return NextResponse.json({ message: partnerError.message }, { status: 400 });
  }

  const scoutInsert: ScoutInsert = {
    partner_id: partner.id,
    name: payload.name,
    email: payload.email || null,
    phone: payload.phone || null,
    region: payload.region || null,
    is_active: true,
    onboard_date: new Date().toISOString().slice(0, 10),
    notes: null
  };
  const { data: scout, error: scoutError } = await supabase
    .from("scouts")
    .insert(scoutInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (scoutError) {
    await supabase.from("partners").delete().eq("id", partner.id);

    return NextResponse.json({ message: scoutError.message }, { status: 400 });
  }

  revalidatePath("/dashboard/scouts");

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, scoutId: scout.id });
  }

  return NextResponse.redirect(new URL(payload.redirectTo, request.url), 303);
}
