import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin.ts";
import {
  PRIVACY_POLICY_VERSION,
  REGISTRATION_CONSENT_ROLLOUT_AT,
  SERVICE_TERMS_VERSION,
} from "@nyampick/contracts/legal";

/**
 * These versions must be increased whenever the published terms or privacy policy
 * changes in a way that requires renewed agreement.
 */
export { SERVICE_TERMS_VERSION, PRIVACY_POLICY_VERSION };

const CONSENT_TABLE = "user_registration_consents";
const APP_METADATA_KEY = "nyampick_registration";

export interface RegistrationConsentInput {
  serviceTermsAccepted: true;
  privacyPolicyAccepted: true;
  ageOver14Confirmed: true;
  marketingAccepted: boolean;
}

export interface RegistrationConsentRecord {
  serviceTermsVersion: string;
  privacyPolicyVersion: string;
  ageOver14Confirmed: boolean;
  marketingAccepted: boolean;
  acceptedAt: string;
  source: "email" | "oauth";
}

type Metadata = Record<string, unknown>;

export class InvalidRegistrationConsentError extends Error {
  constructor(message = "필수 약관에 동의해 주세요.") {
    super(message);
    this.name = "InvalidRegistrationConsentError";
  }
}

export class RegistrationConsentStorageError extends Error {
  constructor(message = "회원가입 약관 저장 설정을 확인해주세요.") {
    super(message);
    this.name = "RegistrationConsentStorageError";
  }
}

function asRecord(value: unknown): Metadata | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Metadata)
    : null;
}

function isMissingConsentTable(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.message?.includes(CONSENT_TABLE) ||
    error?.message?.includes("does not exist")
  );
}

function toStorageError(error: unknown): RegistrationConsentStorageError {
  if (
    error &&
    typeof error === "object" &&
    isMissingConsentTable(error as { code?: string; message?: string })
  ) {
    return new RegistrationConsentStorageError(
      "회원가입 약관 저장 테이블이 준비되지 않았습니다. 배포 전 migration을 적용해주세요."
    );
  }
  return new RegistrationConsentStorageError();
}

function getRegistrationMetadata(user: Pick<User, "app_metadata">): Metadata | null {
  const appMetadata = asRecord(user.app_metadata);
  return asRecord(appMetadata?.[APP_METADATA_KEY]);
}

export function isLegacyRegistrationIdentity(
  user: Pick<User, "app_metadata" | "created_at">
) {
  if (getRegistrationMetadata(user)) return false;
  const createdAt = Date.parse(user.created_at);
  const rolloutAt = Date.parse(REGISTRATION_CONSENT_ROLLOUT_AT);
  return Number.isFinite(createdAt) && createdAt < rolloutAt;
}

function buildConsentMarker(
  current: Metadata | null,
  acceptedAt: string,
  source: "email" | "oauth"
): Metadata {
  return {
    ...(current ?? {}),
    serviceTermsVersion: SERVICE_TERMS_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    ageOver14Confirmed: true,
    consentAcceptedAt: acceptedAt,
    consentSource: source,
  };
}

function mapConsentRow(row: {
  service_terms_version: string;
  privacy_policy_version: string;
  age_over_14_confirmed: boolean;
  marketing_accepted: boolean;
  accepted_at: string;
  source: "email" | "oauth";
}): RegistrationConsentRecord {
  return {
    serviceTermsVersion: row.service_terms_version,
    privacyPolicyVersion: row.privacy_policy_version,
    ageOver14Confirmed: row.age_over_14_confirmed,
    marketingAccepted: row.marketing_accepted,
    acceptedAt: row.accepted_at,
    source: row.source,
  };
}

/**
 * Accept only a complete, explicit set of required registrations consents. This
 * intentionally does not trust a client-provided policy version or timestamp.
 */
export function parseRegistrationConsent(value: unknown): RegistrationConsentInput {
  const input = asRecord(value);
  if (!input) throw new InvalidRegistrationConsentError();

  if (
    input.serviceTermsAccepted !== true ||
    input.privacyPolicyAccepted !== true ||
    input.ageOver14Confirmed !== true
  ) {
    throw new InvalidRegistrationConsentError();
  }

  if (
    input.marketingAccepted !== undefined &&
    typeof input.marketingAccepted !== "boolean"
  ) {
    throw new InvalidRegistrationConsentError("광고성 정보 수신 동의 값을 확인해주세요.");
  }

  return {
    serviceTermsAccepted: true,
    privacyPolicyAccepted: true,
    ageOver14Confirmed: true,
    marketingAccepted: input.marketingAccepted === true,
  };
}

