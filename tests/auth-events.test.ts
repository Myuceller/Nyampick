import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_REQUIRED_EVENT, notifyAuthRequired } from "../src/lib/auth-events.ts";

const originalWindow = globalThis.window;

test("notifyAuthRequired dispatches a browser event with request metadata", () => {
  const dispatchedEvents: Event[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent(event: Event) {
        dispatchedEvents.push(event);
        return true;
      },
    },
  });

  try {
    notifyAuthRequired("/api/fridge/items", 401);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }

  const dispatchedEvent = dispatchedEvents[0] as CustomEvent | undefined;
  assert.ok(dispatchedEvent instanceof CustomEvent);
  assert.equal(dispatchedEvent.type, AUTH_REQUIRED_EVENT);
  assert.deepEqual(dispatchedEvent.detail, {
    status: 401,
    url: "/api/fridge/items",
  });
});

test("notifyAuthRequired is a no-op outside the browser", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: undefined,
  });

  try {
    assert.doesNotThrow(() => notifyAuthRequired("/api/profile", 401));
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});
