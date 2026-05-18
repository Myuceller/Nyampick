import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthRedirectPath,
  getAuthNextPath,
  hasAuthNextPath,
  sanitizeAuthNextPath,
} from "../src/lib/auth-redirect.ts";

const originalWindow = globalThis.window;

function withWindowHref(href: string, run: () => void) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        href,
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

test("sanitizeAuthNextPath allows only internal non-auth paths", () => {
  assert.equal(sanitizeAuthNextPath("/fridge?tab=expired"), "/fridge?tab=expired");
  assert.equal(sanitizeAuthNextPath("/"), "/");
  assert.equal(sanitizeAuthNextPath(null), "/meal");
  assert.equal(sanitizeAuthNextPath("https://example.com/fridge"), "/meal");
  assert.equal(sanitizeAuthNextPath("//example.com/fridge"), "/meal");
  assert.equal(sanitizeAuthNextPath("/auth?next=/fridge"), "/meal");
});

test("buildAuthRedirectPath adds next only when the target is not the default home path", () => {
  assert.equal(buildAuthRedirectPath("/fridge?tab=expired"), "/auth?next=%2Ffridge%3Ftab%3Dexpired");
  assert.equal(buildAuthRedirectPath("/meal"), "/auth");
  assert.equal(buildAuthRedirectPath("https://example.com/fridge"), "/auth");
});

test("getAuthNextPath reads and sanitizes next from the current URL", () => {
  withWindowHref("https://nyampick.test/auth?next=%2Frecipe%3Ffrom%3Dsaved", () => {
    assert.equal(getAuthNextPath(), "/recipe?from=saved");
    assert.equal(hasAuthNextPath(), true);
  });

  withWindowHref("https://nyampick.test/auth?next=https%3A%2F%2Fevil.test", () => {
    assert.equal(getAuthNextPath(), "/meal");
    assert.equal(hasAuthNextPath(), false);
  });
});
