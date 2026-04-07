import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateWaterfall } from "@/lib/waterfall";

const revenueSchema = z.object({
  grossAmount: z.number().min(0),
  platformFeePercentage: z.number().min(0).max(100).optional(),
  platformFeeAmount: z.number().min(0).optional()
});

const expenseSchema = z.object({
  amount: z.number().min(0),
  category: z.enum(["ops_tax", "marketing", "reserve", "variable", "capital", "one_time"])
});

const payloadSchema = z.object({
  revenueEvents: z.array(revenueSchema).default([]),
  expenses: z.array(expenseSchema).default([]),
  marketingFundPercentage: z.number().min(0).max(100),
  operatingReservePercentage: z.number().min(0).max(100),
  marketingContributionsApplied: z.number().min(0).optional()
});

export async function POST(request: Request) {
  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const snapshot = calculateWaterfall(payload);

  return NextResponse.json({
    ok: true,
    snapshot
  });
}
