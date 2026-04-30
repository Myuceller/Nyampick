let cachedHasSession: boolean | null = null;
let sessionBootstrapPromise: Promise<boolean> | null = null;

export function getCachedHasSession() {
  return cachedHasSession;
}

export function setCachedHasSession(next: boolean | null) {
  cachedHasSession = next;
}

export async function resolveCachedHasSession(loadSession: () => Promise<boolean>) {
  if (cachedHasSession !== null) return cachedHasSession;
  if (sessionBootstrapPromise) return sessionBootstrapPromise;

  sessionBootstrapPromise = loadSession().then((hasSession) => {
    cachedHasSession = hasSession;
    return hasSession;
  });

  try {
    return await sessionBootstrapPromise;
  } finally {
    sessionBootstrapPromise = null;
  }
}
