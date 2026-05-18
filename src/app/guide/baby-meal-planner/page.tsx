import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "아이 식단 관리 가이드",
  description:
    "아이 식단 기록, 이유식 재료 관리, 냉장고 기반 AI 레시피 추천을 시작할 때 확인하면 좋은 관리 방법을 정리했습니다.",
  alternates: {
    canonical: "/guide/baby-meal-planner",
  },
  openGraph: {
    title: "아이 식단 관리 가이드 | 냠픽",
    description:
      "아이 식단 기록과 냉장고 재료 기반 유아식 추천을 효율적으로 관리하는 방법을 확인하세요.",
    url: "/guide/baby-meal-planner",
    type: "article",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽" }],
  },
};

const guideItems = [
  {
    title: "식단은 날짜별로 짧게 남기기",
    description:
      "아이의 반응, 먹은 양, 재료를 함께 남기면 다음 메뉴를 고를 때 반복되는 고민을 줄일 수 있습니다.",
  },
  {
    title: "냉장고 재료와 이유식 큐브 분리하기",
    description:
      "바로 쓸 재료와 미리 만들어 둔 큐브를 나누면 식사 준비 시간이 짧아지고 재료 소진 순서를 잡기 쉽습니다.",
  },
  {
    title: "AI 추천은 보호자 확인과 함께 쓰기",
    description:
      "알레르기 가능 재료, 월령, 아이의 최근 반응은 보호자가 최종 확인하고 필요한 경우 전문가 안내를 따르는 것이 좋습니다.",
  },
  {
    title: "출처와 조리 단계를 확인하기",
    description:
      "아이 음식은 재료 조합뿐 아니라 충분히 익히기, 잘게 자르기, 간을 약하게 하기 같은 조리 기준이 중요합니다.",
  },
];

const relatedGuides = [
  { href: "/guide/baby-meal-plan", label: "아기 식단표 짜는 법" },
  { href: "/guide/baby-food-cube-storage", label: "이유식 큐브 보관과 정리 방법" },
  { href: "/guide/fridge-ingredient-management", label: "냉장고 재료로 유아식 준비하는 법" },
];

export default function BabyMealPlannerGuidePage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <section className="pt-10">
        <p className="text-[14px] font-extrabold text-[#2f9569]">Guide</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.25]">
          아이 식단 관리를
          <br />
          더 쉽게 시작하는 방법
        </h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#65716d]">
          이유식과 유아식은 기록, 재료 관리, 조리 기준이 함께 맞아야 꾸준히 관리하기
          쉽습니다. 냠픽은 이 흐름을 모바일에서 한 번에 정리하도록 돕습니다.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        {guideItems.map((item) => (
          <article key={item.title} className="border-b border-[#edf1ef] pb-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#57bf8e]" />
              <div>
                <h2 className="text-[18px] font-extrabold">{item.title}</h2>
                <p className="mt-2 text-[15px] leading-[1.7] text-[#65716d]">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-9 rounded-[18px] bg-[#f3f8f4] p-5">
        <h2 className="text-[20px] font-extrabold">냠픽에서 연결되는 기능</h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-[#65716d]">
          식단 기록, 냉장고 재료 관리, 영수증 스캔, AI 레시피 추천을 같은 데이터 흐름에서
          관리해 아이 식사 준비 과정을 줄입니다.
        </p>
      </section>

      <section className="mt-10 border-t border-[#edf1ef] pt-8">
        <h2 className="text-[20px] font-extrabold">더 자세히 보기</h2>
        <div className="mt-4 space-y-2 text-[15px] font-semibold text-[#4d6b5e]">
          {relatedGuides.map((guide) => (
            <Link key={guide.href} className="block" href={guide.href}>
              {guide.label}
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/auth"
        className="mt-10 flex h-[52px] items-center justify-center rounded-[14px] bg-[#57bf8e] text-[17px] font-extrabold text-white"
      >
        무료로 시작하기
      </Link>
    </main>
  );
}
