import { NextResponse } from "next/server";
import { verifyEmailCode } from "@/lib/server/email-verification";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      code?: unknown;
    };
    const email = normalizeEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { message: "이메일과 인증번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const result = await verifyEmailCode(email, code);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "이메일 인증이 완료됐어요.",
      verificationToken: result.token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이메일 인증에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
