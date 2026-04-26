"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Onboarding } from "@/components/features/onboarding/onboarding";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";
type ScreenMode = "loading" | "form" | "onboarding";
type SocialProvider = "google" | "kakao" | null;

function getOAuthRedirectTo() {
  if (typeof window === "undefined") return undefined;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = window.location.origin;
  // Prefer env-configured app URL; fall back to current origin.
  const baseUrl = envAppUrl ? envAppUrl.replace(/\/+$/, "") : origin;
  return `${baseUrl}/auth`;
}

async function ensureProfileSeeded(accessToken: string) {
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

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [screenMode, setScreenMode] = useState<ScreenMode>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isEnvMissing, setIsEnvMissing] = useState(false);
  const isProcessingCallbackRef = useRef(false);
  const isFinalizingSessionRef = useRef(false);
  const isBusy = isSubmitting || isSocialSubmitting;

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      setIsEnvMissing(true);
      setScreenMode("form");
      return;
    }

    const finalizeSession = async (session: Session | null) => {
      if (!active) return;
      if (!session) {
        setScreenMode("form");
        return;
      }
      if (isFinalizingSessionRef.current) return;
      isFinalizingSessionRef.current = true;

      try {
        await ensureProfileSeeded(session.access_token);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "프로필 초기화 중 오류가 발생했습니다."
          );
          setScreenMode("form");
          await supabase.auth.signOut();
        }
        return;
      } finally {
        isFinalizingSessionRef.current = false;
      }

      if (!active) return;
      if (session.user.user_metadata?.onboarding_completed === true) {
        router.replace("/");
        return;
      }
      setScreenMode("onboarding");
    };

    const syncScreenFromSession = async () => {
      if (typeof window !== "undefined") {
        if (isProcessingCallbackRef.current) return;
        isProcessingCallbackRef.current = true;

        const currentUrl = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        const authCode = currentUrl.searchParams.get("code");
        const oauthError =
          currentUrl.searchParams.get("error_description") ??
          hashParams.get("error_description");

        try {
          // Backward compatibility: if implicit-flow tokens arrive in URL hash,
          // immediately exchange them into client session.
          if (authCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (error && active) {
              setErrorMessage(error.message);
            }
          } else if (hashAccessToken && hashRefreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            if (error && active) {
              setErrorMessage(error.message);
            }
          }
        } finally {
          // Always clear callback params/hash to avoid repeated processing.
          currentUrl.searchParams.delete("code");
          currentUrl.searchParams.delete("state");
          currentUrl.searchParams.delete("error");
          currentUrl.searchParams.delete("error_code");
          currentUrl.searchParams.delete("error_description");
          currentUrl.searchParams.delete("provider_token");
          currentUrl.searchParams.delete("provider_refresh_token");
          currentUrl.searchParams.delete("refresh_token");
          currentUrl.searchParams.delete("access_token");
          currentUrl.searchParams.delete("expires_in");
          currentUrl.searchParams.delete("expires_at");
          currentUrl.searchParams.delete("token_type");
          currentUrl.searchParams.delete("sb");

          const nextSearch = currentUrl.searchParams.toString();
          window.history.replaceState(
            {},
            "",
            `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}`
          );
          isProcessingCallbackRef.current = false;
        }

        if (oauthError && active) {
          setErrorMessage(decodeURIComponent(oauthError.replace(/\+/g, " ")));
        }
      }

      const { data } = await supabase.auth.getSession();
      await finalizeSession(data.session);
    };

    void syncScreenFromSession();

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      void finalizeSession(session);
    });

    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            onboarding_completed: false,
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        setNoticeMessage(
          "회원가입이 완료되었습니다. 이메일 인증 후 다시 로그인해주세요."
        );
        setMode("signin");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "인증 처리에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });
      if (error) throw error;
      localStorage.setItem("nyampick:onboarding:done", "true");
      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "온보딩 완료 처리에 실패했습니다."
      );
    }
  };

  const signInWithSocial = async (provider: "google" | "kakao") => {
    setErrorMessage(null);
    setNoticeMessage(null);

    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }

    try {
      setIsSocialSubmitting(true);
      setSocialProvider(provider);
      const redirectTo = getOAuthRedirectTo();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams:
            provider === "kakao"
              ? {
                  scope: "profile_nickname profile_image account_email",
                }
              : undefined,
        },
      });

      if (error) throw error;

      // Some mobile/in-app browsers do not always auto-redirect reliably.
      // Force navigation when URL is provided to avoid "stuck" state.
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      if (
        provider === "kakao" &&
        error instanceof Error &&
        (error.message.includes("KOE205") || error.message.includes("동의 항목"))
      ) {
        setErrorMessage(
          "카카오 동의항목 설정 문제입니다. Supabase Kakao provider의 scope에서 account_email을 제거하거나 Kakao 동의항목에서 이메일을 활성화해주세요."
        );
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : "소셜 로그인에 실패했습니다."
      );
    } finally {
      setIsSocialSubmitting(false);
      setSocialProvider(null);
    }
  };

  if (screenMode === "loading") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center bg-[rgb(243,248,244)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b8c5bf] border-t-[#57bf8e]" />
      </main>
    );
  }

  if (screenMode === "onboarding") {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-[rgb(243,248,244)] px-5 pb-10 pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#1f2725]">
        냠픽
      </h1>
      <p className="mt-2 text-[16px] text-[#6f7875]">
        {mode === "signin" ? "로그인해서 식단을 관리하세요." : "회원가입 후 바로 시작할 수 있어요."}
      </p>

      {isEnvMissing ? (
        <div className="mt-5 text-[14px] text-[#d34a4a]">
          `.env.local`에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가해주세요.
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-5 text-[14px] text-[#d34a4a]">{errorMessage}</p>
      ) : null}

      {noticeMessage ? (
        <p className="mt-5 text-[14px] text-[#4a8d6a]">{noticeMessage}</p>
      ) : null}

      <div className="mt-7 grid grid-cols-2 rounded-full bg-[#dce3e0] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          disabled={isBusy}
          className={`h-10 rounded-full text-[15px] font-semibold ${
            mode === "signin" ? "bg-[#57bf8e] text-white" : "text-[#69726f]"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          disabled={isBusy}
          className={`h-10 rounded-full text-[15px] font-semibold ${
            mode === "signup" ? "bg-[#57bf8e] text-white" : "text-[#69726f]"
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          className="h-12 w-full rounded-2xl border border-[#cbd5d1] bg-[#f7faf8] px-4 text-[16px] text-[#232a28] outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          className="h-12 w-full rounded-2xl border border-[#cbd5d1] bg-[#f7faf8] px-4 text-[16px] text-[#232a28] outline-none"
        />

        <button
          type="submit"
          disabled={isBusy}
          className="mt-2 h-12 w-full rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "signin"
              ? "로그인 중..."
              : "회원가입 중..."
            : mode === "signin"
              ? "로그인"
              : "회원가입"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#d2dbd7]" />
        <span className="text-[13px] text-[#7a8581]">또는</span>
        <div className="h-px flex-1 bg-[#d2dbd7]" />
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void signInWithSocial("kakao")}
          className="h-12 w-full rounded-2xl bg-[#fee500] text-[16px] font-semibold text-[#1f2725] disabled:opacity-60"
        >
          {isSocialSubmitting && socialProvider === "kakao"
            ? "카카오 연결 중..."
            : "카카오톡으로 로그인하기"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void signInWithSocial("google")}
          className="h-12 w-full rounded-2xl border border-[#cbd5d1] bg-white text-[16px] font-semibold text-[#1f2725] disabled:opacity-60"
        >
          {isSocialSubmitting && socialProvider === "google"
            ? "구글 연결 중..."
            : "구글로 로그인하기"}
        </button>
      </div>
    </main>
  );
}
