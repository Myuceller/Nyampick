let cachedHasSession: boolean | null = null;
let sessionBootstrapPromise: Promise<boolean> | null = null;
const SESSION_CACHE_KEY = "nyampick:has-session";

function readStoredHasSession() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    return null;
  }
  return null;
}

function writeStoredHasSession(next: boolean | null) {
  if (typeof window === "undefined") return;
  try {
    if (next === null) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_CACHE_KEY, String(next));
  } catch {
    // Memory cache still works when browser storage is unavailable.
  }
}

export function getCachedHasSession() {
  if (cachedHasSession === null) {
    cachedHasSession = readStoredHasSession();
  }
  return cachedHasSession;
}

export function setCachedHasSession(next: boolean | null) {
  cachedHasSession = next;
  writeStoredHasSession(next);
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
