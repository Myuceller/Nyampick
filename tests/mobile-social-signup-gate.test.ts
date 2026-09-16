import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authScreenSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-screen.tsx", import.meta.url),
  "utf8"
);
const authContextSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-context.tsx", import.meta.url),
  "utf8"
);

test("mobile social signup requires the same mandatory agreements as email signup", () => {
  assert.match(
    authScreenSource,
    /const signInWithSocial = async[\s\S]*?if \(isSignup && !requiredTermsAccepted\) \{[\s\S]*?return;[\s\S]*?await auth\.signInWithSocial\(provider\);/
  );
  assert.match(
    authScreenSource,
    /isSignup[\s\S]*?onApple=\{\(\) => void signInWithSocial\("apple"\)\}[\s\S]*?onGoogle=\{\(\) => void signInWithSocial\("google"\)\}[\s\S]*?onKakao=\{\(\) => void signInWithSocial\("kakao"\)\}[\s\S]*?termsConsentRequired=\{!requiredTermsAccepted\}/
  );
  assert.match(authScreenSource, /consent: signupConsent/);
  assert.match(authScreenSource, /auth\.signInWithSocial\(provider, signupConsent\)/);
  assert.match(
    authScreenSource,
    /const signupConsent = \{\s*serviceTermsAccepted: agreements\.service,\s*privacyPolicyAccepted: agreements\.privacy,\s*ageOver14Confirmed: agreements\.age,\s*marketingAccepted: agreements\.marketing,\s*\};/
  );
});

test("mobile social signup controls expose their disabled agreement state", () => {
  assert.match(authScreenSource, /const socialButtonsDisabled = disabled \|\| termsConsentRequired;/);
  assert.match(authScreenSource, /disabled=\{socialButtonsDisabled\}/);
  assert.match(authScreenSource, /필수 약관에 동의하면 소셜 계정으로 가입할 수 있어요\./);
});

test("native Apple signup uses the same mandatory agreement gate", () => {
  assert.match(authScreenSource, /provider: "google" \| "kakao" \| "apple"/);
  assert.match(authScreenSource, /onApple=\{\(\) => void signInWithSocial\("apple"\)\}/);
  assert.match(authScreenSource, /AppleAuthenticationButton/);
});

test("mobile social signup binds a server attempt to its one-time callback", () => {
  assert.match(authContextSource, /PENDING_REGISTRATION_CONSENT_TTL_MS = 15 \* 60 \* 1000/);
  assert.match(authContextSource, /const REGISTRATION_ATTEMPT_PARAM = "registration_attempt"/);
  assert.match(
    authContextSource,
    /queryParams: registrationAttempt \? \{ \[REGISTRATION_ATTEMPT_PARAM\]: registrationAttempt \} : undefined/
  );
  assert.match(
    authContextSource,
    /pendingConsent\.attemptId !== params\.registrationAttempt/
  );
  assert.match(
    authContextSource,
    /postPublicApi<\{ attemptId\?: unknown \}>\(\s*"\/api\/auth\/registration-attempt",\s*\{ provider, consent: acceptedConsent \}/
  );
  assert.match(
    authContextSource,
    /await SecureStore\.setItemAsync\(PENDING_REGISTRATION_CONSENT_KEY, JSON\.stringify\(payload\)\)/
  );
  assert.match(
    authContextSource,
    /requestAuthedApi<void>\("\/api\/auth\/registration-consent", nextSession\.access_token/
  );
  assert.match(authContextSource, /body: \{ attemptId \}/);
  assert.doesNotMatch(authContextSource, /createRegistrationAttemptId/);
});
