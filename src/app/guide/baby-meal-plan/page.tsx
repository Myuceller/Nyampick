import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "아기 식단표 짜는 법",
  description:
    "아기 식단표를 처음 만들 때 월령, 재료 반복, 식사 기록을 기준으로 간단하게 정리하는 방법을 소개합니다.",
  alternates: {
    canonical: "/guide/baby-meal-plan",
  },
  openGraph: {
    title: "아기 식단표 짜는 법 | 냠픽",
    description:
      "유아식과 이유식 식단표를 부담 없이 시작할 수 있도록 하루 기록과 일주일 흐름을 정리하는 방법을 확인하세요.",
    url: "/guide/baby-meal-plan",
    type: "article",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽" }],
  },
};

const steps = [
  {
    title: "월령과 현재 식사 횟수부터 적기",
    description:
      "하루에 몇 끼를 먹는지, 간식이 필요한지부터 정하면 식단표 칸 수가 먼저 정리됩니다.",
  },
  {
    title: "새 재료와 익숙한 재료를 나누기",
    description:
      "새 재료는 반응을 보기 쉽게 한 번에 하나씩 넣고, 익숙한 재료는 반복 가능한 기본 메뉴로 둡니다.",
  },
  {
    title: "일주일 전체보다 하루 기록부터 시작하기",
    description:
      "처음부터 완벽한 주간표를 만들기보다 먹은 메뉴와 반응을 하루씩 쌓으면 다음 주 식단이 훨씬 쉬워집니다.",
  },
  {
    title: "먹은 양과 반응을 함께 남기기",
    description:
      "메뉴 이름만 적는 것보다 잘 먹었는지, 거부한 재료가 있었는지를 남겨야 다음 식단표가 실제로 개선됩니다.",
  },
];

export default function BabyMealPlanGuidePage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <section className="pt-10">
        <p className="text-[14px] font-extrabold text-[#2f9569]">Guide</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.25]">
          아기 식단표를
          <br />
          처음 짤 때 보는 기준
        </h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#65716d]">
          아기 식단표는 메뉴를 많이 채우는 것보다, 아이가 먹은 흐름을 다시 확인할 수 있게
          만드는 것이 먼저입니다.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        {steps.map((step) => (
          <article key={step.title} className="border-b border-[#edf1ef] pb-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#57bf8e]" />
              <div>
                <h2 className="text-[18px] font-extrabold">{step.title}</h2>
                <p className="mt-2 text-[15px] leading-[1.7] text-[#65716d]">{step.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-9 rounded-[18px] bg-[#f3f8f4] p-5">
        <h2 className="text-[20px] font-extrabold">냠픽에서 이어서 하기</h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-[#65716d]">
          날짜별 식단 기록을 쌓으면 하루 식사 흐름과 일주일 식단을 함께 보면서 다음 메뉴를
          정하기 쉬워집니다.
        </p>
      </section>

      <RelatedGuides />
    </main>
  );
}

function RelatedGuides() {
  return (
    <section className="mt-10 border-t border-[#edf1ef] pt-8">
      <h2 className="text-[20px] font-extrabold">함께 보면 좋은 가이드</h2>
      <div className="mt-4 space-y-2 text-[15px] font-semibold text-[#4d6b5e]">
        <Link className="block" href="/guide/baby-food-cube-storage">
          이유식 큐브 보관과 정리 방법
        </Link>
        <Link className="block" href="/guide/fridge-ingredient-management">
          냉장고 재료로 유아식 준비하는 법
        </Link>
      </div>
    </section>
  );
}
