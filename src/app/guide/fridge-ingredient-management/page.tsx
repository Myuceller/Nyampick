import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "냉장고 재료로 유아식 준비하는 법",
  description:
    "냉장고 재료를 기준으로 유아식 메뉴를 정할 때 재료 확인, 소진 순서, 반복 메뉴를 정리하는 방법을 소개합니다.",
  alternates: {
    canonical: "/guide/fridge-ingredient-management",
  },
  openGraph: {
    title: "냉장고 재료로 유아식 준비하는 법 | 냠픽",
    description:
      "집에 있는 재료를 먼저 확인하고 오래된 재료부터 쓰면서 유아식 메뉴를 정리하는 방법을 확인하세요.",
    url: "/guide/fridge-ingredient-management",
    type: "article",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽" }],
  },
};

const steps = [
  {
    title: "집에 있는 재료부터 먼저 보기",
    description:
      "메뉴를 먼저 정하면 다시 장을 보게 되기 쉽습니다. 냉장고에 있는 재료를 먼저 보면 선택지가 줄어듭니다.",
  },
  {
    title: "먼저 써야 할 재료를 앞에 두기",
    description:
      "오래된 채소나 이미 손질한 재료부터 메뉴에 넣으면 버리는 양을 줄이고 식사 준비도 빨라집니다.",
  },
  {
    title: "반복 가능한 기본 조합 만들기",
    description:
      "단백질 하나, 채소 두 가지처럼 익숙한 조합을 정해두면 매번 처음부터 메뉴를 고민하지 않아도 됩니다.",
  },
  {
    title: "없는 재료보다 있는 재료로 추천받기",
    description:
      "보유 재료 기준으로 레시피를 보면 장보기 부담이 줄고, 실제로 만들 가능성도 높아집니다.",
  },
];

export default function FridgeIngredientManagementGuidePage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <section className="pt-10">
        <p className="text-[14px] font-extrabold text-[#2f9569]">Guide</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.25]">
          냉장고 재료로
          <br />
          유아식 메뉴 정하기
        </h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#65716d]">
          유아식 준비는 메뉴 검색보다 재료 확인에서 시작하면 훨씬 단순해집니다. 집에 있는
          재료를 기준으로 고르면 장보기와 음식물 낭비를 함께 줄일 수 있습니다.
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
          냉장고에 등록한 재료를 바탕으로 레시피 추천을 보면, 지금 만들 수 있는 메뉴를 더
          빠르게 고를 수 있습니다.
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
        <Link className="block" href="/guide/baby-meal-plan">
          아기 식단표 짜는 법
        </Link>
        <Link className="block" href="/guide/baby-food-cube-storage">
          이유식 큐브 보관과 정리 방법
        </Link>
      </div>
    </section>
  );
}
