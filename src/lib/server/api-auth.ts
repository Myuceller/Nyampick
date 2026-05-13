import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const AUTH_CACHE_TTL_MS = 60_000;
const TOKEN_USER_CACHE = new Map<string, { user: User; expiresAt: number }>();
const EMAIL_CANONICAL_CACHE = new Map<string, { userId: string; expiresAt: number }>();

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

function readEmailFromUser(user: User): string | undefined {
  const direct = user.email?.trim().toLowerCase();
  if (direct) return direct;

  const metadata = user.user_metadata as
    | Record<string, unknown>
    | undefined;
  const fromMetadata = metadata?.email;
  if (typeof fromMetadata === "string" && fromMetadata.trim().length > 0) {
    return fromMetadata.trim().toLowerCase();
  }

  const kakaoAccount = metadata?.kakao_account as
    | Record<string, unknown>
    | undefined;
  const kakaoEmail = kakaoAccount?.email;
  if (typeof kakaoEmail === "string" && kakaoEmail.trim().length > 0) {
    return kakaoEmail.trim().toLowerCase();
  }

  return undefined;
}

async function resolveCanonicalUserIdByEmail(
  user: User
): Promise<string> {
  const email = readEmailFromUser(user);
  if (!email) return user.id;

  const cached = EMAIL_CANONICAL_CACHE.get(email);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.userId;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profile")
    .select("id")
    .ilike("email", email)
    .order("id", { ascending: true })
    .limit(1);
  if (error) throw error;

  const rows = data as Array<{ id: string }> | null;
  const canonical = rows?.[0]?.id ?? user.id;
  EMAIL_CANONICAL_CACHE.set(email, {
    userId: canonical,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
  return canonical;
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

  const canonicalUserId = await resolveCanonicalUserIdByEmail(data.user);
  const effectiveUser =
    canonicalUserId === data.user.id
      ? data.user
      : ({ ...data.user, id: canonicalUserId } as User);

  setCachedUser(token, effectiveUser);
  return effectiveUser;
}
