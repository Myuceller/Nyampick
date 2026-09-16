import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import {
  InvalidRegistrationConsentError,
  PRIVACY_POLICY_VERSION,
  SERVICE_TERMS_VERSION,
  hasCompletedRegistration,
  hasRegistrationConsent,
  isLegacyRegistrationIdentity,
  needsFreshRegistrationIdentity,
  parseRegistrationConsent,
} from "../src/lib/server/registration-consent.ts";

function userWithMetadata(app_metadata: Record<string, unknown>, user_metadata = {}) {
  return { app_metadata, user_metadata } as Pick<User, "app_metadata" | "user_metadata">;
}

test("parseRegistrationConsent requires every required agreement", () => {
  assert.throws(
    () =>
      parseRegistrationConsent({
        serviceTermsAccepted: true,
        privacyPolicyAccepted: true,
        ageOver14Confirmed: false,
      }),
    InvalidRegistrationConsentError
  );

  assert.deepEqual(
    parseRegistrationConsent({
      serviceTermsAccepted: true,
      privacyPolicyAccepted: true,
      ageOver14Confirmed: true,
      marketingAccepted: false,
    }),
    {
      serviceTermsAccepted: true,
      privacyPolicyAccepted: true,
      ageOver14Confirmed: true,
      marketingAccepted: false,
    }
  );
});

test("registration authorization trusts app_metadata, never client-writable user_metadata", () => {
  const marker = {
    serviceTermsVersion: SERVICE_TERMS_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    ageOver14Confirmed: true,
    consentAcceptedAt: "2026-09-03T00:00:00.000Z",
  };

  assert.equal(
    hasRegistrationConsent(userWithMetadata({}, { nyampick_registration: marker })),
    false
  );
  assert.equal(
    hasRegistrationConsent(userWithMetadata({ nyampick_registration: marker })),
    true
  );
});

test("a consent marker alone cannot unlock protected data APIs before profile initialization", () => {
  const consented = userWithMetadata({
    nyampick_registration: {
      serviceTermsVersion: SERVICE_TERMS_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      ageOver14Confirmed: true,
      consentAcceptedAt: "2026-09-03T00:00:00.000Z",
    },
  });
  const completed = userWithMetadata({
    nyampick_registration: {
      serviceTermsVersion: SERVICE_TERMS_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      ageOver14Confirmed: true,
      consentAcceptedAt: "2026-09-03T00:00:00.000Z",
      completedAt: "2026-09-03T00:00:01.000Z",
    },
  });

  assert.equal(hasCompletedRegistration(consented), false);
  assert.equal(hasCompletedRegistration(completed), true);
  assert.equal(needsFreshRegistrationIdentity(consented), false);
});

test("an auth cache entry without a trusted consent marker must be refreshed", () => {
  assert.equal(needsFreshRegistrationIdentity(userWithMetadata({})), true);
});

test("only pre-rollout identities without a registration marker can use the legacy profile fallback", () => {
  const legacyUser = {
    app_metadata: {},
    created_at: "2026-06-01T00:00:00.000Z",
  } as Pick<User, "app_metadata" | "created_at">;
  const postRolloutUser = {
    app_metadata: {},
    created_at: "2026-09-08T00:00:00.000Z",
  } as Pick<User, "app_metadata" | "created_at">;
  const staleConsentUser = {
    app_metadata: {
      nyampick_registration: {
        serviceTermsVersion: "2025-01-01",
        privacyPolicyVersion: "2025-01-01",
      },
    },
    created_at: "2026-06-01T00:00:00.000Z",
  } as Pick<User, "app_metadata" | "created_at">;

  assert.equal(isLegacyRegistrationIdentity(legacyUser), true);
  assert.equal(isLegacyRegistrationIdentity(postRolloutUser), false);
  assert.equal(isLegacyRegistrationIdentity(staleConsentUser), false);
});
