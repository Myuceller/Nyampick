"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useMyPage } from "./my-page/use-my-page";

const allergies = ["우유", "달걀"];
const appVersion = "v1.0.0";

function getInitial(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : fallback;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[16px] font-medium text-[#10b98f]">{children}</h2>;
}

function MenuButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full py-3 text-left text-[16px] font-medium text-[#202725]"
    >
      {children}
    </button>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#e5ebe8] ${className}`} />;
}

function MyPageSkeleton() {
  return (
    <>
      <div className="px-5">
        <section className="mt-8">
          <SkeletonBlock className="h-5 w-16 rounded-full" />
          <SkeletonBlock className="mt-5 h-8 w-32" />
        </section>

        <div className="mt-7 h-px bg-[#dfe3e1]" />

        <section className="mt-4">
          <SkeletonBlock className="h-5 w-20 rounded-full" />
          <div className="mt-5 flex items-center gap-4">
            <SkeletonBlock className="h-[65px] w-[65px] rounded-[20px]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-6 w-28" />
                <SkeletonBlock className="h-8 w-11 rounded-full" />
              </div>
              <SkeletonBlock className="mt-2 h-5 w-24" />
            </div>
          </div>
        </section>

        <div className="mt-7 h-px bg-[#dfe3e1]" />

        <section className="mt-4">
          <SkeletonBlock className="h-5 w-24 rounded-full" />
          <SkeletonBlock className="mt-5 h-6 w-44" />
          <SkeletonBlock className="mt-2 h-5 w-20" />
        </section>
      </div>

      <div className="mt-8 h-2 bg-[#f5f6f6]" />

      <section className="px-5 py-6">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex-1">
            <SkeletonBlock className="h-6 w-24" />
            <SkeletonBlock className="mt-2 h-5 w-36" />
          </div>
          <div className="flex shrink-0 -space-x-1">
            <SkeletonBlock className="h-[42px] w-[42px] rounded-full" />
            <SkeletonBlock className="h-[42px] w-[42px] rounded-full" />
          </div>
        </div>
      </section>

      <div className="h-2 bg-[#f5f6f6]" />

      <section className="px-5 py-6">
        <SkeletonBlock className="h-5 w-12 rounded-full" />
        <div className="mt-6 space-y-5">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-5 w-36" />
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-14" />
          </div>
        </div>
      </section>

      <div className="h-2 bg-[#f5f6f6]" />

      <section className="px-5 py-6">
        <SkeletonBlock className="h-5 w-12 rounded-full" />
        <div className="mt-6 space-y-5">
          <SkeletonBlock className="h-5 w-16" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
      </section>
    </>
  );
}

export function MyPage() {
  const vm = useMyPage();
  const router = useRouter();
  const guardianName = vm.profileName.trim() || "보호자";
  const babyName = vm.babyName.trim() || "아기";
  const additionalChildCount = Math.max(0, vm.childCount - 1);
  const familyCount = Math.max(1, vm.familyMemberCount);

  return (
    <main className="flex-1 bg-white pb-12 pt-6">
      <div className="px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#202725] active:bg-[#eef1ef]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[25px] font-extrabold tracking-[-0.02em] text-[#202725]">
            마이페이지
          </h1>
        </div>
      </div>

      {vm.loading ? (
        <MyPageSkeleton />
      ) : (
        <>
          <div className="px-5">

            <section className="mt-8">
              <SectionTitle>보호자</SectionTitle>
              <p className="mt-5 text-[24px] font-extrabold tracking-[-0.02em] text-[#202725]">
                {guardianName}
                <span className="font-medium text-[#8a9490]">님</span>
              </p>
            </section>

            <div className="mt-7 h-px bg-[#dfe3e1]" />

            <section className="mt-4">
              <SectionTitle>아기 관리</SectionTitle>
              <button
                type="button"
                onClick={vm.openFamilyPage}
                className="mt-5 flex w-full items-center gap-4 text-left"
              >
                <div className="relative h-[65px] w-[65px] shrink-0 overflow-hidden rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.10)]">
                  <Image
                    src="/icons/icon-source-baby.png"
                    alt=""
                    fill
                    sizes="65px"
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-[18px] font-extrabold text-[#202725]">
                      {babyName}
                    </p>
                    {additionalChildCount > 0 ? (
                      <span className="rounded-full bg-[#eceeef] px-3 py-1 text-[14px] font-bold text-[#202725]">
                        +{additionalChildCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[16px] font-medium text-[#3b4440]">
                    생후 {vm.babyMonthsOld || "0"}개월
                  </p>
                </div>
              </button>
            </section>

            <div className="mt-7 h-px bg-[#dfe3e1]" />

            <section className="mt-4">
              <SectionTitle>알레르기 관리</SectionTitle>
              <button
                type="button"
                onClick={() => toast.message("알레르기 관리 화면은 준비 중입니다.")}
                className="mt-5 block w-full text-left"
              >
                <p className="text-[18px] font-bold tracking-[-0.02em] text-[#202725]">
                  {babyName}의 알레르기
                </p>
                <p className="mt-2 text-[17px] font-semibold text-[#ff3030]">
                  {allergies.join(", ")}
                </p>
              </button>
            </section>
          </div>

          <div className="mt-8 h-2 bg-[#f5f6f6]" />

          <section className="px-5 py-6">
            <SectionTitle>가족 관리</SectionTitle>
            <button
              type="button"
              onClick={vm.openFamilyPage}
              className="mt-5 flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <p className="text-[18px] font-bold tracking-[-0.02em] text-[#202725]">
                  가족 연동
                </p>
                <p className="mt-2 text-[16px] font-semibold text-[#7c8782]">
                  {familyCount}명이 함께 하고 있어요
                </p>
              </div>
              <div className="flex shrink-0 -space-x-1">
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#d9f3e9] text-[18px] font-bold text-[#111816]">
                  {getInitial(guardianName, "엄")}
                </span>
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#d9f3e9] text-[18px] font-bold text-[#111816]">
                  {getInitial(babyName, "아")}
                </span>
              </div>
            </button>
          </section>

          <div className="h-2 bg-[#f5f6f6]" />

          <section className="px-5 py-6">
            <SectionTitle>지원</SectionTitle>
            <div className="mt-4">
              <MenuButton
                onClick={() => {
                  window.location.href = "mailto:support@nyampick.app";
                }}
              >
                개발팀에게 문의하기
              </MenuButton>
              <MenuButton onClick={() => toast.message("개인정보 처리방침은 준비 중입니다.")}>
                개인정보 처리방침
              </MenuButton>
              <div className="flex items-center justify-between py-3">
                <span className="text-[16px] font-medium text-[#202725]">버전정보</span>
                <span className="text-[16px] font-medium text-[#b0b5b3]">{appVersion}</span>
              </div>
            </div>
          </section>

          <div className="h-2 bg-[#f5f6f6]" />

          <section className="px-5 py-6">
            <SectionTitle>지원</SectionTitle>
            <div className="mt-4">
              <MenuButton
                onClick={() => {
                  void vm.logout();
                }}
              >
                로그아웃
              </MenuButton>
              <MenuButton onClick={() => toast.message("회원탈퇴는 준비 중입니다.")}>
                회원탈퇴
              </MenuButton>
            </div>
          </section>

          {vm.error ? (
            <div className="mx-5 mb-6 rounded-xl border border-[#f0c7c7] bg-[#fff6f6] p-3 text-[13px] text-[#bf5555]">
              {vm.error}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
