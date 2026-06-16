"use client";

import Image from "next/image";
import { getLoadingPhaseMessage, LoadingPhase } from "../lib/auth-utils";

interface AuthLoadingViewProps {
  loadingPhase: LoadingPhase;
  showLoadingFallback: boolean;
  onRetry: () => void;
  onOpenForm: () => void;
}

export function AuthLoadingView({
  loadingPhase,
  showLoadingFallback,
  onRetry,
  onOpenForm,
}: AuthLoadingViewProps) {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#d4ede0] px-3 py-[calc(14px+env(safe-area-inset-top))] text-[#1a3a28]">
      <div className="min-h-[760px] overflow-hidden rounded-[38px] bg-[#f0faf5] shadow-[0_24px_80px_rgba(0,0,0,0.14)]">
        <header className="sticky top-0 z-10 flex h-[54px] items-center justify-center border-b border-[#b8dfc8] bg-[#f0faf5]/95">
          <h1 className="text-[17px] font-bold leading-[1.55]">로그인</h1>
        </header>

        <div className="px-[18px] pb-[calc(34px+env(safe-area-inset-bottom))] pt-6">
          <section className="mb-6 flex flex-col items-center gap-3">
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
              계정 상태를
              <br />
              확인하고 있어요
            </h2>
            <p className="mt-2 text-[14px] font-medium leading-[1.6] text-[#3fa876]">
              잠시만 기다리면 바로 이어서 사용할 수 있어요.
            </p>
          </section>

          <section className="rounded-[22px] border border-[#d4ede0] bg-white px-4 py-[18px] shadow-[0_2px_12px_rgba(87,191,142,0.08)]">
            <div className="animate-pulse space-y-3.5">
              <div>
                <div className="mb-[7px] h-5 w-12 rounded-full bg-[#d9eadf]" />
                <div className="h-[50px] w-full rounded-[15px] border border-[#d4ede0] bg-[#fffdf8]" />
              </div>
              <div>
                <div className="mb-[7px] h-5 w-16 rounded-full bg-[#d9eadf]" />
                <div className="h-[50px] w-full rounded-[15px] border border-[#d4ede0] bg-[#fffdf8]" />
              </div>
              <div className="h-14 w-full rounded-[18px] bg-[#b7dfcd]" />

              <div className="my-5 flex items-center gap-2.5">
                <div className="h-px flex-1 bg-[#d4ede0]" />
                <div className="h-4 w-8 rounded-full bg-[#d9eadf]" />
                <div className="h-px flex-1 bg-[#d4ede0]" />
              </div>

              <div className="flex justify-center gap-3">
                <div className="h-[52px] w-[52px] rounded-[18px] border border-[#d4ede0] bg-white" />
                <div className="h-[52px] w-[52px] rounded-[18px] border border-[#d4ede0] bg-white" />
              </div>
            </div>
          </section>

          <p className="mt-4 rounded-[15px] border border-[#c7e8d8] bg-white px-4 py-3 text-[13px] font-bold leading-[1.55] text-[#2f8d68]">
            {getLoadingPhaseMessage(loadingPhase)}
          </p>

          {showLoadingFallback ? (
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="h-11 flex-1 rounded-[15px] bg-[#57bf8e] px-4 text-[14px] font-extrabold text-white"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={onOpenForm}
                className="h-11 flex-1 rounded-[15px] border border-[#d4ede0] bg-white px-4 text-[14px] font-extrabold text-[#2f8d68]"
              >
                로그인 화면
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
