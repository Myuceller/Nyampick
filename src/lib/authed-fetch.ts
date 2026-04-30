"use client";

import { notifyAuthRequired } from "@/lib/auth-events";
import { setCachedHasSession } from "@/lib/auth-session-cache";
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
    setCachedHasSession(false);
    return;
  }

  const now = Date.now();
  const expiresAtMs = expiresAtSeconds ? expiresAtSeconds * 1000 - EXPIRY_SAFETY_MS : now + TOKEN_TTL_MS;
  cachedAccessToken = token;
  cachedTokenExpiresAtMs = Math.max(now + 1_000, Math.min(now + TOKEN_TTL_MS, expiresAtMs));
  setCachedHasSession(true);
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

function canReplayRequestBody(body: BodyInit | null | undefined) {
  return !(typeof ReadableStream !== "undefined" && body instanceof ReadableStream);
}

async function resolveAccessToken({ forceRefresh = false } = {}) {
  const cached = getCachedToken();
  if (cached && !forceRefresh) return cached;

  if (tokenRequestPromise) return tokenRequestPromise;

  tokenRequestPromise = (async () => {
    const supabase = getSupabaseBrowser();
    bindAuthCacheInvalidation();

    if (forceRefresh) {
      await supabase.auth.refreshSession().catch(() => {
        // no-op: fallback to the current session lookup below
      });
    }

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

  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401) {
    return response;
  }

  if (!canReplayRequestBody(init?.body)) {
    setTokenCache(null);
    notifyAuthRequired(input, response.status);
    return response;
  }

  setTokenCache(null);
  const refreshedToken = await resolveAccessToken({ forceRefresh: true });
  if (!refreshedToken || refreshedToken === accessToken) {
    notifyAuthRequired(input, response.status);
    return response;
  }

  const retryHeaders = new Headers(init?.headers);
  retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
  const retryResponse = await fetch(input, { ...init, headers: retryHeaders });
  if (retryResponse.status === 401) {
    setTokenCache(null);
    notifyAuthRequired(input, retryResponse.status);
  }

  return retryResponse;
}
