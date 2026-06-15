"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Check, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useChildrenPage } from "@/features/children/hooks/use-children-page";
import { fileToResizedImageDataUrl } from "@/lib/client-image";
import { cn } from "@/lib/utils";

const allergySamples = [
  ["우유", "달걀"],
  ["갑각류", "열대과일"],
  [],
];

function getAllergies(index: number) {
  return allergySamples[index] ?? [];
}

function Avatar({ photoUrl }: { photoUrl?: string }) {
  if (photoUrl) {
    return (
      <div
        className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${photoUrl})` }}
      />
    );
  }

  return (
    <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full">
      <Image
        src="/icon_main.png"
        alt=""
        fill
        sizes="70px"
        className="object-contain"
      />
    </div>
  );
}

export default function ChildrenPage() {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDeleteChild, setPendingDeleteChild] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionChildId, setActionChildId] = useState<string | null>(null);
  const [photoTargetChildId, setPhotoTargetChildId] = useState<string | null>(null);

  const {
    addChild,
    cancelEditChild,
    children,
    deleteChild,
    deletingChildId,
    editingChildMonthsOld,
    editingChildId,
    editingChildName,
    isSubmitting,
    isUpdatingChild,
    linkedMode,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChildDetails,
    setEditingChildName,
    setEditingChildMonthsOld,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChild,
    saveChildPhoto,
    updatingPhotoChildId,
  } = useChildrenPage();

  const editingChild = children.find((child) => child.id === editingChildId) ?? null;

  const handleAddChild = async () => {
    if (!newName.trim()) return;
    await addChild();
    setShowAddForm(false);
  };

  const handlePhotoFile = async (file: File | null | undefined) => {
    if (!file || !photoTargetChildId) return;
    try {
      const dataUrl = await fileToResizedImageDataUrl(file);
      await saveChildPhoto(photoTargetChildId, dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "아이 사진을 처리하지 못했습니다.");
    } finally {
      setPhotoTargetChildId(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handlePhotoFile(event.target.files?.[0])}
      />
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white px-4 pb-28 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="relative flex h-10 items-center justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[18px] font-extrabold leading-[1.45] text-[#202725]">아기 관리</h1>
        </div>

        <section className="mt-9">
          <h2 className="whitespace-pre-line text-[24px] font-extrabold leading-[1.45] text-[#202725]">
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
            const canSelectChild = !linkedMode && !child.isPrimary;

            return (
              <article
                key={child.id}
                role={canSelectChild ? "button" : undefined}
                tabIndex={canSelectChild ? 0 : undefined}
                onClick={() => {
                  if (canSelectChild) void setPrimaryChild(child.id);
                }}
                onKeyDown={(event) => {
                  if (!canSelectChild) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void setPrimaryChild(child.id);
                  }
                }}
                className={cn(
                  "relative rounded-[16px] px-5 py-8 outline-none transition active:scale-[0.99]",
                  child.isPrimary
                    ? "border border-[#57bf8e] bg-white shadow-[0_2px_12px_rgba(87,191,142,0.08)]"
                    : "border border-[#e5e8ec] bg-[#f6f7f8] active:bg-[#eef7f2]"
                )}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActionChildId((current) => (current === child.id ? null : child.id));
                  }}
                  className="absolute right-4 top-4 rounded-full p-1 text-[#111816] active:bg-[#e8ecea]"
                  aria-label="아기 관리 메뉴"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-5 pr-7">
                  <Avatar photoUrl={child.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[20px] font-extrabold text-[#202725]">
                        {child.name}
                      </p>
                      {child.isPrimary ? (
                        <span className="shrink-0 rounded-full bg-[#57bf8e] px-3 py-1 text-[13px] font-bold text-white">
                          선택중
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#e8f5ef] px-3 py-1 text-[13px] font-bold text-[#3fa876]">
                          탭해서 선택
                        </span>
                      )}
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

                {isActionOpen ? (
                  <div
                    className="absolute right-4 top-11 z-10 w-[150px] overflow-hidden rounded-[14px] border border-[#e2e6e4] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                    onClick={(event) => event.stopPropagation()}
                  >
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
                        startEditChild(child);
                        setActionChildId(null);
                      }}
                      disabled={linkedMode}
                      className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#202725] disabled:text-[#a2aaa6]"
                    >
                      수정하기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTargetChildId(child.id);
                        setActionChildId(null);
                        photoInputRef.current?.click();
                      }}
                      disabled={linkedMode || updatingPhotoChildId === child.id}
                      className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-[#202725] disabled:text-[#a2aaa6]"
                    >
                      사진 등록
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

      {editingChild ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-4">
          <div className="mb-4 w-full max-w-[448px] rounded-[24px] bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold leading-[1.32] text-[#202725]">
                아기 수정하기
              </h2>
              <button
                type="button"
                onClick={cancelEditChild}
                className="rounded-full p-1 text-[#202725]"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-[18px] bg-[#f0faf5] p-4">
              <Avatar photoUrl={editingChild.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-[1.55] text-[#202725]">
                  프로필 사진
                </p>
                <p className="mt-0.5 text-[13px] font-medium leading-[1.55] text-[#6b7280]">
                  아이를 구분하기 쉽게 사진을 바꿀 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotoTargetChildId(editingChild.id);
                  photoInputRef.current?.click();
                }}
                disabled={updatingPhotoChildId === editingChild.id}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#57bf8e] text-white disabled:opacity-60"
                aria-label="사진 변경"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-[13px] font-bold leading-[1.55] text-[#202725]">
                  아기 이름
                </span>
                <input
                  value={editingChildName}
                  onChange={(event) => setEditingChildName(event.target.value)}
                  placeholder="아기 이름"
                  className="h-12 w-full rounded-xl border border-[#d5ddda] px-4 text-[16px] leading-[1.65] outline-none focus:border-[#57bf8e] focus:ring-4 focus:ring-[#57bf8e]/15"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[13px] font-bold leading-[1.55] text-[#202725]">
                  개월 수
                </span>
                <input
                  value={editingChildMonthsOld}
                  onChange={(event) => setEditingChildMonthsOld(event.target.value)}
                  inputMode="numeric"
                  placeholder="개월 수"
                  className="h-12 w-full rounded-xl border border-[#d5ddda] px-4 text-[16px] leading-[1.65] outline-none focus:border-[#57bf8e] focus:ring-4 focus:ring-[#57bf8e]/15"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveChildDetails()}
                disabled={isUpdatingChild}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#57bf8e] text-[16px] font-extrabold text-white disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {isUpdatingChild ? "저장 중..." : "수정 완료"}
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
