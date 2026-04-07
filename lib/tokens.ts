import type { BusinessUnit, Partner, StakeholderAccessToken } from "@/types";

const TOKEN_PATTERN = /^[a-f0-9]{48}$/i;

export interface TokenValidationResult {
  token: StakeholderAccessToken;
  partner: Pick<Partner, "id" | "name" | "role" | "email"> | null;
  businessUnits: Array<Pick<BusinessUnit, "id" | "name" | "slug">>;
}

export type StakeholderAccessContext = TokenValidationResult;

export function isValidStakeholderTokenFormat(token: string) {
  return TOKEN_PATTERN.test(token);
}

export function getStakeholderSharePath(token: string) {
  return `/view/${token}`;
}

/**
 * Issues a new read-only stakeholder token tied to a partner and an explicit list of
 * business units. Tokens intentionally have no expiration by default so Wade can share
 * a stable URL and deactivate it only when the relationship changes.
 */
export async function generateStakeholderToken(partnerId: string, businessUnitIds: string[]): Promise<string> {
  const [{ randomBytes }, { getServiceRoleSupabaseClient }] = await Promise.all([
    import("crypto"),
    import("@/lib/supabase")
  ]);
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase service-role client is not configured.");
  }

  const scopedBusinessUnitIds = Array.from(
    new Set(
      businessUnitIds
        .map((businessUnitId) => businessUnitId.trim())
        .filter(Boolean)
    )
  );

  if (!partnerId.trim()) {
    throw new Error("partnerId is required to generate a stakeholder token.");
  }

  if (scopedBusinessUnitIds.length === 0) {
    throw new Error("At least one business unit must be assigned to a stakeholder token.");
  }

  const token = randomBytes(24).toString("hex");
  const { error } = await supabase.from("stakeholder_access_tokens").insert({
    partner_id: partnerId,
    token,
    business_unit_ids: scopedBusinessUnitIds,
    expires_at: null,
    is_active: true
  } as never);

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

/**
 * Validates a stakeholder token and resolves the partner identity plus the exact business
 * units that token is allowed to read. Inactive, missing, or expired tokens resolve to null
 * so the reporting surface never leaks scoped financial data.
 */
export async function validateToken(token: string): Promise<TokenValidationResult | null> {
  if (!isValidStakeholderTokenFormat(token)) {
    return null;
  }

  const { getServiceRoleSupabaseClient } = await import("@/lib/supabase");
  const supabase = getServiceRoleSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: tokenRow, error } = await supabase
    .from("stakeholder_access_tokens")
    .select("id, partner_id, token, business_unit_ids, expires_at, is_active, created_at, updated_at")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  const typedTokenRow = tokenRow as StakeholderAccessToken | null;

  if (error || !typedTokenRow) {
    return null;
  }

  if (typedTokenRow.expires_at && new Date(typedTokenRow.expires_at) < new Date()) {
    return null;
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id, name, role, email")
    .eq("id", typedTokenRow.partner_id)
    .maybeSingle();
  const businessUnits =
    typedTokenRow.business_unit_ids.length > 0
      ? (
          await supabase
            .from("business_units")
            .select("id, name, slug")
            .in("id", typedTokenRow.business_unit_ids)
        ).data ?? []
      : [];

  return {
    token: typedTokenRow,
    partner: (partner as Pick<Partner, "id" | "name" | "role" | "email"> | null) ?? null,
    businessUnits: ((businessUnits ?? []) as Array<Pick<BusinessUnit, "id" | "name" | "slug">>).sort((left, right) =>
      left.name.localeCompare(right.name)
    )
  };
}

export const validateStakeholderAccessToken = validateToken;
