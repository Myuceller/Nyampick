import { getAuthNextPath } from "../../../lib/auth-redirect";
export { validateAuthForm } from "./auth-form-validation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type AuthMode = "signin" | "signup";
export type ScreenMode = "loading" | "form" | "onboarding" | "referral" | "password-reset";
export type SocialProvider = "google" | "kakao" | null;
export type LoadingPhase =
  | "session"
  | "oauth"
  | "profile"
  | "redirect"
  | "onboarding";
export type OAuthSocialProvider = "google" | "kakao";

const AUTH_CALLBACK_KEYS = [
  "code",
  "state",
  "error",
  "error_code",
  "error_description",
  "provider_token",
  "provider_refresh_token",
  "refresh_token",
  "access_token",
  "expires_in",
  "expires_at",
  "token_type",
  "type",
  "reset_password",
  "sb",
  "social_provider",
] as const;

const SOCIAL_PROVIDER_PARAM = "social_provider";
const AUTH_CODE_EXCHANGE_LOCK_PREFIX = "nyampick:auth-code-exchange:";
const AUTH_CODE_EXCHANGE_LOCK_TTL_MS = 15_000;

export interface AuthCallbackParams {
  authCode: string | null;
  hashAccessToken: string | null;
  hashRefreshToken: string | null;
  oauthError: string | null;
  isPasswordRecovery: boolean;
  hasCallback: boolean;
}

export class RecoverableProfileSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoverableProfileSeedError";
  }
}

export class FatalProfileSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalProfileSeedError";
  }
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
    if (hostname === "127.0.0.1" || hostname === "0.0.0.0") return true;
    if (hostname.startsWith("10.")) return true;
    if (hostname.startsWith("192.168.")) return true;
    const private172Match = hostname.match(/^172\.(\d{1,2})\./);
    if (private172Match) {
      const secondOctet = Number(private172Match[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }
    return false;
  } catch {
    return false;
  }
}

function getConfiguredAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

function getCurrentOrigin() {
  if (typeof window === "undefined") return null;
  return window.location.origin;
}

function getOAuthOrigin() {
  const currentOrigin = getCurrentOrigin();
  if (!currentOrigin) return undefined;
  if (isLocalOrigin(currentOrigin)) return currentOrigin;

  const currentHost = window.location.hostname;
  if (currentHost === "nyampick.kr" || currentHost.endsWith(".nyampick.kr")) {
    return currentOrigin;
  }

  return getConfiguredAppOrigin() ?? currentOrigin;
}

export function getCanonicalSocialAuthUrl(provider: OAuthSocialProvider) {
  const currentOrigin = getCurrentOrigin();
  const oauthOrigin = getOAuthOrigin();
  if (!currentOrigin || !oauthOrigin || currentOrigin === oauthOrigin) return null;

  const nextPath = getAuthNextPath();
  const authUrl = new URL("/auth", oauthOrigin);
  if (nextPath !== "/") {
    authUrl.searchParams.set("next", nextPath);
  }
  authUrl.searchParams.set(SOCIAL_PROVIDER_PARAM, provider);
  return authUrl.toString();
}

export function readSocialProviderParam(): OAuthSocialProvider | null {
  if (typeof window === "undefined") return null;
  const provider = new URL(window.location.href).searchParams.get(SOCIAL_PROVIDER_PARAM);
  return provider === "google" || provider === "kakao" ? provider : null;
}

