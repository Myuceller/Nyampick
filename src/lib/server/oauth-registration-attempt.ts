import { getSupabaseAdmin } from "./supabase-admin";
import type { RegistrationConsentInput } from "./registration-consent";

const ATTEMPT_TABLE = "oauth_registration_attempts";

export type OAuthRegistrationProvider = "google" | "kakao" | "apple";

export interface OAuthRegistrationAttempt {
  id: string;
  provider: OAuthRegistrationProvider;
  consent: RegistrationConsentInput;
  expiresAt: string;
  consumedAt: string | null;
}

export class OAuthRegistrationAttemptError extends Error {
  readonly code: "INVALID" | "UNAVAILABLE";

  constructor(
    message = "소셜 회원가입 정보를 확인하지 못했습니다. 회원가입 화면에서 다시 시도해주세요.",
    code: "INVALID" | "UNAVAILABLE" = "INVALID"
  ) {
    super(message);
    this.code = code;
  }
}

function isMissingAttemptTable(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.message?.includes(ATTEMPT_TABLE) ||
    error?.message?.includes("does not exist")
  );
}

function toAttemptError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    isMissingAttemptTable(error as { code?: string; message?: string })
  ) {
    return new OAuthRegistrationAttemptError(
      "소셜 회원가입 저장소가 준비되지 않았습니다. 배포 전 migration을 적용해주세요.",
      "UNAVAILABLE"
    );
  }
  return new OAuthRegistrationAttemptError(
    "소셜 회원가입 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    "UNAVAILABLE"
  );
}

function toAttempt(row: {
  id: string;
  provider: OAuthRegistrationProvider;
  service_terms_accepted: boolean;
  privacy_policy_accepted: boolean;
  age_over_14_confirmed: boolean;
  marketing_accepted: boolean;
  expires_at: string;
  consumed_at: string | null;
}): OAuthRegistrationAttempt {
  if (
    row.service_terms_accepted !== true ||
    row.privacy_policy_accepted !== true ||
    row.age_over_14_confirmed !== true
  ) {
    throw new OAuthRegistrationAttemptError();
  }
  return {
    id: row.id,
    provider: row.provider,
    consent: {
      serviceTermsAccepted: true,
      privacyPolicyAccepted: true,
      ageOver14Confirmed: true,
      marketingAccepted: row.marketing_accepted,
    },
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
  };
}

export function parseOAuthRegistrationProvider(value: unknown): OAuthRegistrationProvider {
  if (value === "google" || value === "kakao" || value === "apple") return value;
  throw new OAuthRegistrationAttemptError("소셜 로그인 방식을 확인해주세요.");
}

/**
 * Stores the accepted signup agreement before OAuth starts. The opaque attempt
 * id is the only value allowed through a browser/deep-link callback; consent
 * booleans never travel in a URL or come back from an authenticated client.
 */
export async function createOAuthRegistrationAttempt(
  provider: OAuthRegistrationProvider,
  consent: RegistrationConsentInput
): Promise<OAuthRegistrationAttempt> {
  const { data, error } = await getSupabaseAdmin()
    .from(ATTEMPT_TABLE)
    .insert({
      provider,
      service_terms_accepted: consent.serviceTermsAccepted,
      privacy_policy_accepted: consent.privacyPolicyAccepted,
      age_over_14_confirmed: consent.ageOver14Confirmed,
      marketing_accepted: consent.marketingAccepted,
    })
    .select(
      "id,provider,service_terms_accepted,privacy_policy_accepted,age_over_14_confirmed,marketing_accepted,expires_at,consumed_at"
    )
    .single();
  if (error || !data) throw toAttemptError(error);
  return toAttempt(data);
}

/**
 * Atomically binds an attempt to the OAuth identity that returned from the
 * provider. Retrying by that same identity is allowed so a network drop after
 * consent storage cannot strand a newly-created account.
 */
export async function claimOAuthRegistrationAttempt(
  attemptId: string,
  userId: string,
  providers: readonly OAuthRegistrationProvider[]
): Promise<OAuthRegistrationAttempt> {
  if (providers.length === 0) throw new OAuthRegistrationAttemptError();
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const selection =
    "id,provider,service_terms_accepted,privacy_policy_accepted,age_over_14_confirmed,marketing_accepted,expires_at,consumed_at,claimed_user_id";
  const { data: claimed, error: claimError } = await supabase
    .from(ATTEMPT_TABLE)
    .update({ claimed_user_id: userId, claimed_at: now })
    .eq("id", attemptId)
    .in("provider", [...providers])
    .is("claimed_user_id", null)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select(selection)
    .maybeSingle();
  if (claimError) throw toAttemptError(claimError);
  if (claimed) return toAttempt(claimed);

  const { data: existing, error: readError } = await supabase
    .from(ATTEMPT_TABLE)
    .select(selection)
    .eq("id", attemptId)
    .maybeSingle();
  if (readError) throw toAttemptError(readError);
  if (
    !existing ||
    !providers.includes(existing.provider) ||
    existing.claimed_user_id !== userId ||
    new Date(existing.expires_at).getTime() <= Date.now()
  ) {
    throw new OAuthRegistrationAttemptError();
  }
  return toAttempt(existing);
}

export async function consumeOAuthRegistrationAttempt(attemptId: string, userId: string) {
  const { error } = await getSupabaseAdmin()
    .from(ATTEMPT_TABLE)
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("claimed_user_id", userId)
    .is("consumed_at", null);
  if (error) throw toAttemptError(error);
}
