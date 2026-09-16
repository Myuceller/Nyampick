import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveMobileEntryScreen } from "../apps/mobile/src/features/auth/mobile-entry.ts";

const baseState = {
  authStatus: "configured" as const,
  isAuthenticated: false,
  isOnboardingRequired: false,
  isPasswordRecovery: false,
};

const authContextSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-context.tsx", import.meta.url),
  "utf8"
);

test("mobile restores the session before choosing its first screen", () => {
  assert.equal(resolveMobileEntryScreen({ ...baseState, authStatus: "loading" }), "loading");
  assert.match(
    authContextSource,
    /const resolveInitialSession = \(nextSession: Session \| null\) => \{[\s\S]*?finalizeSession\(nextSession\)\.finally\([\s\S]*?initialSessionResolved = true;[\s\S]*?setStatus\("configured"\);/
  );
  assert.match(
    authContextSource,
    /client\.auth\.getSession\(\)\.then\(\(\{ data \}\) => \{[\s\S]*?resolveInitialSession\(data\.session\);/
  );
  assert.match(
    authContextSource,
    /if \(!initialSessionResolved\) \{\s*resolveInitialSession\(nextSession\);\s*return;/
  );
});

test("signed-out mobile users enter authentication instead of a marketing landing", () => {
  assert.equal(resolveMobileEntryScreen(baseState), "auth");
  assert.equal(resolveMobileEntryScreen({ ...baseState, authStatus: "missing-config" }), "auth");
});

test("newly authenticated users see product onboarding before the app", () => {
  assert.equal(resolveMobileEntryScreen({
    ...baseState,
    isAuthenticated: true,
    isOnboardingRequired: true,
  }), "onboarding");
  assert.equal(resolveMobileEntryScreen({
    ...baseState,
    isAuthenticated: true,
  }), "app");
});

test("password recovery takes precedence over product onboarding", () => {
  assert.equal(resolveMobileEntryScreen({
    ...baseState,
    isAuthenticated: true,
    isOnboardingRequired: true,
    isPasswordRecovery: true,
  }), "auth");
});

test("web root remains the public landing while native onboarding is skippable", () => {
  const webRoot = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const nativeOnboarding = readFileSync(
    new URL("../apps/mobile/src/features/auth/auth-screen.tsx", import.meta.url),
    "utf8"
  );

  assert.match(webRoot, /export \{ default \} from "\.\/landing\/page"/);
  assert.match(nativeOnboarding, /accessibilityLabel="온보딩 건너뛰기"/);
  assert.match(nativeOnboarding, /await auth\.completeOnboarding\(\)/);
});
