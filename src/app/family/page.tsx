"use client";

import { useState } from "react";
import { ArrowLeft, Copy, MoreHorizontal, UserRound, X } from "lucide-react";
import {
  RELATIONSHIP_OPTIONS,
  useFamilyPage,
} from "@/features/family/hooks/use-family-page";
import type { FamilyMember } from "@/features/family/hooks/use-family-page";

function getInitial(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : "가";
}

function MemberAvatar({ member }: { member: FamilyMember }) {
  if (member.profileImageUrl) {
    return (
      <div
        className="h-[56px] w-[56px] shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${member.profileImageUrl})` }}
      />
    );
  }

  if (member.role === "owner") {
    return (
      <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#fbfb82] text-[22px] font-extrabold text-[#202725]">
        {getInitial(member.name)}
      </div>
    );
  }

  return (
    <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#fbfb82] text-[#23705a]">
      <UserRound className="h-8 w-8" />
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-[90px] animate-pulse rounded-[14px] bg-[#f3f5f4]" />;
}

export default function FamilyPage() {
  const vm = useFamilyPage();
  const [openActionMemberId, setOpenActionMemberId] = useState<string | null>(null);
  const visibleCode = vm.inviteCode || "코드 만들기";
  const canCreateCode = vm.viewerRole === "owner" && !vm.linkedMode;
  const canManageMembers = vm.viewerRole === "owner" && !vm.linkedMode;

  return (
    <>
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white px-4 pb-28 pt-6">
        <div className="relative flex h-10 items-center justify-center">
          <button
            type="button"
            onClick={() => vm.router.back()}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[18px] font-extrabold text-[#202725]">가족 연동</h1>
        </div>

        <section className="mt-9">
          <h2 className="whitespace-pre-line text-[23px] font-extrabold leading-[1.45] text-[#202725]">
            {"가족과 함께\n아기 식단을 관리해요"}
          </h2>
        </section>

        <section className="mt-10">
          <h3 className="text-[20px] font-extrabold text-[#202725]">MY 코드</h3>
          <div className="mt-3 rounded-[14px] bg-[#f5f6f7] px-5 py-5">
            <p className="text-[16px] font-medium text-[#3d4642]">
              아래 코드를 가족에게 공유하세요
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!canCreateCode) return;
                  void vm.createInviteCode();
                }}
                disabled={!canCreateCode || vm.isCreatingCode}
                className="h-[43px] min-w-0 flex-1 rounded-[10px] border border-[#d9dfdc] bg-white px-4 text-center text-[19px] font-extrabold text-[#202725] disabled:text-[#8d9692]"
              >
                {vm.isCreatingCode ? "생성 중..." : visibleCode}
              </button>
              <button
                type="button"
                onClick={() => void vm.copyInviteCode()}
                disabled={!canCreateCode || vm.isCreatingCode}
                className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[10px] border border-[#d9dfdc] bg-white text-[#202725] disabled:text-[#a4aca8]"
                aria-label="가족 코드 복사"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-11">
          <h3 className="text-[20px] font-extrabold text-[#202725]">MY 그룹</h3>
          <p className="mt-3 text-[17px] font-semibold text-[#8a9490]">
            가족 구성원 ({vm.loading ? "-" : vm.members.length}명)
            {vm.childCount > 0 ? ` · 아기 ${vm.childCount}명` : ""}
          </p>

          <div className="mt-5 space-y-3">
            {vm.loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : null}

            {!vm.loading && vm.members.length === 0 ? (
              <div className="rounded-[14px] border border-[#c8cfcd] px-5 py-8 text-center text-[15px] font-semibold text-[#7b8581]">
                가족 구성원이 없습니다.
              </div>
            ) : null}

            {vm.members.map((member) => (
              <article
                key={member.id}
                className="relative flex min-h-[90px] items-center gap-4 rounded-[14px] border border-[#c8cfcd] bg-white px-5 py-4"
              >
                <MemberAvatar member={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[19px] font-extrabold text-[#202725]">
                    {member.name}
                  </p>
                  <p className="mt-1 text-[17px] font-extrabold text-[#10b98f]">
                    {member.roleLabel}
                  </p>
                </div>
                {canManageMembers && member.role === "member" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenActionMemberId((current) =>
                          current === member.id ? null : member.id
                        )
                      }
                      className="absolute right-5 top-4 rounded-full p-1 text-[#111816] active:bg-[#eef1ef]"
                      aria-label="가족 구성원 관리"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {openActionMemberId === member.id ? (
                      <div className="absolute right-5 top-11 z-10 w-[150px] overflow-hidden rounded-[14px] border border-[#e2e6e4] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMemberId(null);
                            void vm.unlinkFamilyMember(member.id);
                          }}
                          disabled={vm.unlinkingMemberId === member.id}
                          className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#ff3030] disabled:text-[#d5a0a0]"
                        >
                          {vm.unlinkingMemberId === member.id ? "끊는 중..." : "연결 끊기"}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-white px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
        {vm.linkedMode ? (
          <button
            type="button"
            onClick={() => void vm.unlinkFamily()}
            disabled={vm.isUnlinking}
            className="h-[54px] w-full rounded-[12px] border border-[#ffb5b5] bg-white text-[17px] font-extrabold text-[#ff4d4d] disabled:opacity-60"
          >
            {vm.isUnlinking ? "나가는 중..." : "가족 연결 해제"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => vm.setIsJoinOpen(true)}
            className="h-[54px] w-full rounded-[12px] bg-[#5bc38f] text-[17px] font-extrabold text-white"
          >
            다른 가족에 참여하기
          </button>
        )}
      </div>

      {vm.isJoinOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-4">
          <div className="mb-4 w-full max-w-[448px] rounded-[24px] bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold text-[#202725]">
                다른 가족에 참여하기
              </h2>
              <button
                type="button"
                onClick={() => vm.setIsJoinOpen(false)}
                className="rounded-full p-1 text-[#202725]"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <input
              value={vm.joinCode}
              onChange={(event) => vm.setJoinCode(event.target.value.toUpperCase())}
              placeholder="가족 코드 입력"
              className="h-12 w-full rounded-xl border border-[#d5ddda] px-4 text-center text-[18px] font-extrabold tracking-[0.08em] text-[#202725] outline-none"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => vm.setRelationshipLabel(option)}
                  className={`h-11 rounded-xl border text-[15px] font-extrabold ${
                    vm.relationshipLabel === option
                      ? "border-[#57bf8e] bg-[#eef8f2] text-[#13966f]"
                      : "border-[#d5ddda] bg-white text-[#59635f]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void vm.joinFamily()}
              disabled={vm.isJoining || vm.joinCode.trim().length === 0}
              className="mt-4 h-12 w-full rounded-xl bg-[#57bf8e] text-[16px] font-extrabold text-white disabled:opacity-60"
            >
              {vm.isJoining ? "참여 중..." : "참여하기"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
