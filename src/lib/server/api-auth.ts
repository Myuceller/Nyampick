import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const AUTH_CACHE_TTL_MS = 60_000;
const TOKEN_USER_CACHE = new Map<string, { user: User; expiresAt: number }>();

export class AuthProviderUnavailableError extends Error {
  constructor(message = "auth provider unavailable") {
    super(message);
    this.name = "AuthProviderUnavailableError";
  }
}

function isNetworkAuthErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("enotfound") ||
    m.includes("getaddrinfo") ||
    m.includes("eai_again")
  );
}

function getCachedUser(token: string) {
  const cached = TOKEN_USER_CACHE.get(token);
  if (!cached) return null;
  if (Date.now() >= cached.expiresAt) {
    TOKEN_USER_CACHE.delete(token);
    return null;
  }
  return cached.user;
}

function setCachedUser(token: string, user: User) {
  TOKEN_USER_CACHE.set(token, {
    user,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const cached = getCachedUser(token);
  if (cached) return cached;

  const supabase = getSupabaseAdmin();
  let data: { user: User | null } | null = null;
  let error: { message?: string } | null = null;

  try {
    const result = await supabase.auth.getUser(token);
    data = result.data;
    error = result.error;
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "auth provider unavailable";
    if (isNetworkAuthErrorMessage(message)) {
      throw new AuthProviderUnavailableError(message);
    }
    throw caught;
  }

  if (error) {
    const message = error.message ?? "";
    if (isNetworkAuthErrorMessage(message)) {
      throw new AuthProviderUnavailableError(message);
    }
    return null;
  }
  if (!data?.user) return null;

  setCachedUser(token, data.user);
  return data.user;
}
