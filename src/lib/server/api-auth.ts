import type { User } from "@supabase/supabase-js";
import { hasCompletedRegistrationOrLegacyProfile } from "@/lib/server/registration-consent";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

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

/**
 * Returns the Supabase identity represented by the bearer token exactly as it
 * was authenticated. Never substitute an id based on email: separate OAuth
 * identities can share an email, and doing so would cross account boundaries.
 */
export async function getAuthenticatedUserFromRequest(
  request: Request
): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

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

  return data.user;
}

/**
 * Normal data APIs require a completed registration. The profile route opts in
 * to pending registrations so it can finish the consented first-login flow.
 * Pre-rollout accounts remain available only when a profile exists for the
 * exact authenticated user id; email is never used as an ownership key.
 */
export async function getUserFromRequest(
  request: Request,
  options?: { allowPendingRegistration?: boolean }
): Promise<User | null> {
  const user = await getAuthenticatedUserFromRequest(request);
  if (!user || options?.allowPendingRegistration) return user;

  return (await hasCompletedRegistrationOrLegacyProfile(user)) ? user : null;
}
