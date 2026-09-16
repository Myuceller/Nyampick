import { NextResponse } from "next/server";
import { parseRegistrationConsent, InvalidRegistrationConsentError } from "@/lib/server/registration-consent";
import {
  createOAuthRegistrationAttempt,
  OAuthRegistrationAttemptError,
  parseOAuthRegistrationProvider,
} from "@/lib/server/oauth-registration-attempt";

/** Creates a short-lived opaque signup attempt before redirecting to OAuth. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = parseOAuthRegistrationProvider(body.provider);
    const consent = parseRegistrationConsent(body.consent);
    const attempt = await createOAuthRegistrationAttempt(provider, consent);
    return NextResponse.json({ attemptId: attempt.id });
  } catch (error) {
    if (error instanceof InvalidRegistrationConsentError || error instanceof OAuthRegistrationAttemptError) {
      return NextResponse.json(
        { message: error.message },
        { status: error instanceof OAuthRegistrationAttemptError && error.code === "UNAVAILABLE" ? 503 : 400 }
      );
    }
    return NextResponse.json(
      { message: "소셜 회원가입 정보를 준비하지 못했습니다." },
      { status: 500 }
    );
  }
}
