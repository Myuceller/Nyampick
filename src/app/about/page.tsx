import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChefHat, Refrigerator } from "lucide-react";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "냠픽은 아이 식단 기록, 냉장고 재료 관리, AI 유아식 레시피 추천을 연결해 매일의 식사 준비를 돕는 모바일 서비스입니다.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "냠픽 서비스 소개",
    description:
      "아이 식단 기록부터 냉장고 재료 기반 AI 레시피 추천까지 한 번에 관리하세요.",
    url: "/about",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽" }],
  },
};

const features = [
  {
    title: "아이 식단 기록",
    description: "아침, 점심, 저녁, 간식을 날짜별로 남기고 일주일 식단 흐름을 확인합니다.",
    icon: CalendarDays,
  },
  {
    title: "냉장고 재료 관리",
    description: "집에 있는 재료와 이유식 큐브를 정리해 중복 구매와 재료 누락을 줄입니다.",
    icon: Refrigerator,
  },
  {
    title: "AI 레시피 추천",
    description: "보유 재료를 바탕으로 아이에게 맞는 유아식과 이유식 아이디어를 제안합니다.",
    icon: ChefHat,
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <section className="pt-10">
        <p className="text-[14px] font-extrabold text-[#2f9569]">Nyampick</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.25]">
          아이 식단과 냉장고를
          <br />
          한 흐름으로 관리해요
        </h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-[#65716d]">
          냠픽은 매일 반복되는 아이 식단 기록, 냉장고 재료 확인, 이유식 메뉴 고민을
          모바일에서 이어주는 식단 관리 서비스입니다.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        {features.map((feature) => (
          <article key={feature.title} className="flex gap-4 rounded-[18px] bg-[#f5f8f6] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#57bf8e]">
              <feature.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold">{feature.title}</h2>
              <p className="mt-1 text-[14px] leading-[1.55] text-[#65716d]">{feature.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10 border-t border-[#edf1ef] pt-8">
        <h2 className="text-[22px] font-extrabold">누구에게 필요한가요?</h2>
        <p className="mt-4 text-[15px] leading-[1.75] text-[#65716d]">
          이유식과 유아식을 준비하면서 식단 기록을 남기고 싶은 보호자, 냉장고 재료를
          기준으로 메뉴를 정하고 싶은 가족, 아이 식사 데이터를 가족과 함께 확인하고 싶은
          사용자에게 맞춰져 있습니다.
        </p>
      </section>

      <Link
        href="/auth"
        className="mt-10 flex h-[52px] items-center justify-center rounded-[14px] bg-[#57bf8e] text-[17px] font-extrabold text-white"
      >
        시작하기
      </Link>
    </main>
  );
}
