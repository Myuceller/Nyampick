import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type AuthMode = "signin" | "signup";
export type ScreenMode = "loading" | "form" | "onboarding";
export type SocialProvider = "google" | "kakao" | null;
export type LoadingPhase =
  | "session"
  | "oauth"
  | "profile"
  | "redirect"
  | "onboarding";

export function getOAuthRedirectTo() {
  if (typeof window === "undefined") return undefined;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = window.location.origin;
  const baseUrl = envAppUrl ? envAppUrl.replace(/\/+$/, "") : origin;
  return `${baseUrl}/auth`;
}

export async function ensureProfileSeeded(accessToken: string) {
  const response = await fetch("/api/profile", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };

    if (response.status === 409 && body.code === "DUPLICATE_EMAIL_ACCOUNT") {
      throw new Error(
        body.message ?? "이미 같은 이메일로 가입된 계정이 있습니다. 기존 로그인 방식을 사용해주세요."
      );
    }

    throw new Error(body.message ?? "프로필 초기화에 실패했습니다.");
  }
}

export function toFriendlyAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  const raw = error.message || "";
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (normalized.includes("email not confirmed")) {
    return "이메일 인증 후 로그인해주세요.";
  }

  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }

  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "네트워크 연결이 불안정합니다. 인터넷 상태를 확인해주세요.";
  }

  if (normalized.includes("unable to exchange external code")) {
    return "소셜 로그인 인증 코드 처리에 실패했습니다. 다시 시도해주세요.";
  }

  if (normalized.includes("duplicate_email_account")) {
    return "이미 같은 이메일로 가입된 계정이 있습니다. 기존 로그인 방식을 사용해주세요.";
  }

  return raw;
}

export function getLoadingPhaseMessage(phase: LoadingPhase) {
  switch (phase) {
    case "oauth":
      return "소셜 로그인 인증을 확인하고 있어요...";
    case "profile":
      return "프로필 정보를 준비하고 있어요...";
    case "redirect":
      return "메인 화면으로 이동하고 있어요...";
    case "onboarding":
      return "시작 설정을 불러오고 있어요...";
    case "session":
    default:
      return "로그인 상태를 확인하고 있어요...";
  }
}

export function getSupabaseOrThrow() {
  return getSupabaseBrowser();
}
