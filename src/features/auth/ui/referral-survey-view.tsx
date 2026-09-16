"use client";

import Image from "next/image";
import { useState } from "react";
import { Check } from "lucide-react";
import { REFERRAL_OPTIONS, type ReferralSource } from "@/constants/referral";
import { cn } from "@/lib/utils";

interface ReferralSurveyViewProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onComplete: (source: ReferralSource | null) => void;
}

export function ReferralSurveyView({
  errorMessage,
  isSubmitting = false,
  onComplete,
}: ReferralSurveyViewProps) {
  const [selectedSource, setSelectedSource] = useState<ReferralSource | null>(null);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-[#f0faf5] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(34px+env(safe-area-inset-top))] text-[#202725]">
      <section className="flex flex-1 flex-col">
        <div className="mb-7 flex items-center gap-3">
          <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[20px] bg-white shadow-[0_10px_26px_rgba(87,191,142,0.15)]">
            <Image
              src="/icon_main.png"
              alt=""
              fill
              sizes="58px"
              priority
              className="object-contain p-1"
            />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-[1.5] text-[#57bf8e]">마지막 질문</p>
            <h1 className="text-[24px] font-extrabold leading-[1.28] text-[#202725]">
              어느 경로로 이 앱을
              <br />
              알게됐나요?
            </h1>
          </div>
        </div>

        <p className="mb-5 text-[15px] font-medium leading-[1.65] text-[#6f7875]">
          앞으로 어떤 기능과 안내를 먼저 다듬을지
          <br />
          정하는 데 참고할게요.
        </p>

        {errorMessage ? (
          <p className="mb-4 rounded-[15px] border border-[#f3c8c8] bg-white px-4 py-3 text-[13px] font-bold leading-[1.55] text-[#d34a4a]">
            {errorMessage}
          </p>
        ) : null}

        <div className="space-y-3">
          {REFERRAL_OPTIONS.map((option) => {
            const isSelected = selectedSource === option.key;
            return (
              <button
                key={option.key}
                type="button"
                disabled={isSubmitting}
                onClick={() => setSelectedSource(option.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[18px] border px-4 py-4 text-left transition active:scale-[0.99]",
                  isSelected
                    ? "border-[#57bf8e] bg-white shadow-[0_8px_24px_rgba(87,191,142,0.14)]"
                    : "border-[#d8e6df] bg-white/70"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-[#57bf8e] bg-[#57bf8e] text-white"
                      : "border-[#c4d8ce] bg-white text-transparent"
                  )}
                  aria-hidden="true"
                >
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-extrabold leading-[1.45] text-[#202725]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-medium leading-[1.55] text-[#7a8581]">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={() => onComplete(selectedSource)}
          disabled={!selectedSource || isSubmitting}
          className="h-[54px] w-full rounded-[18px] bg-[#57bf8e] text-[17px] font-extrabold text-white shadow-[0_10px_22px_rgba(87,191,142,0.20)] disabled:bg-[#b9dcca] disabled:shadow-none"
        >
          {isSubmitting ? "저장 중..." : "시작하기"}
        </button>
        <button
          type="button"
          onClick={() => onComplete(null)}
          disabled={isSubmitting}
          className="h-11 w-full rounded-[15px] text-[14px] font-bold text-[#7a8581] active:bg-white/70"
        >
          나중에 답할게요
        </button>
      </div>
    </main>
  );
}
