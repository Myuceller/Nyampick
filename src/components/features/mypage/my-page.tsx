"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, X } from "lucide-react";
import { useMyPage } from "./my-page/use-my-page";

const appVersion = "v1.0.0";

function getInitial(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : fallback;
}

function PhotoCircle({
  fallback,
  imageUrl,
  className,
}: {
  fallback: string;
  imageUrl?: string;
  className: string;
}) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden bg-[#d9f3e9] font-bold text-[#111816] ${className}`}
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {imageUrl ? null : fallback}
    </span>
  );
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const guardianName = vm.profileName.trim() || "보호자";
  const babyName = vm.babyName.trim() || "아기";
  const additionalChildCount = Math.max(0, vm.childCount - 1);
  const familyCount = vm.familyMemberCount;
  const familyAvatars = vm.familyAvatars.slice(0, 3);

  return (
    <main className="flex-1 bg-white pb-12">
      <div className="sticky top-0 z-30 border-b border-[#edf0ef] bg-white px-5 pb-4 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#202725] active:bg-[#eef1ef]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="py-0.5 text-[24px] font-bold leading-[1.32] text-[#202725]">
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
              <button
                type="button"
                onClick={vm.openGuardianProfilePage}
                className="mt-5 block w-full text-left text-[20px] font-semibold leading-[1.32] text-[#202725]"
              >
                {guardianName}
                <span className="font-medium text-[#8a9490]">님</span>
              </button>
            </section>

            <div className="mt-7 h-px bg-[#dfe3e1]" />

            <section className="mt-4">
              <SectionTitle>아기 관리</SectionTitle>
              <button
                type="button"
                onClick={vm.openChildrenPage}
                className="mt-5 flex w-full items-center gap-4 text-left"
              >
                <div className="relative h-[65px] w-[65px] shrink-0 overflow-hidden rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.10)]">
                  {vm.babyPhotoUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${vm.babyPhotoUrl})` }}
                    />
                  ) : (
                    <Image
                      src="/icon_main.png"
                      alt=""
                      fill
                      sizes="65px"
                      className="object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-[18px] font-semibold text-[#202725]">
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
                onClick={vm.openChildrenPage}
                className="mt-5 block w-full text-left"
              >
                <p className="text-[18px] font-semibold leading-[1.32] text-[#202725]">
                  {babyName}의 알레르기
                </p>
                {vm.babyAllergies.length > 0 ? (
                  <p className="mt-2 text-[16px] font-semibold leading-[1.55] text-[#f59e0b]">
                    {vm.babyAllergies.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-[16px] font-medium leading-[1.55] text-[#7c8782]">
                    등록된 알레르기가 없습니다.
                  </p>
                )}
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
                <p className="text-[18px] font-semibold leading-[1.32] text-[#202725]">
                  가족 연동
                </p>
                <p className="mt-2 text-[16px] font-semibold text-[#7c8782]">
                  연동 가족 {familyCount}명
                </p>
              </div>
              <div className="flex shrink-0 -space-x-1">
                {familyAvatars.map((member) => (
                  <PhotoCircle
                    key={member.id}
                    fallback={getInitial(member.name, "가")}
                    imageUrl={member.profileImageUrl}
                    className="h-[42px] w-[42px] rounded-full text-[18px] ring-2 ring-white"
                  />
                ))}
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
              <MenuButton onClick={vm.openPrivacyPage}>
                개인정보 처리방침
              </MenuButton>
              <MenuButton onClick={vm.openTermsPage}>
                이용약관
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
              <MenuButton
                onClick={() => {
                  setDeleteConfirmText("");
                  setIsDeleteDialogOpen(true);
                }}
              >
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

      {isDeleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#6b716e]/55 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-16">
          <div className="w-full max-w-[480px] rounded-[24px] bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff3e0] text-[#f59e0b]">
                  <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold leading-[1.32] text-[#202725]">
                    회원탈퇴
                  </h2>
                  <p className="mt-1 text-[14px] leading-[1.55] text-[#6f7875]">
                    탈퇴하면 식단, 냉장고, 저장한 레시피와 가족 연동 정보가 삭제됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={vm.isDeletingAccount}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md active:bg-[#eef1ef] disabled:opacity-50"
                aria-label="회원탈퇴 닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 rounded-[16px] border border-[#f3d4d4] bg-[#fff8f8] p-3">
              <p className="text-[14px] font-semibold leading-[1.55] text-[#bf5555]">
                삭제된 데이터는 복구할 수 없습니다. 계속하려면 아래에
                <span className="font-bold"> 회원탈퇴</span>를 입력해주세요.
              </p>
            </div>

            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="회원탈퇴"
              disabled={vm.isDeletingAccount}
              className="mt-4 h-[52px] w-full rounded-[14px] border border-[#d1d8d5] bg-[#f8f9f8] px-4 text-[17px] font-semibold leading-[1.55] outline-none placeholder:text-[#97a19e] focus:border-[#57bf8e] disabled:opacity-60"
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={vm.isDeletingAccount}
                className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885] disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void vm.deleteAccount(deleteConfirmText)}
                disabled={vm.isDeletingAccount || deleteConfirmText !== "회원탈퇴"}
                className="h-12 rounded-2xl bg-[#ef4444] text-[16px] font-semibold text-white disabled:opacity-45"
              >
                {vm.isDeletingAccount ? "탈퇴 처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
