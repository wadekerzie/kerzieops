import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateProformaScenario } from "@/lib/proforma";

const tierSchema = z.object({
  tierName: z.string().min(1),
  subscribers: z.number().min(0),
  price: z.number().min(0),
  llmCostPerUser: z.number().min(0),
  allocatedOpsTaxPerUser: z.number().min(0)
});

const payloadSchema = z.object({
  appleCutPercentage: z.number().min(0).max(100).optional(),
  tiers: z.array(tierSchema).default([])
});

export async function POST(request: Request) {
  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const result = calculateProformaScenario(payload);

  return NextResponse.json({ ok: true, result });
}
