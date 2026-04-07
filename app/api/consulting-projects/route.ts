import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchFinanceBaseData } from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { ConsultingProjectInsert } from "@/types";

const payloadSchema = z.object({
  businessUnitId: z.string().uuid().optional(),
  projectName: z.string().min(1),
  clientName: z.string().min(1),
  projectValue: z.coerce.number().min(0),
  startDate: z.string().min(1),
  endDate: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "complete", "paused"]).default("active"),
  description: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const baseData = await fetchFinanceBaseData();
  const kerzieAiUnit = baseData.businessUnits.find((unit) => unit.slug === "kerzie_ai");
  const projectInsert: ConsultingProjectInsert = {
    business_unit_id: payload.businessUnitId ?? kerzieAiUnit?.id ?? "",
    project_name: payload.projectName,
    client_name: payload.clientName,
    project_value: payload.projectValue,
    start_date: payload.startDate,
    end_date: payload.endDate || null,
    status: payload.status,
    description: payload.description || null
  };

  if (!projectInsert.business_unit_id) {
    return NextResponse.json({ message: "Kerzie AI business unit was not found." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("consulting_projects")
    .insert(projectInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePath("/dashboard/expenses");

  return NextResponse.json({
    ok: true,
    projectId: data?.id ?? null
  });
}
