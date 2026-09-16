import { NextResponse } from "next/server";
import {
  createEmailVerificationCode,
  EmailVerificationRateLimitError,
  sendVerificationEmail,
} from "@/lib/server/email-verification";
import {
  consumeEmailVerificationRequestLimit,
  EmailVerificationRateLimitStorageError,
  EmailVerificationRequestRateLimitError,
} from "@/lib/server/email-verification-rate-limit";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "이메일 형식을 확인해주세요." }, { status: 400 });
    }
    await consumeEmailVerificationRequestLimit({ email, request });
    const verification = await createEmailVerificationCode(email);
    const emailResult = await sendVerificationEmail(verification);

    return NextResponse.json({
      sent: emailResult.sent,
      message: emailResult.sent ? "인증 안내를 보냈어요." : "개발 모드 인증번호를 발급했어요.",
      devCode: emailResult.devCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "인증 메일 발송에 실패했습니다.";
    if (
      error instanceof EmailVerificationRateLimitError ||
      error instanceof EmailVerificationRequestRateLimitError
    ) {
      return NextResponse.json(
        { message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    if (error instanceof EmailVerificationRateLimitStorageError) {
      return NextResponse.json({ code: "EMAIL_RATE_LIMIT_UNAVAILABLE", message }, { status: 503 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
