import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServiceRoleSupabaseClient } from "@/lib/supabase";

const payloadSchema = z.object({
  businessUnitId: z.string().uuid(),
  scenarioName: z.string().min(1),
  startMonth: z.string().min(1),
  assumptions: z.record(z.any())
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const { data, error } = await supabase
    .from("proforma_scenarios")
    .upsert(
      {
        business_unit_id: payload.businessUnitId,
        scenario_name: payload.scenarioName,
        assumptions: {
          startMonth: payload.startMonth,
          assumptions: payload.assumptions
        }
      } as never,
      {
        onConflict: "business_unit_id,scenario_name"
      }
    )
    .select("id, business_unit_id, scenario_name")
    .single<{ id: string; business_unit_id: string; scenario_name: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePath("/dashboard/proforma");

  return NextResponse.json({
    ok: true,
    scenarioId: data?.id ?? null
  });
}
