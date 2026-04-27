"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useAllergyPage } from "@/features/allergies/hooks/use-allergy-page";
import { cn } from "@/lib/utils";

function AllergySkeleton() {
  return (
    <div className="mt-9 space-y-8">
      <div className="h-[144px] animate-pulse rounded-[14px] bg-[#f5f6f7]" />
      <div className="h-12 animate-pulse rounded-[14px] bg-[#f5f6f7]" />
      <div className="h-[220px] animate-pulse rounded-[14px] bg-[#f5f6f7]" />
    </div>
  );
}

export default function AllergiesPage() {
  const vm = useAllergyPage();
  const childName = vm.child?.name ?? "아기";

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-white px-4 pb-12 pt-6">
      <div className="relative flex h-10 items-center justify-center">
        <button
          type="button"
          onClick={() => vm.router.back()}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[18px] font-extrabold text-[#202725]">알레르기 관리</h1>
      </div>

      <section className="mt-9">
        <h2 className="whitespace-pre-line text-[24px] font-extrabold leading-[1.45] tracking-[-0.02em] text-[#202725]">
          {`${childName}의\n알레르기를 관리해요`}
        </h2>
      </section>

      {vm.loading ? (
        <AllergySkeleton />
      ) : (
        <div className="mt-10">
          <section>
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#202725]">
              현재 알레르기
            </h2>
            <div className="mt-4 rounded-[14px] border border-[#ffb8bf] bg-[#fff8f8] px-4 py-4">
              <p className="text-[17px] font-extrabold text-[#ff2f3f]">
                선택된 알레르기 ({vm.selectedAllergies.length}개)
              </p>
              <div className="mt-4 flex min-h-8 flex-wrap gap-2">
                {vm.selectedAllergies.length > 0 ? (
                  vm.selectedAllergies.map((allergy) => (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => void vm.removeAllergy(allergy)}
                      disabled={vm.isSaving || vm.linkedMode}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-[#ffd9de] px-4 text-[15px] font-extrabold text-[#ff2f3f] disabled:opacity-60"
                    >
                      {allergy}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))
                ) : (
                  <p className="text-[15px] font-semibold text-[#9ba3a0]">
                    선택된 알레르기가 없습니다.
                  </p>
                )}
              </div>
              <p className="mt-5 text-[15px] font-medium text-[#9a9f9d]">
                AI 레시피 추천에서 이 재료들이 제외됩니다.
              </p>
            </div>
          </section>

          <section className="mt-9">
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#202725]">
              알레르기 추가
            </h2>
            <div className="mt-4 flex gap-2">
              <input
                value={vm.customAllergy}
                onChange={(event) => vm.setCustomAllergy(event.target.value)}
                disabled={vm.linkedMode}
                placeholder="직접 입력하기"
                className="h-12 min-w-0 flex-1 rounded-[14px] bg-[#f5f5f5] px-5 text-[15px] font-bold text-[#202725] outline-none placeholder:text-[#8f9692] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void vm.addCustomAllergy()}
                disabled={vm.isSaving || vm.linkedMode}
                className="h-12 w-[62px] rounded-[14px] bg-[#57bf8e] text-[18px] font-extrabold text-white disabled:opacity-60"
              >
                추가
              </button>
            </div>
          </section>

          <section className="mt-9">
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#202725]">
              자주 등록하는 알레르기
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {vm.commonAllergies.map((allergy) => {
                const selected = vm.selectedSet.has(allergy);
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => void vm.toggleCommonAllergy(allergy)}
                    disabled={vm.isSaving || vm.linkedMode}
                    className={cn(
                      "inline-flex h-9 items-center gap-1 rounded-full px-4 text-[16px] font-extrabold disabled:opacity-60",
                      selected
                        ? "bg-[#ff2f3f] text-white"
                        : "bg-[#f0f1f1] text-[#868e8a]"
                    )}
                  >
                    {allergy}
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
