import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "이유식 큐브 보관 방법",
  description:
    "이유식 큐브를 만들고 보관할 때 날짜, 재료, 사용 순서를 기준으로 정리하는 방법을 소개합니다.",
  alternates: {
    canonical: "/guide/baby-food-cube-storage",
  },
  openGraph: {
    title: "이유식 큐브 보관 방법 | 냠픽",
    description:
      "이유식 큐브를 날짜와 재료별로 구분하고 먼저 써야 할 재료를 놓치지 않는 정리법을 확인하세요.",
    url: "/guide/baby-food-cube-storage",
    type: "article",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽" }],
  },
};

const steps = [
  {
    title: "만든 날짜와 재료 이름을 같이 적기",
    description:
      "큐브 모양만 보고는 재료를 헷갈리기 쉬워서, 만든 날짜와 재료명을 함께 남기는 편이 안전합니다.",
  },
  {
    title: "바로 쓸 재료와 냉동 큐브를 나누기",
    description:
      "냉장 재료와 냉동 큐브를 한 목록에 섞어 두면 사용 순서가 흐려집니다. 보관 방식부터 분리해 두면 찾기 쉽습니다.",
  },
  {
    title: "먼저 만든 큐브부터 쓰기",
    description:
      "같은 재료가 여러 번 쌓일수록 오래된 큐브가 뒤로 밀리기 쉬워서, 먼저 만든 것부터 확인하는 습관이 필요합니다.",
  },
  {
    title: "아이 반응이 좋지 않았던 재료는 따로 보기",
    description:
      "보관 정보와 식사 기록이 연결되면 다시 쓸지 쉬어 갈지 판단하기가 더 편해집니다.",
  },
];

export default function BabyFoodCubeStorageGuidePage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <section className="pt-10">
        <p className="text-[14px] font-extrabold text-[#2f9569]">Guide</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.25]">
          이유식 큐브를
          <br />
          헷갈리지 않게 보관하기
        </h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#65716d]">
          이유식 큐브는 많이 만들어 두는 것보다, 언제 만들었고 무엇부터 써야 하는지 바로
          알 수 있게 정리하는 것이 더 중요합니다.
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
          냉장고 재료와 이유식 큐브를 나눠 관리하면 남은 재료를 확인하고 메뉴 추천까지
          이어가기 쉽습니다.
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
        <Link className="block" href="/guide/fridge-ingredient-management">
          냉장고 재료로 유아식 준비하는 법
        </Link>
      </div>
    </section>
  );
}
