"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";
type ScreenMode = "loading" | "form" | "onboarding";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [screenMode, setScreenMode] = useState<ScreenMode>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isEnvMissing, setIsEnvMissing] = useState(false);

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

    const syncScreenFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      if (!session) {
        setScreenMode("form");
        return;
      }

      const completed = session.user.user_metadata?.onboarding_completed === true;
      if (completed) {
        router.replace("/");
        return;
      }
      setScreenMode("onboarding");
    };

    void syncScreenFromSession();

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setScreenMode("form");
        return;
      }
      if (session.user.user_metadata?.onboarding_completed === true) {
        router.replace("/");
        return;
      }
      setScreenMode("onboarding");
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
      localStorage.setItem("mammanote:onboarding:done", "true");
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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "소셜 로그인에 실패했습니다."
      );
    } finally {
      setIsSocialSubmitting(false);
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
        맘마노트
      </h1>
      <p className="mt-2 text-[16px] text-[#6f7875]">
        {mode === "signin" ? "로그인해서 식단을 관리하세요." : "회원가입 후 바로 시작할 수 있어요."}
      </p>

      <div className="mt-7 grid grid-cols-2 rounded-full bg-[#dce3e0] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`h-10 rounded-full text-[15px] font-semibold ${
            mode === "signin" ? "bg-[#57bf8e] text-white" : "text-[#69726f]"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
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

        {isEnvMissing ? (
          <p className="text-[14px] text-[#d34a4a]">
            `.env.local`에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가해주세요.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="text-[14px] text-[#d34a4a]">{errorMessage}</p>
        ) : null}
        {noticeMessage ? (
          <p className="text-[14px] text-[#4a8d6a]">{noticeMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isSocialSubmitting}
          className="mt-2 h-12 w-full rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting
            ? "처리중..."
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
          disabled={isSubmitting || isSocialSubmitting}
          onClick={() => void signInWithSocial("kakao")}
          className="h-12 w-full rounded-2xl bg-[#fee500] text-[16px] font-semibold text-[#1f2725] disabled:opacity-60"
        >
          카카오톡으로 로그인하기
        </button>
        <button
          type="button"
          disabled={isSubmitting || isSocialSubmitting}
          onClick={() => void signInWithSocial("google")}
          className="h-12 w-full rounded-2xl border border-[#cbd5d1] bg-white text-[16px] font-semibold text-[#1f2725] disabled:opacity-60"
        >
          구글로 로그인하기
        </button>
      </div>
    </main>
  );
}
