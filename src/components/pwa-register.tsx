"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Prevent stale production SW from breaking local dev chunk loading.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(() => caches.keys())
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {
          // no-op
        });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // no-op: registration failure should not break app usage
    });
  }, []);

  return null;
}
