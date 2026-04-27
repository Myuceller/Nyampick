"use client";

import { ArrowLeft, Link2, Users } from "lucide-react";
import { useFamilyPage } from "@/features/family/hooks/use-family-page";
import { cn } from "@/lib/utils";

function FamilySkeleton() {
  return (
    <div className="mt-9 space-y-4">
      <div className="h-[120px] animate-pulse rounded-[16px] bg-[#f4f5f6]" />
      <div className="h-[180px] animate-pulse rounded-[16px] bg-[#f4f5f6]" />
      <div className="h-[150px] animate-pulse rounded-[16px] bg-[#f4f5f6]" />
    </div>
  );
}

export default function FamilyPage() {
  const vm = useFamilyPage();
  const linkedLabel =
    vm.linkedInfo?.ownerName || vm.linkedInfo?.ownerEmail || "연결된 보호자";
  const linkedChildName = vm.linkedInfo?.childName || vm.selectedChild?.name || "아기";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white px-4 pb-10 pt-6">
      <div className="relative flex h-10 items-center justify-center">
        <button
          type="button"
          onClick={() => vm.router.back()}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[18px] font-extrabold text-[#202725]">가족 관리</h1>
      </div>

      <section className="mt-9">
        <h2 className="whitespace-pre-line text-[24px] font-extrabold leading-[1.45] tracking-[-0.02em] text-[#202725]">
          {"가족을 초대하거나\n연결해요"}
        </h2>
        <p className="mt-3 text-[16px] font-medium leading-[1.55] text-[#6f7875]">
          가족이 같은 아기 식단과 냉장고 데이터를 함께 볼 수 있어요.
        </p>
      </section>

      {vm.loading ? (
        <FamilySkeleton />
      ) : (
        <div className="mt-9 space-y-5">
          <section className="rounded-[16px] bg-[#f6f7f8] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9f3e9] text-[#167a58]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[18px] font-extrabold text-[#202725]">
                  {vm.linkedMode ? "가족 연결됨" : "내 가족 공간"}
                </h2>
                <p className="mt-1 text-[14px] font-semibold text-[#7c8782]">
                  {vm.linkedMode
                    ? `${linkedLabel}님의 ${linkedChildName} 데이터에 연결되어 있어요`
                    : `${vm.children.length || 1}명의 아기를 관리하고 있어요`}
                </p>
              </div>
            </div>
          </section>

          {!vm.linkedMode ? (
            <section className="rounded-[16px] border border-[#e1e7e4] p-5">
              <h2 className="text-[18px] font-extrabold text-[#202725]">가족 초대</h2>
              <p className="mt-2 text-[14px] font-medium leading-[1.55] text-[#6f7875]">
                함께 관리할 아기를 선택하고 초대코드를 공유하세요.
              </p>

              <div className="mt-5 space-y-2">
                {vm.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => vm.setSelectedChildId(child.id)}
                    className={cn(
                      "flex h-12 w-full items-center justify-between rounded-[12px] px-4 text-left text-[15px] font-bold",
                      vm.selectedChildId === child.id
                        ? "border border-[#57bf8e] bg-[#eefaf4] text-[#167a58]"
                        : "bg-[#f6f7f8] text-[#202725]"
                    )}
                  >
                    <span>{child.name}</span>
                    <span className="text-[13px] font-semibold text-[#7c8782]">
                      생후 {child.monthsOld}개월
                    </span>
                  </button>
                ))}
              </div>

              {vm.inviteCode ? (
                <div className="mt-5 rounded-[14px] bg-[#eefaf4] px-4 py-4">
                  <p className="text-[13px] font-bold text-[#167a58]">초대코드</p>
                  <p className="mt-1 break-all text-[28px] font-extrabold tracking-[0.08em] text-[#202725]">
                    {vm.inviteCode}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void vm.createInviteCode()}
                disabled={vm.isCreatingCode || vm.children.length === 0}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#57bf8e] text-[16px] font-extrabold text-white disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" />
                {vm.isCreatingCode ? "생성 중..." : "초대코드 만들기"}
              </button>
            </section>
          ) : null}

          <section className="rounded-[16px] border border-[#e1e7e4] p-5">
            <h2 className="text-[18px] font-extrabold text-[#202725]">초대코드로 연결</h2>
            <p className="mt-2 text-[14px] font-medium leading-[1.55] text-[#6f7875]">
              가족에게 받은 초대코드를 입력하면 해당 아기 데이터에 연결됩니다.
            </p>
            <input
              value={vm.joinCode}
              onChange={(event) => vm.setJoinCode(event.target.value.toUpperCase())}
              disabled={vm.linkedMode}
              placeholder="초대코드 입력"
              className="mt-5 h-12 w-full rounded-[12px] border border-[#d5ddda] px-4 text-[16px] font-bold uppercase tracking-[0.08em] outline-none disabled:bg-[#f5f6f6] disabled:text-[#a0a8a4]"
            />
            <button
              type="button"
              onClick={() => void vm.joinByCode()}
              disabled={vm.isJoining || vm.linkedMode}
              className="mt-3 h-12 w-full rounded-[12px] bg-[#202725] text-[16px] font-extrabold text-white disabled:opacity-50"
            >
              {vm.isJoining ? "연결 중..." : "가족 연결하기"}
            </button>
          </section>

          {vm.linkedMode ? (
            <section className="rounded-[16px] border border-[#ffd1d1] bg-[#fff8f8] p-5">
              <h2 className="text-[18px] font-extrabold text-[#202725]">연결 해제</h2>
              <p className="mt-2 text-[14px] font-medium leading-[1.55] text-[#8a5a5a]">
                연결을 해제하면 내 계정의 독립된 아기 데이터로 돌아갑니다.
              </p>
              <button
                type="button"
                onClick={() => void vm.unlinkFamily()}
                disabled={vm.isUnlinking}
                className="mt-5 h-12 w-full rounded-[12px] bg-[#ff5c5c] text-[16px] font-extrabold text-white disabled:opacity-50"
              >
                {vm.isUnlinking ? "해제 중..." : "가족 연결 해제"}
              </button>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
