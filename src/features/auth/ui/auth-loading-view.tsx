"use client";

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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-[rgb(243,248,244)] px-5 pb-10 pt-14">
      <div className="animate-pulse">
        <div className="h-10 w-24 rounded-full bg-[#d7e1dc]" />
        <div className="mt-3 h-5 w-56 rounded-full bg-[#dfe7e3]" />

        <div className="mt-7 grid grid-cols-2 rounded-full bg-[#dce3e0] p-1">
          <div className="h-10 rounded-full bg-[#cbd5d1]" />
          <div className="h-10 rounded-full bg-transparent" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="h-12 w-full rounded-2xl bg-[#e2e9e5]" />
          <div className="h-12 w-full rounded-2xl bg-[#e2e9e5]" />
          <div className="mt-2 h-12 w-full rounded-2xl bg-[#d2ddd8]" />
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#d2dbd7]" />
          <div className="h-3 w-10 rounded-full bg-[#dce4e0]" />
          <div className="h-px flex-1 bg-[#d2dbd7]" />
        </div>

        <div className="space-y-2.5">
          <div className="h-12 w-full rounded-2xl bg-[#ebd95f]" />
          <div className="h-12 w-full rounded-2xl bg-[#e6ece9]" />
        </div>
      </div>

      <p className="mt-5 text-[14px] text-[#5f6865]">{getLoadingPhaseMessage(loadingPhase)}</p>
      {showLoadingFallback ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="h-10 flex-1 rounded-xl bg-[#57bf8e] px-4 text-[14px] font-semibold text-white"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={onOpenForm}
            className="h-10 flex-1 rounded-xl border border-[#c5cfcb] bg-white px-4 text-[14px] font-semibold text-[#4f5956]"
          >
            로그인 화면으로
          </button>
        </div>
      ) : null}
    </main>
  );
}
