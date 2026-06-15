import { NextResponse } from "next/server";
import { verifyEmailVerificationToken } from "@/lib/server/email-verification";
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
    };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const verificationToken =
      typeof body.verificationToken === "string" ? body.verificationToken : "";

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
    const { error } = await supabase.auth.admin.createUser({
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
          { message: "이미 가입된 이메일입니다. 로그인으로 진행해주세요." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회원가입에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
