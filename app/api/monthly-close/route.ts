import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePayoutLedgerForMonth, generateSnapshotsForMonth, upsertMonthlyClose } from "@/lib/finance-data";

const payloadSchema = z.object({
  month: z.string().min(1),
  action: z.enum(["confirm_recurring_expenses", "generate_snapshots", "calculate_payouts", "mark_pdf_exported", "lock_month"]),
  lockedByEmail: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const body = await request.json();
  const payload = payloadSchema.parse(body);

  if (payload.action === "confirm_recurring_expenses") {
    await upsertMonthlyClose(payload.month, {
      recurring_expenses_confirmed: true
    });
  }

  if (payload.action === "generate_snapshots") {
    await generateSnapshotsForMonth(payload.month);
    await upsertMonthlyClose(payload.month, {
      snapshot_generated: true
    });
  }

  if (payload.action === "calculate_payouts") {
    await generatePayoutLedgerForMonth(payload.month);
    await upsertMonthlyClose(payload.month, {
      payouts_calculated: true
    });
  }

  if (payload.action === "mark_pdf_exported") {
    await upsertMonthlyClose(payload.month, {
      pdf_exported: true
    });
  }

  if (payload.action === "lock_month") {
    await upsertMonthlyClose(payload.month, {
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by_email: payload.lockedByEmail || null
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/close");
  revalidatePath("/dashboard/expenses");

  return NextResponse.json({ ok: true });
}
