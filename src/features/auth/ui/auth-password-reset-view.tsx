"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

interface AuthPasswordResetViewProps {
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSetPassword: (value: string) => void;
  onSetConfirmPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthPasswordResetView({
  password,
  confirmPassword,
  isSubmitting,
  errorMessage,
  onSetPassword,
  onSetConfirmPassword,
  onSubmit,
}: AuthPasswordResetViewProps) {
  const [toastMessage, setToastMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!errorMessage) return;
    setToastMessage(errorMessage);
    const timer = window.setTimeout(() => {
      setToastMessage((current) => (current === errorMessage ? "" : current));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#d4ede0] px-[14px] py-[calc(22px+env(safe-area-inset-top))] text-[#1a3a28]">
      <div className="relative min-h-[760px] overflow-hidden rounded-[38px] bg-[#f0faf5] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <header className="sticky top-0 z-10 flex h-[54px] items-center justify-center border-b border-[#b8dfc8] bg-[#f0faf5]/95">
          <h1 className="text-[17px] font-bold leading-[1.55]">비밀번호 재설정</h1>
        </header>

        <div className="px-[18px] pb-7 pt-7">
          <section className="mb-6 flex flex-col items-center justify-center gap-3">
            <div className="relative h-[58px] w-[58px] overflow-hidden rounded-[21px] bg-[#57bf8e] shadow-[0_10px_24px_rgba(87,191,142,0.25)]">
              <Image
                src="/icon_main.png"
                alt=""
                fill
                sizes="58px"
                priority
                className="object-contain p-1"
              />
            </div>
            <p className="text-[22px] font-extrabold leading-[1.32] text-[#57bf8e]">
              냠픽
            </p>
          </section>

          <section className="mb-[18px]">
            <h2 className="text-[28px] font-extrabold leading-[1.28] text-[#1a3a28]">
              새 비밀번호를
              <br />
              입력해주세요
            </h2>
          </section>

          <section className="rounded-[22px] border border-[#d4ede0] bg-white px-4 py-[18px] shadow-[0_2px_12px_rgba(87,191,142,0.08)]">
            <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                >
                  새 비밀번호
                </label>
                <ResetInput
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={onSetPassword}
                  placeholder="영문, 숫자 포함 8자 이상"
                  autoComplete="new-password"
                  rightSlot={
                    <PasswordVisibilityButton
                      visible={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                    />
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="reset-password-confirm"
                  className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                >
                  새 비밀번호 확인
                </label>
                <ResetInput
                  id="reset-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={onSetConfirmPassword}
                  placeholder="비밀번호를 다시 입력해 주세요"
                  autoComplete="new-password"
                  rightSlot={
                    <PasswordVisibilityButton
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                    />
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-[54px] w-full rounded-[17px] bg-[#57bf8e] text-[16px] font-extrabold leading-[1.55] text-white shadow-[0_8px_18px_rgba(87,191,142,0.18)] transition active:scale-[0.99] disabled:bg-[#cfd8d3]"
              >
                {isSubmitting ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          </section>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={
            toastMessage
              ? "pointer-events-none absolute left-1/2 bottom-[160px] z-30 max-w-[calc(100%-44px)] -translate-x-1/2 rounded-full bg-[rgba(26,58,40,0.92)] px-3.5 py-3 text-center text-[13px] font-extrabold leading-[1.45] text-white opacity-100 shadow-[0_10px_26px_rgba(26,58,40,0.22)] transition"
              : "pointer-events-none absolute left-1/2 bottom-[160px] z-30 max-w-[calc(100%-44px)] -translate-x-1/2 translate-y-2 rounded-full bg-[rgba(26,58,40,0.92)] px-3.5 py-3 text-center text-[13px] font-extrabold leading-[1.45] text-white opacity-0 shadow-[0_10px_26px_rgba(26,58,40,0.22)] transition"
          }
          style={{ minWidth: 248 }}
        >
          {toastMessage}
        </p>
      </div>
    </main>
  );
}

function ResetInput({
  id,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
}: {
  id: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="relative w-full">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-[50px] w-full rounded-[15px] border border-[#d4ede0] bg-[#fffdf8] px-[14px] pr-[50px] text-[14px] font-medium leading-[1.55] text-[#1a3a28] outline-none placeholder:text-[#9ab3a5] focus:border-[#57bf8e] focus:bg-white focus:shadow-[0_0_0_4px_rgba(87,191,142,0.14)]"
      />
      {rightSlot ? (
        <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>
      ) : null}
    </div>
  );
}

function PasswordVisibilityButton({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#6b8b7b] transition active:scale-95"
      aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.3} />
    </button>
  );
}
