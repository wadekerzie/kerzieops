import { NextResponse } from "next/server";

import { getBusinessUnitsPreview, hasPublicSupabaseEnv, hasServiceRoleEnv } from "@/lib/supabase";

export async function GET() {
  const preview = await getBusinessUnitsPreview();

  return NextResponse.json({
    ...preview,
    environment: {
      hasPublicSupabaseEnv,
      hasServiceRoleEnv
    }
  });
}
