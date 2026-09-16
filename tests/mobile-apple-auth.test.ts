import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const configureExpo = require("../apps/mobile/app.config.js") as (input: { config: typeof appConfig.expo }) => typeof appConfig.expo;

const appConfig = JSON.parse(readFileSync(
  new URL("../apps/mobile/app.json", import.meta.url),
  "utf8"
));
const mobilePackage = JSON.parse(readFileSync(
  new URL("../apps/mobile/package.json", import.meta.url),
  "utf8"
));
const authContextSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-context.tsx", import.meta.url),
  "utf8"
);
const authScreenSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-screen.tsx", import.meta.url),
  "utf8"
);
const consentRouteSource = readFileSync(
  new URL("../src/app/api/auth/registration-consent/route.ts", import.meta.url),
  "utf8"
);
const migrationSource = readFileSync(
  new URL("../docs/supabase-registration-consent.sql", import.meta.url),
  "utf8"
);

test("Apple auth stays dormant until its public release flag is enabled", () => {
  const originalFlag = process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH;
  try {
    delete process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH;
    const disabledConfig = configureExpo({ config: appConfig.expo });
    assert.equal(disabledConfig.ios.usesAppleSignIn, false);
    assert.ok(!disabledConfig.plugins.includes("expo-apple-authentication"));
    assert.equal(typeof disabledConfig.plugins.at(-1), "function");

    process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH = "true";
    const enabledConfig = configureExpo({ config: appConfig.expo });
    assert.equal(enabledConfig.ios.usesAppleSignIn, true);
    assert.ok(enabledConfig.plugins.includes("expo-apple-authentication"));
  } finally {
    if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH;
    else process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH = originalFlag;
  }

  assert.equal(appConfig.expo.ios.usesAppleSignIn, false);
  assert.equal(appConfig.expo.ios.infoPlist.CFBundleAllowMixedLocalizations, true);
  assert.match(mobilePackage.dependencies["expo-apple-authentication"], /^~57\./);
});

test("iOS renders Apple's official localized authentication button", () => {
  assert.match(authScreenSource, /!mobileConfig\.appleAuthEnabled/);
  assert.match(authScreenSource, /AppleAuthentication\.isAvailableAsync\(\)/);
  assert.match(authScreenSource, /AppleAuthentication\.AppleAuthenticationButton/);
  assert.match(authScreenSource, /AppleAuthenticationButtonStyle\.BLACK/);
  assert.match(authScreenSource, /cornerRadius=\{12\}/);
});

test("native Apple login verifies state and nonce before Supabase session creation", () => {
  assert.match(authContextSource, /Crypto\.CryptoDigestAlgorithm\.SHA256/);
  assert.match(authContextSource, /nonce: hashedNonce/);
  assert.match(authContextSource, /credential\.state !== requestState/);
  assert.match(
    authContextSource,
    /signInWithIdToken\(\{\s*provider: "apple",\s*token: credential\.identityToken,\s*nonce: rawNonce/
  );
  assert.match(authContextSource, /matchedPendingRegistrationConsentRef\.current = registrationAttempt/);
  assert.match(authContextSource, /await finalizeSession\(data\.session\)/);
  assert.match(authContextSource, /client\.auth\.updateUser\(\{ data: nameMetadata \}\)/);
  assert.match(authContextSource, /AppleAuthentication\.addRevokeListener\(clearExpiredSession\)/);
  assert.doesNotMatch(authContextSource, /console\.(?:log|warn|error)\([^\n]*(?:identityToken|authorizationCode)/);
});

test("server and migration accept Apple as a consent-bound provider", () => {
  assert.match(consentRouteSource, /\["google", "kakao", "apple"\][\s\S]*?\.filter/);
  assert.match(migrationSource, /provider in \('google', 'kakao', 'apple'\)/);
  assert.match(migrationSource, /drop constraint if exists oauth_registration_attempts_provider_check/);
});
