import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingRegistrationConsent,
  getPendingRegistrationConsent,
  isRequiredRegistrationConsentAccepted,
  recordRegistrationConsent,
  savePendingRegistrationConsent,
  type RegistrationConsentInput,
} from "../src/features/auth/lib/registration-consent.ts";

const originalWindow = globalThis.window;
const acceptedConsent: RegistrationConsentInput = {
  serviceTermsAccepted: true,
  privacyPolicyAccepted: true,
  ageOver14Confirmed: true,
  marketingAccepted: false,
};

function withWindow(href: string, run: () => void) {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href },
      sessionStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        removeItem(key: string) {
          storage.delete(key);
        },
      },
    },
  });

  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
}

test("required registration consent needs every mandatory agreement", () => {
  assert.equal(isRequiredRegistrationConsentAccepted(acceptedConsent), true);
  assert.equal(
    isRequiredRegistrationConsentAccepted({
      ...acceptedConsent,
      ageOver14Confirmed: false,
    }),
    false
  );
});

test("pending social registration attempt is bound to its callback attempt", () => {
  withWindow("https://nyampick.test/auth", () => {
    const attemptId = savePendingRegistrationConsent("attempt-from-server");
    assert.equal(getPendingRegistrationConsent("other-attempt"), null);
    assert.equal(getPendingRegistrationConsent(attemptId)?.attemptId, attemptId);
    clearPendingRegistrationConsent();
    assert.equal(getPendingRegistrationConsent(attemptId), null);
  });
});

test("consent completion sends only an opaque attempt id after OAuth", async () => {
  const originalFetch = globalThis.fetch;
  let receivedBody: unknown;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (_url: string, options: RequestInit) => {
      receivedBody = options.body;
      return new Response(JSON.stringify({}), { status: 200 });
    },
  });

  try {
    await recordRegistrationConsent("test-access-token", "attempt-from-server");
    assert.deepEqual(JSON.parse(String(receivedBody)), { attemptId: "attempt-from-server" });
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});
