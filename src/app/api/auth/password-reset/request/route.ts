import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

function getRedirectOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (isLocalOrigin(requestOrigin)) return requestOrigin;

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return requestOrigin;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return requestOrigin;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "이메일 형식을 확인해주세요." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const redirectTo = `${getRedirectOrigin(request)}/auth?reset_password=1`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;

    return NextResponse.json({
      message: "비밀번호 재설정 메일을 보냈어요.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "비밀번호 재설정 메일 발송에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
