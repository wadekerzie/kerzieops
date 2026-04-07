import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { hasPublicSupabaseEnv } from "@/lib/supabase";
import type { Database } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getOptionalServerSupabaseClient() {
  if (!hasPublicSupabaseEnv) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: object;
        }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) => {
            (cookieStore as unknown as { set: (cookieName: string, cookieValue: string, cookieOptions?: object) => void }).set(
              name,
              value,
              options
            );
          });
        } catch {
          // Server Components cannot always write cookies. Supabase SSR docs recommend failing silently here.
        }
      }
    }
  });
}

export function getServerSupabaseClient() {
  const client = getOptionalServerSupabaseClient();

  if (!client) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return client;
}
