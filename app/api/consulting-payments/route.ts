import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertMonthUnlocked,
  buildManualRevenueInsert,
  recalculateMonthlySnapshotForUnit
} from "@/lib/finance-data";
import { getServiceRoleSupabaseClient } from "@/lib/supabase";
import type { ConsultingProject, ConsultingProjectPaymentInsert } from "@/types";

const payloadSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.coerce.number().min(0),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["ach", "check", "stripe", "cash"]).default("ach"),
  description: z.string().optional().or(z.literal("")),
  invoiceNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  adminOverride: z.boolean().optional()
});

export async function POST(request: Request) {
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service-role client is not configured." }, { status: 500 });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);

  try {
    await assertMonthUnlocked(payload.paymentDate, payload.adminOverride ?? false);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "This month is locked." },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("consulting_projects")
    .select("*")
    .eq("id", payload.projectId)
    .single<ConsultingProject>();

  if (projectError || !project) {
    return NextResponse.json({ message: projectError?.message ?? "Consulting project not found." }, { status: 404 });
  }

  const revenueInsert = buildManualRevenueInsert({
    businessUnitId: project.business_unit_id,
    source: "manual",
    revenueType: "one_time",
    grossAmount: payload.amount,
    paymentMethod: payload.paymentMethod,
    transactionDate: payload.paymentDate,
    customerName: project.client_name,
    description: payload.description || `${project.project_name} milestone payment`,
    invoiceNumber: payload.invoiceNumber,
    notes: payload.notes,
    isSetupFee: false,
    isPendingAgreement: false
  });
  const { data: revenueEvent, error: revenueError } = await supabase
    .from("revenue_events")
    .insert(revenueInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (revenueError || !revenueEvent) {
    return NextResponse.json({ message: revenueError?.message ?? "Failed to create revenue event." }, { status: 400 });
  }

  const paymentInsert: ConsultingProjectPaymentInsert = {
    project_id: payload.projectId,
    amount: payload.amount,
    payment_date: payload.paymentDate,
    description: payload.description || null,
    invoice_number: payload.invoiceNumber || null,
    notes: payload.notes || null,
    revenue_event_id: revenueEvent.id
  };
  const { data, error } = await supabase
    .from("consulting_project_payments")
    .insert(paymentInsert as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recalculateMonthlySnapshotForUnit(project.business_unit_id, payload.paymentDate);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/close");

  return NextResponse.json({
    ok: true,
    paymentId: data?.id ?? null
  });
}