export function clearSocialProviderParam() {
  if (typeof window === "undefined") return;
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete(SOCIAL_PROVIDER_PARAM);
  const nextSearch = currentUrl.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}`
  );
}

export function getOAuthRedirectTo() {
  if (typeof window === "undefined") return undefined;
  const nextPath = getAuthNextPath();
  const redirectUrl = new URL("/auth", window.location.origin);
  if (nextPath !== "/") {
    redirectUrl.searchParams.set("next", nextPath);
  }
  return redirectUrl.toString();
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
      throw new FatalProfileSeedError(
        body.message ?? "이미 가입된 이메일입니다."
      );
    }

    if (response.status === 400 && body.code === "KAKAO_EMAIL_REQUIRED") {
      throw new FatalProfileSeedError(
        body.message ?? "카카오 계정에서 이메일 제공에 동의해 주세요."
      );
    }

    const message = body.message ?? "프로필 초기화에 실패했습니다.";
    if (response.status >= 500 || response.status === 429) {
      throw new RecoverableProfileSeedError(message);
    }

    throw new FatalProfileSeedError(message);
  }
}

export function readAuthCallbackParams(): AuthCallbackParams {
  const currentUrl = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authCode = currentUrl.searchParams.get("code");
  const hashAccessToken = hashParams.get("access_token");
  const hashRefreshToken = hashParams.get("refresh_token");
  const hashType = hashParams.get("type");
  const isPasswordRecovery =
    currentUrl.searchParams.get("reset_password") === "1" || hashType === "recovery";
  const oauthError =
    currentUrl.searchParams.get("error_description") ??
    hashParams.get("error_description");

  return {
    authCode,
    hashAccessToken,
    hashRefreshToken,
    oauthError,
    isPasswordRecovery,
    hasCallback: Boolean(authCode || hashAccessToken || hashRefreshToken || oauthError),
  };
}

export function clearAuthCallbackParams() {
  const currentUrl = new URL(window.location.href);
  for (const key of AUTH_CALLBACK_KEYS) {
    currentUrl.searchParams.delete(key);
  }

  const nextSearch = currentUrl.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}`
  );
}

export function claimAuthCodeExchange(authCode: string) {
  if (typeof window === "undefined") return true;

  const storageKey = `${AUTH_CODE_EXCHANGE_LOCK_PREFIX}${authCode}`;
  const now = Date.now();
  const storedValue = window.sessionStorage.getItem(storageKey);
  const startedAt = storedValue ? Number(storedValue) : 0;

  if (
    Number.isFinite(startedAt) &&
    startedAt > 0 &&
    now - startedAt < AUTH_CODE_EXCHANGE_LOCK_TTL_MS
  ) {
    return false;
  }

  window.sessionStorage.setItem(storageKey, String(now));
  return true;
}

export function releaseAuthCodeExchange(authCode: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`${AUTH_CODE_EXCHANGE_LOCK_PREFIX}${authCode}`);
}

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
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

  if (normalized.includes("user already registered")) {
    return "이미 가입된 이메일입니다.";
  }

  if (normalized.includes("password should be at least")) {
    return "비밀번호는 8자 이상으로 입력해주세요.";
  }

  if (normalized.includes("signup is disabled")) {
    return "현재 회원가입이 비활성화되어 있습니다.";
  }

  if (normalized.includes("email rate limit")) {
    return "이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }

  if (normalized.includes("oauth state") || normalized.includes("state mismatch")) {
    return "소셜 로그인 상태 확인에 실패했습니다. 다시 시도해주세요.";
  }

  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }

  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "네트워크 연결이 불안정합니다. 인터넷 상태를 확인해주세요.";
  }

  if (normalized.includes("unable to exchange external code")) {
    if (normalized.includes("code verifier") || normalized.includes("pkce")) {
      return "소셜 로그인 세션 확인에 실패했습니다. 같은 브라우저에서 다시 로그인해주세요.";
    }
    return "소셜 로그인 인증 코드 처리에 실패했습니다. 다시 시도해주세요.";
  }

  if (normalized.includes("code verifier") || normalized.includes("pkce")) {
    return "소셜 로그인 세션 확인에 실패했습니다. 같은 브라우저에서 다시 로그인해주세요.";
  }

  if (normalized.includes("duplicate_email_account")) {
    return "이미 가입된 이메일입니다.";
  }

  if (
    normalized.includes("kakao_email_required") ||
    raw.includes("카카오 계정에서 이메일 제공")
  ) {
    return "카카오 계정에서 이메일 제공에 동의해 주세요.";
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
