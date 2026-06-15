"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { AuthMode, SocialProvider } from "../lib/auth-utils";

interface AuthFormViewProps {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
  verificationToken: string;
  isRequestingVerification: boolean;
  isVerifyingEmail: boolean;
  verificationNotice: string | null;
  devVerificationCode: string | null;
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
  onSetConfirmPassword: (value: string) => void;
  onSetVerificationCode: (value: string) => void;
  onRequestEmailVerification: () => void;
  onVerifyEmailCode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSocialSignIn: (provider: "google" | "kakao") => void;
  onRetryProfileSeed: () => void;
}

type PolicyKey = "service" | "privacy" | "marketing";

const policyContent: Record<PolicyKey, { title: string; sections: Array<{ title: string; body: string }> }> = {
  service: {
    title: "서비스 이용약관",
    sections: [
      {
        title: "제1조 목적",
        body: "이 약관은 냠픽이 제공하는 이유식 식단 기록, 재료 관리, 레시피 추천, 식단표 내보내기 등 서비스의 이용 조건과 절차를 정합니다.",
      },
      {
        title: "제2조 서비스의 제공",
        body: "냠픽은 이유식 식단 기록, 냉장고 재료 관리, 가족 공유, AI 레시피 추천, 식단표 저장 기능을 제공합니다.",
      },
      {
        title: "제3조 의료 정보가 아님",
        body: "서비스의 이유식 정보, 월령별 재료 안내, 알레르기 안내, 레시피 추천은 일반 참고용 정보이며 의료 상담을 대체하지 않습니다.",
      },
      {
        title: "제4조 계정 관리",
        body: "회원은 본인의 계정을 안전하게 관리해야 하며, 계정 도용 또는 제3자 사용이 의심되는 경우 운영자에게 알려야 합니다.",
      },
    ],
  },
  privacy: {
    title: "개인정보 수집 및 이용 동의",
    sections: [
      {
        title: "1. 수집 및 이용 목적",
        body: "냠픽은 회원가입, 로그인, 계정 복구, 식단 기록 저장, 가족 연동, 서비스 문의 대응을 위해 필요한 정보를 처리합니다.",
      },
      {
        title: "2. 처리하는 정보",
        body: "이메일 주소, 소셜 계정 식별값, 보호자 닉네임, 아기 별명, 아기 개월수, 식단 기록, 냉장고 재료, 레시피 저장 내역이 처리될 수 있습니다.",
      },
      {
        title: "3. 보유 기간",
        body: "개인정보는 회원 탈퇴 또는 직접 삭제 시까지 보관되며, 법령상 보관이 필요한 정보는 정해진 기간 동안 보관될 수 있습니다.",
      },
      {
        title: "4. 동의 거부 권리",
        body: "개인정보 수집 및 이용에 동의하지 않을 수 있으나, 필수 정보 처리가 제한되면 회원가입과 서비스 이용이 제한될 수 있습니다.",
      },
    ],
  },
  marketing: {
    title: "광고성 정보 수신 동의",
    sections: [
      {
        title: "1. 수신 목적",
        body: "이벤트, 혜택, 신규 기능, 프로모션, 제휴 안내 등 광고성 정보를 이메일 또는 앱 푸시 등으로 전송할 수 있습니다.",
      },
      {
        title: "2. 동의 철회",
        body: "회원은 언제든지 서비스 내 알림 설정, 이메일 수신거부 링크 또는 고객 문의를 통해 광고성 정보 수신 동의를 철회할 수 있습니다.",
      },
    ],
  },
};

