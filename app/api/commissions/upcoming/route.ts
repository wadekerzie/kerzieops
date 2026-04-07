import { NextResponse } from "next/server";

import { getUpcomingScoutCommissions } from "@/lib/dashboard-data";

export async function GET() {
  const commissions = await getUpcomingScoutCommissions(7);

  return NextResponse.json({
    ok: true,
    count: commissions.length,
    commissions
  });
}