/**
 * App metadata is writable only with Supabase admin privileges. Do not replace
 * this with user_metadata, which an authenticated client can update itself.
 */
export function hasRegistrationConsent(user: Pick<User, "app_metadata">): boolean {
  const registration = getRegistrationMetadata(user);
  return (
    registration?.serviceTermsVersion === SERVICE_TERMS_VERSION &&
    registration?.privacyPolicyVersion === PRIVACY_POLICY_VERSION &&
    registration?.ageOver14Confirmed === true &&
    typeof registration.consentAcceptedAt === "string" &&
    registration.consentAcceptedAt.length > 0
  );
}

export function hasCompletedRegistration(user: Pick<User, "app_metadata">): boolean {
  const registration = getRegistrationMetadata(user);
  return (
    hasRegistrationConsent(user) &&
    typeof registration?.completedAt === "string" &&
    registration.completedAt.length > 0
  );
}

/**
 * A just-created identity can receive its trusted consent marker between two
 * requests. Do not reuse an unconsented cached auth user for that transition.
 */
export function needsFreshRegistrationIdentity(
  user: Pick<User, "app_metadata">
): boolean {
  return !hasRegistrationConsent(user);
}

/**
 * Profiles created before this consent rollout remain usable. This fallback is
 * deliberately by auth user id only; matching an email would cross account
 * boundaries and must never grant access.
 */
export async function hasLegacyProfile(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

export async function hasCompletedRegistrationOrLegacyProfile(
  user: Pick<User, "id" | "app_metadata" | "created_at">
): Promise<boolean> {
  if (hasCompletedRegistration(user)) return true;
  if (!isLegacyRegistrationIdentity(user)) return false;
  return hasLegacyProfile(user.id);
}

async function readConsentRecord(userId: string): Promise<RegistrationConsentRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(CONSENT_TABLE)
    .select(
      "service_terms_version,privacy_policy_version,age_over_14_confirmed,marketing_accepted,accepted_at,source"
    )
    .eq("user_id", userId)
    .eq("service_terms_version", SERVICE_TERMS_VERSION)
    .eq("privacy_policy_version", PRIVACY_POLICY_VERSION)
    .maybeSingle();
  if (error) throw toStorageError(error);
  return data ? mapConsentRow(data) : null;
}

/**
 * Records consent for the current policy versions immutably, then writes a
 * trusted authorization marker into app_metadata. Retrying the same version is
 * idempotent; a future policy version creates a new audit row. The marker is
 * written only after the audit record succeeds, so a missing migration never
 * creates an active account.
 */
export async function recordRegistrationConsent(
  user: Pick<User, "id" | "app_metadata">,
  input: RegistrationConsentInput,
  source: "email" | "oauth"
): Promise<RegistrationConsentRecord> {
  const supabase = getSupabaseAdmin();
  const acceptedAt = new Date().toISOString();
  const { error: insertError } = await supabase.from(CONSENT_TABLE).upsert(
    {
      user_id: user.id,
      service_terms_version: SERVICE_TERMS_VERSION,
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      age_over_14_confirmed: true,
      marketing_accepted: input.marketingAccepted,
      accepted_at: acceptedAt,
      source,
    },
    {
      onConflict: "user_id,service_terms_version,privacy_policy_version",
      ignoreDuplicates: true,
    }
  );
  if (insertError) throw toStorageError(insertError);

  let record: RegistrationConsentRecord | null;
  try {
    record = await readConsentRecord(user.id);
  } catch (error) {
    throw toStorageError(error);
  }
  if (!record) throw new RegistrationConsentStorageError();

  const currentAppMetadata = asRecord(user.app_metadata) ?? {};
  const currentRegistration = getRegistrationMetadata(user);
  const { error: metadataError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...currentAppMetadata,
      [APP_METADATA_KEY]: buildConsentMarker(
        currentRegistration,
        record.acceptedAt,
        record.source
      ),
    },
  });
  if (metadataError) throw toStorageError(metadataError);

  return record;
}

/**
 * A consented account becomes active only after its own profile is initialized.
 * This blocks an OAuth identity that has skipped the app's registration step
 * from calling data APIs directly.
 */
export async function markRegistrationCompleted(
  user: Pick<User, "id" | "app_metadata">
): Promise<void> {
  if (!hasRegistrationConsent(user)) {
    throw new InvalidRegistrationConsentError();
  }

  const currentAppMetadata = asRecord(user.app_metadata) ?? {};
  const currentRegistration = getRegistrationMetadata(user);
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...currentAppMetadata,
      [APP_METADATA_KEY]: {
        ...(currentRegistration ?? {}),
        completedAt: new Date().toISOString(),
      },
    },
  });
  if (error) throw toStorageError(error);
}
