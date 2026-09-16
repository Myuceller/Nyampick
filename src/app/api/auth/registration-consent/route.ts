import { NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest } from "@/lib/server/api-auth";
import {
  InvalidRegistrationConsentError,
  RegistrationConsentStorageError,
  recordRegistrationConsent,
} from "@/lib/server/registration-consent";
import {
  claimOAuthRegistrationAttempt,
  consumeOAuthRegistrationAttempt,
  OAuthRegistrationAttemptError,
  type OAuthRegistrationProvider,
} from "@/lib/server/oauth-registration-attempt";

function getConsentSource(user: { app_metadata?: Record<string, unknown> | null }) {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.some((provider) => provider !== "email")) {
    return "oauth" as const;
  }
  if (typeof user.app_metadata?.provider === "string" && user.app_metadata.provider !== "email") {
    return "oauth" as const;
  }
  return "email" as const;
}

function hasOAuthProvider(
  user: { app_metadata?: Record<string, unknown> | null },
  provider: OAuthRegistrationProvider
) {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes(provider)) return true;
  return user.app_metadata?.provider === provider;
}

/**
 * Completes the consent step after an OAuth provider creates an identity and
 * before that identity can initialize an app profile. The bearer token is the
 * only source of the account id; clients cannot submit an arbitrary user id.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { attemptId?: unknown };
    if (typeof body.attemptId !== "string" || !body.attemptId.trim()) {
      throw new OAuthRegistrationAttemptError();
    }

    const source = getConsentSource(user);
    if (source !== "oauth") throw new OAuthRegistrationAttemptError();
    const providers = (["google", "kakao", "apple"] as const).filter((candidate) => hasOAuthProvider(user, candidate));
    if (providers.length === 0) throw new OAuthRegistrationAttemptError();

    const attempt = await claimOAuthRegistrationAttempt(
      body.attemptId,
      user.id,
      providers
    );
    const record = await recordRegistrationConsent(user, attempt.consent, source);
    await consumeOAuthRegistrationAttempt(attempt.id, user.id);

    return NextResponse.json({ consent: record });
  } catch (error) {
    if (error instanceof InvalidRegistrationConsentError || error instanceof OAuthRegistrationAttemptError) {
      return NextResponse.json(
        { code: "INVALID_REGISTRATION_CONSENT", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof RegistrationConsentStorageError) {
      return NextResponse.json(
        { code: "REGISTRATION_CONSENT_UNAVAILABLE", message: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { message: "회원가입 약관 동의를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
