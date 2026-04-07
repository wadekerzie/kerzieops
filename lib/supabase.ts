import { unstable_noStore as noStore } from "next/cache";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import type { BusinessUnit, Database } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasPublicSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const hasServiceRoleEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);

export interface BusinessUnitsPreviewResult {
  ok: boolean;
  source: "service_role";
  units: Pick<BusinessUnit, "id" | "name" | "slug">[];
  message: string;
  errorCode: string | null;
}

function invariantPublicEnv() {
  if (!hasPublicSupabaseEnv) {
    throw new Error("Supabase public environment variables are not configured.");
  }
}

export function getBrowserSupabaseClient() {
  invariantPublicEnv();

  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

export function getServiceRoleSupabaseClient() {
  if (!hasServiceRoleEnv) {
    return null;
  }

  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function getBusinessUnitsPreview(): Promise<BusinessUnitsPreviewResult> {
  noStore();

  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      source: "service_role",
      units: [],
      message: "Service-role Supabase environment variables are not configured.",
      errorCode: null
    };
  }

  try {
    const { data, error } = await supabase.from("business_units").select("id, name, slug").order("name").limit(6);

    if (error) {
      return {
        ok: false,
        source: "service_role",
        units: [],
        message: error.message,
        errorCode: error.code ?? null
      };
    }

    return {
      ok: true,
      source: "service_role",
      units: (data ?? []) as Pick<BusinessUnit, "id" | "name" | "slug">[],
      message: `Fetched ${(data ?? []).length} business unit record(s) from Supabase.`,
      errorCode: null
    };
  } catch (error) {
    return {
      ok: false,
      source: "service_role",
      units: [],
      message: error instanceof Error ? error.message : "Unknown Supabase connectivity error.",
      errorCode: null
    };
  }
}
