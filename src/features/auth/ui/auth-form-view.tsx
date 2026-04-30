"use client";

import type { FormEvent } from "react";
import type { AuthMode, SocialProvider } from "../lib/auth-utils";

interface AuthFormViewProps {
  mode: AuthMode;
  email: string;
  password: string;
  isBusy: boolean;
  isSubmitting: boolean;
  isSocialSubmitting: boolean;
  socialProvider: SocialProvider;
  isEnvMissing: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  canRetryProfileSeed: boolean;
  onSetMode: (mode: AuthMode) => void;
  onSetEmail: (value: string) => void;
  onSetPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSocialSignIn: (provider: "google" | "kakao") => void;
  onRetryProfileSeed: () => void;
}

export function AuthFormView({
  mode,
  email,
  password,
  isBusy,
  isSubmitting,
  isSocialSubmitting,
  socialProvider,
  isEnvMissing,
  errorMessage,
  noticeMessage,
  canRetryProfileSeed,
  onSetMode,
  onSetEmail,
  onSetPassword,
  onSubmit,
  onSocialSignIn,
  onRetryProfileSeed,
}: AuthFormViewProps) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-[rgb(243,248,244)] px-5 pb-10 pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.02em] text-[#1f2725]">냠픽</h1>
      <p className="mt-2 text-[16px] text-[#6f7875]">
        {mode === "signin" ? "로그인해서 식단을 관리하세요." : "회원가입 후 바로 시작할 수 있어요."}
      </p>

      {isEnvMissing ? (
        <div className="mt-5 text-[14px] text-[#d34a4a]">
          `.env.local`에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가해주세요.
        </div>
      ) : null}

      {errorMessage ? <p className="mt-5 text-[14px] text-[#d34a4a]">{errorMessage}</p> : null}
      {canRetryProfileSeed ? (
        <button
          type="button"
          onClick={onRetryProfileSeed}
          disabled={isBusy}
          className="mt-3 h-10 rounded-xl border border-[#b8d6c7] bg-white px-4 text-[14px] font-semibold text-[#2f8d68] disabled:opacity-60"
        >
          프로필 준비 다시 시도
        </button>
      ) : null}
      {noticeMessage ? <p className="mt-5 text-[14px] text-[#4a8d6a]">{noticeMessage}</p> : null}

      <div className="mt-7 grid grid-cols-2 rounded-full bg-[#dce3e0] p-1">
        <button
          type="button"
          onClick={() => onSetMode("signin")}
          disabled={isBusy}
          className={`h-10 rounded-full text-[15px] font-semibold ${
            mode === "signin" ? "bg-[#57bf8e] text-white" : "text-[#69726f]"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => onSetMode("signup")}
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
          onChange={(event) => onSetEmail(event.target.value)}
          placeholder="이메일"
          className="h-12 w-full rounded-2xl border border-[#cbd5d1] bg-[#f7faf8] px-4 text-[16px] text-[#232a28] outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => onSetPassword(event.target.value)}
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
          onClick={() => onSocialSignIn("kakao")}
          className="h-12 w-full rounded-2xl bg-[#fee500] text-[16px] font-semibold text-[#1f2725] disabled:opacity-60"
        >
          {isSocialSubmitting && socialProvider === "kakao"
            ? "카카오 연결 중..."
            : "카카오톡으로 로그인하기"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSocialSignIn("google")}
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