export function AuthFormView({
  mode,
  email,
  password,
  confirmPassword,
  verificationCode,
  verificationToken,
  isRequestingVerification,
  isVerifyingEmail,
  verificationNotice,
  devVerificationCode,
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
  onSetConfirmPassword,
  onSetVerificationCode,
  onRequestEmailVerification,
  onVerifyEmailCode,
  onSubmit,
  onSocialSignIn,
  onRetryProfileSeed,
}: AuthFormViewProps) {
  const isSignin = mode === "signin";
  const [toastMessage, setToastMessage] = useState("");
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<PolicyKey | null>(null);

  const requiredTermsReady = agreeService && agreePrivacy && agreeAge;
  const allTermsChecked = requiredTermsReady && agreeMarketing;
  const loginReady = email.trim().length > 0 && password.trim().length > 0;
  const emailVerified = verificationToken.length > 0;
  const signupReady =
    emailVerified && password.trim().length > 0 && password === confirmPassword && requiredTermsReady;
  const isReady = isSignin ? loginReady : signupReady;

  const activePolicy = openPolicy ? policyContent[openPolicy] : null;

  const submitLabel = useMemo(() => {
    if (isSubmitting) return isSignin ? "로그인 중..." : "가입 중...";
    return isSignin ? "로그인" : "가입하기";
  }, [isSignin, isSubmitting]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? "" : current));
    }, 1800);
  }

  useEffect(() => {
    if (!errorMessage) return;
    showToast(errorMessage);
  }, [errorMessage]);

  function getLocalValidationMessage() {
    if (isSignin) {
      if (!email.trim()) return "이메일을 입력해 주세요.";
      if (!password.trim()) return "비밀번호를 입력해 주세요.";
      return "";
    }

    if (!emailVerified) return "이메일 인증을 완료해 주세요.";
    if (!password.trim()) return "비밀번호를 입력해 주세요.";
    if (password !== confirmPassword) return "비밀번호가 일치하지 않아요.";
    if (!requiredTermsReady) return "필수 약관에 동의해 주세요.";
    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const validationMessage = getLocalValidationMessage();
    if (validationMessage) {
      event.preventDefault();
      showToast(validationMessage);
      return;
    }
    onSubmit(event);
  }

  function toggleAgreeAll(checked: boolean) {
    setAgreeService(checked);
    setAgreePrivacy(checked);
    setAgreeAge(checked);
    setAgreeMarketing(checked);
  }

  function handleSetMode(nextMode: AuthMode) {
    setToastMessage("");
    setOpenPolicy(null);
    onSetMode(nextMode);
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#d4ede0] px-[14px] py-[calc(22px+env(safe-area-inset-top))] text-[#1a3a28]">
      <div className="relative min-h-[760px] overflow-hidden rounded-[38px] bg-[#f0faf5] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <header className="sticky top-0 z-10 flex h-[54px] items-center justify-center border-b border-[#b8dfc8] bg-[#f0faf5]/95">
          <h1 className="text-[17px] font-bold leading-[1.55]">
            {isSignin ? "로그인" : "회원가입"}
          </h1>
        </header>

        <div className={isSignin ? "px-[18px] pb-7 pt-7" : "px-[18px] pb-[34px] pt-6"}>
          <section
            className={
              isSignin
                ? "mb-6 flex flex-col items-center justify-center gap-3"
                : "mb-[26px] flex items-center gap-2.5"
            }
          >
            <div
              className={
                isSignin
                  ? "relative h-[58px] w-[58px] overflow-hidden rounded-[21px] bg-[#57bf8e] shadow-[0_10px_24px_rgba(87,191,142,0.25)]"
                  : "relative h-[42px] w-[42px] overflow-hidden rounded-[15px] bg-[#57bf8e] shadow-[0_8px_18px_rgba(87,191,142,0.25)]"
              }
            >
              <Image
                src="/icon_main.png"
                alt=""
                fill
                sizes={isSignin ? "58px" : "42px"}
                priority
                className="object-contain p-1"
              />
            </div>
            <p
              className={
                isSignin
                  ? "text-[22px] font-extrabold leading-[1.32] text-[#57bf8e]"
                  : "text-[20px] font-extrabold leading-[1.32] text-[#57bf8e]"
              }
            >
              냠픽
            </p>
          </section>

          <section className={isSignin ? "mb-[18px]" : "mb-[22px]"}>
            <h2 className="text-[28px] font-extrabold leading-[1.28] text-[#1a3a28]">
              {isSignin ? (
                <>
                  다시 만나서
                  <br />
                  반가워요
                </>
              ) : (
                <>
                  계정을 만들고
                  <br />
                  기록을 이어가요
                </>
              )}
            </h2>
          </section>

          {isEnvMissing ? (
            <AuthMessage tone="error">
              `.env.local`에 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가해주세요.
            </AuthMessage>
          ) : null}
          {noticeMessage ? <AuthMessage tone="info">{noticeMessage}</AuthMessage> : null}
          {canRetryProfileSeed ? (
            <button
              type="button"
              onClick={onRetryProfileSeed}
              disabled={isBusy}
              className="mb-3 h-11 rounded-[14px] border border-[#b8d6c7] bg-white px-4 text-[14px] font-bold text-[#2f8d68] disabled:opacity-60"
            >
              프로필 준비 다시 시도
            </button>
          ) : null}

          <section className="rounded-[22px] border border-[#d4ede0] bg-white px-4 py-[18px] shadow-[0_2px_12px_rgba(87,191,142,0.08)]">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                >
                  이메일
                </label>
                {isSignin ? (
                  <AuthInput
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={onSetEmail}
                    placeholder="example@email.com"
                    autoComplete="email"
                  />
                ) : (
                  <>
                    <div className="flex gap-2">
                      <AuthInput
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={onSetEmail}
                        placeholder="example@email.com"
                        autoComplete="email"
                      />
                      <button
                        type="button"
                        onClick={onRequestEmailVerification}
                        className="h-[50px] w-[92px] shrink-0 rounded-[15px] bg-[#57bf8e] text-[13px] font-extrabold text-white disabled:bg-[#cfd8d3]"
                        disabled={isBusy || isRequestingVerification}
                      >
                        {isRequestingVerification ? "발송 중" : "인증 요청"}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[12px] font-medium leading-[1.55] text-[#8aa99a]">
                      비밀번호 찾기와 계정 복구에 필요해요.
                    </p>
                    {verificationNotice ? (
                      <p className="mt-2 rounded-[12px] bg-[#e8f5ef] px-2.5 py-[9px] text-[12px] font-bold leading-[1.55] text-[#3fa876]">
                        {verificationNotice}
                        {devVerificationCode ? ` 개발 인증번호: ${devVerificationCode}` : ""}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {!isSignin ? (
                <div>
                  <label
                    htmlFor="auth-code"
                    className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                  >
                    이메일 인증번호
                  </label>
                  <div className="flex gap-2">
                    <AuthInput
                      id="auth-code"
                      type="text"
                      value={verificationCode}
                      onChange={onSetVerificationCode}
                      placeholder="6자리 입력"
                      inputMode="numeric"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={onVerifyEmailCode}
                      disabled={isBusy || isVerifyingEmail || verificationCode.trim().length === 0}
                      className="h-[50px] w-[92px] shrink-0 rounded-[15px] bg-[#e8f5ef] text-[13px] font-extrabold text-[#3fa876] disabled:opacity-60"
                    >
                      {isVerifyingEmail ? "확인 중" : "확인"}
                    </button>
                  </div>
                  <p
                    className={
                      emailVerified
                        ? "mt-1.5 text-[12px] font-medium leading-[1.55] text-[#57bf8e]"
                        : "mt-1.5 text-[12px] font-medium leading-[1.55] text-[#8aa99a]"
                    }
                  >
                    {emailVerified ? "이메일 인증이 완료됐어요." : "아직 이메일 인증 전이에요."}
                  </p>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                >
                  비밀번호
                </label>
                <AuthInput
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={onSetPassword}
                  placeholder={isSignin ? "비밀번호 입력" : "영문, 숫자 포함 8자 이상"}
                  autoComplete={isSignin ? "current-password" : "new-password"}
                />
              </div>

              {!isSignin ? (
                <div>
                  <label
                    htmlFor="auth-password-confirm"
                    className="mb-[7px] block text-[13px] font-bold leading-[1.55] text-[#1a3a28]"
                  >
                    비밀번호 확인
                  </label>
                  <AuthInput
                    id="auth-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={onSetConfirmPassword}
                    placeholder="비밀번호를 다시 입력해 주세요"
                    autoComplete="new-password"
                  />
                </div>
              ) : null}

              {isSignin ? (
                <>
                  <div className="mt-0.5 flex items-center justify-between">
                    <label className="flex items-center gap-[7px] text-[12px] font-bold leading-[1.55] text-[#4a7a60]">
                      <input
                        type="checkbox"
                        className="h-[17px] w-[17px] accent-[#57bf8e]"
                      />
                      로그인 유지
                    </label>
                    <button
                      type="button"
                      onClick={() => showToast("비밀번호 재설정 화면으로 이동해요.")}
                      className="text-[12px] font-extrabold leading-[1.55] text-[#57bf8e]"
                    >
                      비밀번호 찾기
                    </button>
                  </div>

                  <SubmitButton isReady={isReady} isBusy={isBusy} label={submitLabel} />
                </>
              ) : null}

              {!isSignin ? (
                <>
                  <Divider />
                  <SocialButtons
                    isSignin={false}
                    isBusy={isBusy}
                    isSocialSubmitting={isSocialSubmitting}
                    socialProvider={socialProvider}
                    onSocialSignIn={onSocialSignIn}
                    onNaver={() => showToast("네이버 로그인은 준비 중입니다.")}
                  />
                </>
              ) : null}
            </form>

            {isSignin ? (
              <>
                <Divider />
                <SocialButtons
                  isSignin
                  isBusy={isBusy}
                  isSocialSubmitting={isSocialSubmitting}
                  socialProvider={socialProvider}
                  onSocialSignIn={onSocialSignIn}
                  onNaver={() => showToast("네이버 로그인은 준비 중입니다.")}
                />
              </>
            ) : null}
          </section>

          {!isSignin ? (
            <>
              <section className="mt-4 overflow-hidden rounded-[22px] border border-[#d4ede0] bg-white shadow-[0_2px_12px_rgba(87,191,142,0.08)]">
                <div className="border-b border-[#d4ede0] bg-[#e8f5ef] px-4 py-[15px]">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={allTermsChecked}
                      onChange={(event) => toggleAgreeAll(event.target.checked)}
                      className="h-5 w-5 shrink-0 accent-[#57bf8e]"
                    />
                    <span className="text-[14px] font-extrabold leading-[1.55]">
                      약관 전체 동의
                    </span>
                  </label>
                </div>
                <div className="px-4 py-1.5">
                  <TermItem
                    checked={agreeService}
                    onChange={setAgreeService}
                    required
                    label="서비스 이용약관 동의"
                    onView={() => setOpenPolicy("service")}
                  />
                  <TermItem
                    checked={agreePrivacy}
                    onChange={setAgreePrivacy}
                    required
                    label="개인정보 수집 및 이용 동의"
                    onView={() => setOpenPolicy("privacy")}
                  />
                  <TermItem
                    checked={agreeAge}
                    onChange={setAgreeAge}
                    required
                    label="만 14세 이상입니다"
                  />
                  <TermItem
                    checked={agreeMarketing}
                    onChange={setAgreeMarketing}
                    label="광고성 정보 수신 동의"
                    onView={() => setOpenPolicy("marketing")}
                  />
                </div>
              </section>

              <form onSubmit={handleSubmit} className="mt-[18px]">
                <SubmitButton isReady={isReady} isBusy={isBusy} label={submitLabel} />
              </form>
            </>
          ) : null}

          <p className="mt-[18px] text-center text-[13px] font-medium leading-[1.55] text-[#8aa99a]">
            {isSignin ? "아직 계정이 없나요?" : "이미 계정이 있나요?"}{" "}
            <button
              type="button"
              onClick={() => handleSetMode(isSignin ? "signup" : "signin")}
              disabled={isBusy}
              className="font-extrabold text-[#57bf8e] disabled:opacity-60"
            >
              {isSignin ? "회원가입" : "로그인"}
            </button>
          </p>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={
            toastMessage
              ? "pointer-events-none absolute left-1/2 z-30 max-w-[calc(100%-44px)] -translate-x-1/2 rounded-full bg-[rgba(26,58,40,0.92)] px-3.5 py-3 text-center text-[13px] font-extrabold leading-[1.45] text-white opacity-100 shadow-[0_10px_26px_rgba(26,58,40,0.22)] transition"
              : "pointer-events-none absolute left-1/2 z-30 max-w-[calc(100%-44px)] -translate-x-1/2 translate-y-2 rounded-full bg-[rgba(26,58,40,0.92)] px-3.5 py-3 text-center text-[13px] font-extrabold leading-[1.45] text-white opacity-0 shadow-[0_10px_26px_rgba(26,58,40,0.22)] transition"
          }
          style={{ bottom: isSignin ? 198 : 96, minWidth: isSignin ? 230 : 248 }}
        >
          {toastMessage}
        </p>

        {activePolicy ? (
          <div
            className="absolute inset-0 z-40 flex items-end bg-[rgba(26,58,40,0.42)]"
            onClick={() => setOpenPolicy(null)}
          >
            <section
              className="max-h-[90%] w-full overflow-hidden rounded-t-[28px] bg-[#f0faf5] shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-[58px] items-center justify-between border-b border-[#b8dfc8] bg-[#f0faf5]/95 px-[18px]">
                <h2 className="text-[17px] font-extrabold leading-[1.55] text-[#1a3a28]">
                  {activePolicy.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpenPolicy(null)}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#e8f5ef] text-[22px] font-medium leading-none text-[#3fa876]"
                  aria-label="약관 닫기"
                >
                  ×
                </button>
              </div>
              <div className="max-h-[calc(90vh-58px)] overflow-y-auto p-[18px]">
                <div className="rounded-[18px] border border-[#d4ede0] bg-white p-4">
                  <p className="mb-4 text-[12px] font-medium leading-[1.55] text-[#8aa99a]">
                    시행일: 2026.00.00 · 서비스명: 냠픽
                  </p>
                  {activePolicy.sections.map((section) => (
                    <section key={section.title} className="mb-[18px] last:mb-0">
                      <h3 className="mb-2 text-[16px] font-extrabold leading-[1.45] text-[#1a3a28]">
                        {section.title}
                      </h3>
                      <p className="text-[13px] font-medium leading-[1.72] text-[#4a7a60]">
                        {section.body}
                      </p>
                    </section>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function AuthInput({
  id,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: {
  id: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  inputMode?: "numeric";
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      className="h-[50px] w-full rounded-[15px] border border-[#d4ede0] bg-[#fffdf8] px-[14px] text-[14px] font-medium leading-[1.55] text-[#1a3a28] outline-none placeholder:text-[#9ab3a5] focus:border-[#57bf8e] focus:bg-white focus:shadow-[0_0_0_4px_rgba(87,191,142,0.14)]"
    />
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-2.5 text-[12px] font-medium leading-[1.55] text-[#8aa99a] before:h-px before:flex-1 before:bg-[#d4ede0] after:h-px after:flex-1 after:bg-[#d4ede0]">
      또는
    </div>
  );
}

function SubmitButton({ isReady, isBusy, label }: { isReady: boolean; isBusy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={isBusy}
      aria-disabled={!isReady || isBusy}
      className={
        isReady
          ? "h-14 w-full rounded-[18px] bg-[#57bf8e] text-[16px] font-extrabold leading-[1.55] text-white transition active:bg-[#3fa876] disabled:bg-[#cfd8d3]"
          : "h-14 w-full rounded-[18px] bg-[#cfd8d3] text-[16px] font-extrabold leading-[1.55] text-white transition disabled:bg-[#cfd8d3]"
      }
    >
      {label}
    </button>
  );
}

function SocialButtons({
  isSignin,
  isBusy,
  isSocialSubmitting,
  socialProvider,
  onSocialSignIn,
  onNaver,
}: {
  isSignin: boolean;
  isBusy: boolean;
  isSocialSubmitting: boolean;
  socialProvider: SocialProvider;
  onSocialSignIn: (provider: "google" | "kakao") => void;
  onNaver: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center justify-center gap-3" aria-label="소셜 로그인">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSocialSignIn("kakao")}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#d4ede0] bg-white shadow-[0_2px_10px_rgba(87,191,142,0.06)] transition active:scale-[0.96] active:bg-[#f8fffb] disabled:opacity-60"
          aria-label={isSignin ? "카카오로 로그인" : "카카오로 시작하기"}
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#fee500] text-[13px] font-black text-[#191600]">
            {isSocialSubmitting && socialProvider === "kakao" ? "..." : "K"}
          </span>
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSocialSignIn("google")}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#d4ede0] bg-white shadow-[0_2px_10px_rgba(87,191,142,0.06)] transition active:scale-[0.96] active:bg-[#f8fffb] disabled:opacity-60"
          aria-label={isSignin ? "Google로 로그인" : "Google로 시작하기"}
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#d8dde3] bg-white text-[13px] font-black text-[#4285f4]">
            {isSocialSubmitting && socialProvider === "google" ? "..." : "G"}
          </span>
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onNaver}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-[#d4ede0] bg-white shadow-[0_2px_10px_rgba(87,191,142,0.06)] transition active:scale-[0.96] active:bg-[#f8fffb] disabled:opacity-60"
          aria-label={isSignin ? "네이버로 로그인" : "네이버로 시작하기"}
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#03c75a] text-[13px] font-black text-white">
            N
          </span>
        </button>
      </div>
      <p className="text-[12px] font-medium leading-[1.45] text-[#8aa99a]">
        {isSignin ? "소셜 계정으로 로그인" : "소셜 계정으로 간편하게 시작하기"}
      </p>
    </div>
  );
}

function TermItem({
  checked,
  onChange,
  required = false,
  label,
  onView,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  label: string;
  onView?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[#eef5f1] py-[13px] last:border-b-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-[18px] w-[18px] shrink-0 accent-[#57bf8e]"
      />
      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-[1.45] text-[#31513f]">
        <span
          className={
            required
              ? "mr-[3px] font-extrabold text-[#ef7d55]"
              : "mr-[3px] font-extrabold text-[#8aa99a]"
          }
        >
          [{required ? "필수" : "선택"}]
        </span>
        {label}
      </span>
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="py-1.5 pl-1.5 text-[12px] font-extrabold text-[#57bf8e]"
        >
          보기
        </button>
      ) : null}
    </div>
  );
}

function AuthMessage({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p
      className={
        tone === "error"
          ? "mb-3 rounded-[15px] border border-[#f3c8c8] bg-white px-4 py-3 text-[13px] font-bold leading-[1.55] text-[#d34a4a]"
          : "mb-3 rounded-[15px] border border-[#c7e8d8] bg-white px-4 py-3 text-[13px] font-bold leading-[1.55] text-[#2f8d68]"
      }
    >
      {children}
    </p>
  );
}
