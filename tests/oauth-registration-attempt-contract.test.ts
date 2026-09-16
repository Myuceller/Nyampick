import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const attemptSource = readFileSync(
  new URL("../src/lib/server/oauth-registration-attempt.ts", import.meta.url),
  "utf8"
);

const webAuthSource = readFileSync(
  new URL("../src/features/auth/hooks/use-auth-page.ts", import.meta.url),
  "utf8"
);
const consentRouteSource = readFileSync(
  new URL("../src/app/api/auth/registration-consent/route.ts", import.meta.url),
  "utf8"
);

test("OAuth registration attempts allow only configured social providers", () => {
  assert.match(attemptSource, /export type OAuthRegistrationProvider = "google" \| "kakao" \| "apple"/);
  assert.match(attemptSource, /value === "google" \|\| value === "kakao" \|\| value === "apple"/);
  assert.doesNotMatch(attemptSource, /"email"\) return value/);
});

test("web OAuth passes an opaque attempt, never registration consent, through redirects", () => {
  assert.match(webAuthSource, /await createRegistrationConsentAttempt\(provider, consent\)/);
  assert.match(webAuthSource, /destination\.searchParams\.set\("registration_attempt", registrationAttempt\)/);
  assert.doesNotMatch(webAuthSource, /addRegistrationConsentIntent|readRegistrationConsentIntent/);
  assert.doesNotMatch(webAuthSource, /searchParams\.set\("registration"/);
});

test("server claims the OAuth attempt before recording and consumes it afterward", () => {
  const claimAt = consentRouteSource.indexOf("claimOAuthRegistrationAttempt(");
  const recordAt = consentRouteSource.indexOf("recordRegistrationConsent(user, attempt.consent, source)");
  const consumeAt = consentRouteSource.indexOf("consumeOAuthRegistrationAttempt(attempt.id, user.id)");
  assert.ok(claimAt >= 0 && recordAt > claimAt && consumeAt > recordAt);
});
