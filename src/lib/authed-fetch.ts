"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

const TOKEN_TTL_MS = 15_000;
const EXPIRY_SAFETY_MS = 30_000;

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAtMs = 0;
let tokenRequestPromise: Promise<string | null> | null = null;
let authListenerBound = false;

function setTokenCache(token: string | null, expiresAtSeconds?: number) {
  if (!token) {
    cachedAccessToken = null;
    cachedTokenExpiresAtMs = 0;
    return;
  }

  const now = Date.now();
  const expiresAtMs = expiresAtSeconds ? expiresAtSeconds * 1000 - EXPIRY_SAFETY_MS : now + TOKEN_TTL_MS;
  cachedAccessToken = token;
  cachedTokenExpiresAtMs = Math.max(now + 1_000, Math.min(now + TOKEN_TTL_MS, expiresAtMs));
}

function getCachedToken() {
  if (!cachedAccessToken) return null;
  if (Date.now() >= cachedTokenExpiresAtMs) return null;
  return cachedAccessToken;
}

function bindAuthCacheInvalidation() {
  if (authListenerBound) return;
  authListenerBound = true;

  const supabase = getSupabaseBrowser();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.access_token) {
      setTokenCache(null);
      return;
    }
    setTokenCache(session.access_token, session.expires_at);
  });
}

async function resolveAccessToken() {
  const cached = getCachedToken();
  if (cached) return cached;

  if (tokenRequestPromise) return tokenRequestPromise;

  tokenRequestPromise = (async () => {
    const supabase = getSupabaseBrowser();
    bindAuthCacheInvalidation();

    let { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;

    // In some mobile/PWA flows, getSession can be briefly empty before refresh.
    if (!token) {
      await supabase.auth.refreshSession().catch(() => {
        // no-op: fallback to unauthenticated fetch below
      });
      ({ data } = await supabase.auth.getSession());
      token = data.session?.access_token ?? null;
    }

    setTokenCache(token, data.session?.expires_at);
    return token;
  })();

  try {
    return await tokenRequestPromise;
  } finally {
    tokenRequestPromise = null;
  }
}

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const accessToken = await resolveAccessToken();
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(input, { ...init, headers });
}
