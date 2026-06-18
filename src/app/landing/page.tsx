import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "냠픽 Nyampick - 아이 식단과 냉장고 관리",
  description:
    "냠픽(Nyampick)은 아이 식단 기록, 냉장고 재료 관리, 영수증 스캔, AI 레시피 추천을 한 번에 관리하는 모바일 식단 도우미입니다.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "냠픽 Nyampick - 아이 식단과 냉장고 관리",
    description:
      "냠픽(Nyampick)에서 아기 식단 기록부터 냉장고 재료 관리까지 모바일로 간편하게 정리하세요.",
    url: "/",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽 Nyampick" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "냠픽 Nyampick - 아이 식단과 냉장고 관리",
    description:
      "냠픽(Nyampick)에서 아기 식단 기록부터 냉장고 재료 관리까지 모바일로 간편하게 정리하세요.",
    images: ["/og-image.svg"],
  },
};

const features = [
  {
    title: "식단 기록",
    description: "오늘 식단과 일주일 식단표를 빠르게 확인해요.",
    image: "/landing-motion/calendar.png",
  },
  {
    title: "냉장고 관리",
    description: "재료를 저장하고 이유식 큐브까지 함께 관리해요.",
    image: "/landing-motion/spoon_food.png",
  },
  {
    title: "영수증 스캔",
    description: "장 본 재료를 사진으로 빠르게 추가할 수 있어요.",
    image: "/landing-motion/family.png",
  },
];

const previewMeals = [
  { label: "아침", value: "소고기 미역죽" },
  { label: "점심", value: "닭고기 채소죽" },
  { label: "저녁", value: "단호박 두부죽" },
];

const guides = [
  { href: "/guide/baby-meal-planner", title: "아이 식단 관리 가이드" },
  { href: "/guide/baby-meal-plan", title: "아기 식단표 짜는 법" },
  { href: "/guide/baby-food-cube-storage", title: "이유식 큐브 보관 방법" },
  { href: "/guide/fridge-ingredient-management", title: "냉장고 재료로 유아식 준비하는 법" },
];

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] text-[#202725]">
      <section className="px-5 pb-8 pt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-[12px]">
              <Image
                src="/icon_main.png"
                alt=""
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
            </div>
            <span className="text-[20px] font-extrabold">냠픽</span>
          </div>
          <Link
            href="/auth"
            className="rounded-full border border-[#b7dcca] px-4 py-2 text-[13px] font-bold text-[#2f9569]"
          >
            시작하기
          </Link>
        </div>

        <div className="mt-10">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#e7f4ec] px-3 py-1 text-[13px] font-bold text-[#2f9569]">
            <Sparkles className="h-3.5 w-3.5" />
            이유식 식단 관리
          </div>
          <h1 className="mt-5 text-[36px] font-extrabold leading-[1.25]">
            아이 식단과 냉장고를
            <br />
            한 번에 관리해요
          </h1>
          <p className="mt-4 text-[17px] font-medium leading-[1.6] text-[#6f7875]">
            냠픽은 아기 식단 기록, 냉장고 재료 관리, AI 레시피 추천을 모바일에서 가볍게
            사용할 수 있는 식단 도우미입니다.
          </p>
        </div>

        <div className="mt-8 rounded-[24px] bg-[#f3f8f4] px-5 py-5 shadow-[0_8px_24px_rgba(42,62,52,0.06)]">
          <div className="flex items-center gap-4">
            <div className="relative h-[92px] w-[92px] shrink-0">
              <Image
                src="/landing-motion/baby.png"
                alt=""
                fill
                sizes="92px"
                className="nyam-boing object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[18px] font-extrabold">오늘의 식단</p>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#6f7875]">
                날짜별 아침, 점심, 저녁, 간식을 기록하고 가족과 함께 확인해요.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {previewMeals.map((meal) => (
              <div
                key={meal.label}
                className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2.5"
              >
                <span className="text-[13px] font-bold text-[#57bf8e]">{meal.label}</span>
                <span className="text-[14px] font-semibold text-[#2a312f]">{meal.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/auth"
          className="mt-7 flex h-[54px] w-full items-center justify-center rounded-[14px] bg-[#57bf8e] text-[18px] font-extrabold text-white"
        >
          시작하기
        </Link>
      </section>

      <section className="border-t border-[#edf1ef] px-5 py-8">
        <h2 className="text-[22px] font-extrabold">필요한 것만 가볍게</h2>
        <div className="mt-5 space-y-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4 rounded-[18px] bg-[#f6f7f7] p-4">
              <div className="relative h-12 w-12 shrink-0">
                <Image
                  src={feature.image}
                  alt=""
                  fill
                  sizes="48px"
                  className="nyam-tremble object-contain"
                />
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold">{feature.title}</h3>
                <p className="mt-1 text-[14px] leading-[1.45] text-[#6f7875]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-10">
        <div className="rounded-[22px] bg-[#202725] px-5 py-6 text-white">
          <p className="text-[20px] font-extrabold leading-[1.4]">
            식단 기록이 쌓일수록
            <br />
            추천이 더 쉬워져요
          </p>
          <p className="mt-3 text-[14px] leading-[1.6] text-white/70">
            가족 초대, 레시피 저장, 영수증 기반 재료 추가까지 하나의 흐름으로 연결합니다.
          </p>
          <Link
            href="/auth"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-[12px] bg-white text-[15px] font-extrabold text-[#202725]"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      <section className="border-t border-[#edf1ef] px-5 py-8">
        <h2 className="text-[22px] font-extrabold">아이 식단 가이드</h2>
        <div className="mt-5 space-y-2">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="block rounded-[14px] bg-[#f6f7f7] px-4 py-3 text-[15px] font-semibold text-[#33413d]"
            >
              {guide.title}
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#edf1ef] px-5 py-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-[#65716d]">
          <Link href="/about">서비스 소개</Link>
          <Link href="/guide/baby-meal-planner">아이 식단 관리 가이드</Link>
          <Link href="/privacy">개인정보 처리방침</Link>
          <Link href="/terms">이용약관</Link>
        </nav>
      </footer>
    </main>
  );
}
