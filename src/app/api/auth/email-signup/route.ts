import { NextResponse } from "next/server";
import { verifyEmailVerificationToken } from "@/lib/server/email-verification";
import {
  InvalidRegistrationConsentError,
  RegistrationConsentStorageError,
  parseRegistrationConsent,
  recordRegistrationConsent,
} from "@/lib/server/registration-consent";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
      verificationToken?: unknown;
      consent?: unknown;
    };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const verificationToken =
      typeof body.verificationToken === "string" ? body.verificationToken : "";
    const consent = parseRegistrationConsent(body.consent);

    if (!email || !password || !verificationToken) {
      return NextResponse.json(
        { message: "이메일 인증 후 회원가입을 진행해주세요." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { message: "비밀번호는 8자 이상으로 입력해주세요." },
        { status: 400 }
      );
    }
    if (!verifyEmailVerificationToken(email, verificationToken)) {
      return NextResponse.json(
        { message: "이메일 인증이 만료되었습니다. 다시 인증해주세요." },
        { status: 400 }
      );
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        onboarding_completed: false,
      },
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (normalized.includes("already") || normalized.includes("registered")) {
        return NextResponse.json(
          { message: "계정을 만들 수 없습니다. 로그인 또는 비밀번호 재설정을 이용해주세요." },
          { status: 409 }
        );
      }
      throw error;
    }

    const createdUser = data.user;
    if (!createdUser) {
      throw new Error("회원가입 계정을 만들지 못했습니다.");
    }

    try {
      await recordRegistrationConsent(createdUser, consent, "email");
    } catch (error) {
      // Never leave an email account active when its mandatory consent audit
      // record or trusted server marker could not be written.
      await supabase.auth.admin.deleteUser(createdUser.id).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    if (error instanceof InvalidRegistrationConsentError) {
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
    const message = error instanceof Error ? error.message : "회원가입에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
