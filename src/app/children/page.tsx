"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useChildrenPage } from "@/features/children/hooks/use-children-page";
import { cn } from "@/lib/utils";

const allergySamples = [
  ["우유", "달걀"],
  ["갑각류", "열대과일"],
  [],
];

function getAllergies(index: number) {
  return allergySamples[index] ?? [];
}

function Avatar() {
  return (
    <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full">
      <Image
        src="/icons/icon-source-baby.png"
        alt=""
        fill
        sizes="70px"
        className="object-contain"
      />
    </div>
  );
}

export default function ChildrenPage() {
  const [pendingDeleteChild, setPendingDeleteChild] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionChildId, setActionChildId] = useState<string | null>(null);

  const {
    addChild,
    cancelEditChildName,
    children,
    deleteChild,
    deletingChildId,
    editingChildId,
    editingChildName,
    isSubmitting,
    isUpdatingName,
    linkedMode,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChildName,
    setEditingChildName,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChildName,
  } = useChildrenPage();

  const handleAddChild = async () => {
    if (!newName.trim()) return;
    await addChild();
    setShowAddForm(false);
  };

  return (
    <>
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white px-4 pb-28 pt-6">
        <div className="relative flex h-10 items-center justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[18px] font-extrabold text-[#202725]">아기 관리</h1>
        </div>

        <section className="mt-9">
          <h2 className="whitespace-pre-line text-[24px] font-extrabold leading-[1.45] tracking-[-0.02em] text-[#202725]">
            {"아기를 선택하거나\n새로 추가해요"}
          </h2>
        </section>

        <section className="mt-10 space-y-5">
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`child-skeleton-${index}`}
                  className="h-[144px] animate-pulse rounded-[14px] bg-[#f4f5f6]"
                />
              ))}
            </>
          ) : null}

          {!loading && children.length === 0 ? (
            <div className="rounded-[14px] bg-[#f5f6f7] px-5 py-8 text-center text-[16px] font-semibold text-[#79827f]">
              등록된 아기가 없습니다.
            </div>
          ) : null}

          {children.map((child, index) => {
            const allergies = getAllergies(index);
            const isActionOpen = actionChildId === child.id;

            return (
              <article
                key={child.id}
                className={cn(
                  "relative rounded-[14px] px-5 py-8",
                  child.isPrimary
                    ? "border border-[#57bf8e] bg-white"
                    : "bg-[#f6f7f8]"
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setActionChildId((current) => (current === child.id ? null : child.id))
                  }
                  className="absolute right-4 top-4 rounded-full p-1 text-[#111816] active:bg-[#e8ecea]"
                  aria-label="아기 관리 메뉴"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-5 pr-7">
                  <Avatar />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[20px] font-extrabold text-[#202725]">
                        {child.name}
                      </p>
                      {child.isPrimary ? (
                        <span className="shrink-0 rounded-full bg-[#57bf8e] px-3 py-1 text-[13px] font-bold text-white">
                          선택중
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[18px] font-medium text-[#313a36]">
                      생후 {child.monthsOld}개월
                    </p>
                    {allergies.length > 0 ? (
                      <p className="mt-1 text-[18px] font-medium text-[#ff3030]">
                        알레르기: {allergies.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>

                {editingChildId === child.id ? (
                  <div className="mt-5 flex gap-2">
                    <input
                      value={editingChildName}
                      onChange={(event) => setEditingChildName(event.target.value)}
                      placeholder="새 이름"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-[#cfd7d3] px-3 text-[14px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void saveChildName()}
                      disabled={isUpdatingName}
                      className="h-10 rounded-xl bg-[#57bf8e] px-3 text-[13px] font-semibold text-white disabled:opacity-60"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditChildName}
                      className="h-10 rounded-xl border border-[#cad8d2] px-3 text-[13px] font-semibold text-[#5c6663]"
                    >
                      취소
                    </button>
                  </div>
                ) : null}

                {isActionOpen ? (
                  <div className="absolute right-4 top-11 z-10 w-[150px] overflow-hidden rounded-[14px] border border-[#e2e6e4] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                    {!child.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => {
                          void setPrimaryChild(child.id);
                          setActionChildId(null);
                        }}
                        disabled={linkedMode}
                        className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#202725] disabled:text-[#a2aaa6]"
                      >
                        선택하기
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        startEditChildName(child);
                        setActionChildId(null);
                      }}
                      disabled={linkedMode}
                      className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#202725] disabled:text-[#a2aaa6]"
                    >
                      이름 변경
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDeleteChild({ id: child.id, name: child.name });
                        setActionChildId(null);
                      }}
                      disabled={linkedMode || deletingChildId === child.id}
                      className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#ff3030] disabled:text-[#d5a0a0]"
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-white px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={linkedMode}
          className="h-[54px] w-full rounded-[12px] bg-[#5bc38f] text-[18px] font-extrabold text-white disabled:opacity-50"
        >
          아기 추가
        </button>
      </div>

      {showAddForm ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-4">
          <div className="mb-4 w-full max-w-[448px] rounded-[24px] bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold text-[#202725]">아기 추가</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-full p-1 text-[#202725]"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="아기 이름"
                className="h-12 w-full rounded-xl border border-[#d5ddda] px-4 text-[16px] outline-none"
              />
              <input
                value={newMonthsOld}
                onChange={(event) => setNewMonthsOld(event.target.value)}
                inputMode="numeric"
                placeholder="개월 수"
                className="h-12 w-full rounded-xl border border-[#d5ddda] px-4 text-[16px] outline-none"
              />
              <button
                type="button"
                onClick={() => void handleAddChild()}
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-[#57bf8e] text-[16px] font-extrabold text-white disabled:opacity-60"
              >
                {isSubmitting ? "추가 중..." : "추가하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(pendingDeleteChild)}
        title="정말 삭제할까요?"
        description={
          pendingDeleteChild ? `${pendingDeleteChild.name} 아기 정보가 사라져요` : ""
        }
        onCancel={() => setPendingDeleteChild(null)}
        onConfirm={() => {
          if (!pendingDeleteChild) return;
          void deleteChild(pendingDeleteChild.id);
          setPendingDeleteChild(null);
        }}
        confirmLabel="삭제하기"
      />
    </>
  );
}
