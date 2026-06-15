"use client";

import { Camera, X } from "lucide-react";
import {
  SECTION_META,
  SECTION_ORDER,
  type FridgeSectionKey,
  type useFridgePage,
} from "@/features/fridge/hooks/use-fridge-page";

type FridgePageViewModel = ReturnType<typeof useFridgePage>;

interface FridgeAddModalProps {
  vm: FridgePageViewModel;
}

export function FridgeAddModal({ vm }: FridgeAddModalProps) {
  if (!vm.isAddPopupOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#7f8783]/50 px-4 pb-[calc(16px_+_env(safe-area-inset-bottom))] pt-4">
      <div className="mx-auto flex max-h-[calc(100svh_-_32px_-_env(safe-area-inset-bottom))] w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] bg-[#f6f7f6] p-4">
        <div className="relative mb-4 flex shrink-0 items-center justify-center">
          <h2 className="text-[18px] font-bold text-[#1f2725]">냉장고 재료 추가</h2>
          <button
            type="button"
            onClick={vm.closeAddPopup}
            className="absolute right-0 rounded-md p-1 text-[#1f2725]"
            aria-label="팝업 닫기"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <button
          type="button"
          onClick={vm.openReceiptCamera}
          className="mb-4 flex w-full shrink-0 items-center gap-3 rounded-[16px] border border-dashed border-[#6bc89a] bg-[#eef5f1] px-4 py-4 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bde8d2]">
            <Camera className="h-6 w-6 text-[#2f7f59]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[#2f7f59]">영수증 스캔</p>
            <p className="text-[15px] text-[#6f7875]">사진 찍고 선택해서 추가해요</p>
          </div>
        </button>

        <div className="mb-4 flex shrink-0 items-center gap-2">
          <div className="h-px flex-1 bg-[#d4dbd8]" />
          <span className="text-[14px] font-semibold text-[#63bc8f]">또는 직접 입력</span>
          <div className="h-px flex-1 bg-[#d4dbd8]" />
        </div>

        {vm.addPopupStage === "input" ? (
          <IngredientInputStep vm={vm} />
        ) : (
          <IngredientReviewStep vm={vm} />
        )}
      </div>
    </div>
  );
}

function IngredientInputStep({ vm }: FridgeAddModalProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <label className="text-[18px] font-bold text-[#1f2725]">재료명</label>
        <textarea
          value={vm.newIngredientName}
          onChange={(event) => vm.setNewIngredientName(event.target.value)}
          placeholder={"예:\n브로콜리\n당근\n소고기"}
          rows={4}
          className="mb-2 mt-2 min-h-[132px] w-full shrink-0 resize-none rounded-[12px] border border-[#d1d8d5] bg-[#f8f9f8] px-4 py-3 text-[18px] leading-[1.5] outline-none placeholder:text-[#97a19e]"
        />
        <p className="mb-6 text-[13px] text-[#7f8a86]">
          한 줄에 하나씩 입력하고 엔터로 줄바꿈하면 여러 재료를 한 번에 추가할 수 있어요.
        </p>

        <p className="mb-2 text-[18px] font-bold text-[#1f2725]">기본 종류</p>
        <div className="grid grid-cols-4 gap-2 pb-3">
          {SECTION_ORDER.map((key) => (
            <button
              key={`add-type-${key}`}
              type="button"
              onClick={() => vm.setNewIngredientType(key)}
              className={`rounded-[12px] border px-1 py-3 text-center ${
                vm.newIngredientType === key
                  ? "border-[#57bf8e] bg-[#eef8f3]"
                  : "border-[#d0d7d4] bg-[#f7f8f7]"
              }`}
            >
              <div className="text-[18px]">{SECTION_META[key].emoji}</div>
              <div className="mt-1 break-keep text-[15px] font-semibold leading-tight text-[#2a312f]">
                {SECTION_META[key].label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-transparent pt-3">
        <button
          type="button"
          onClick={vm.moveToReviewStage}
          disabled={vm.inputLines.length === 0}
          className="h-12 w-full rounded-2xl bg-[#57bf8e] text-[20px] font-semibold text-white disabled:opacity-60"
        >
          다음
        </button>
      </div>
    </>
  );
}

function IngredientReviewStep({ vm }: FridgeAddModalProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-3 text-[18px] font-bold text-[#1f2725]">추가할 재료 확인</p>
        <div className="mb-4 max-h-[260px] space-y-2 overflow-y-auto rounded-[14px] border border-[#d1d8d5] bg-[#f8f9f8] p-3">
          {vm.draftIngredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-[#dde2df] bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[16px] text-[#1f2725]">
                {ingredient.name}
              </span>
              <select
                value={ingredient.type}
                onChange={(event) => {
                  const nextType = event.target.value as FridgeSectionKey;
                  vm.setDraftIngredients((prev) =>
                    prev.map((item) =>
                      item.id === ingredient.id ? { ...item, type: nextType } : item
                    )
                  );
                }}
                className="h-9 rounded-[10px] border border-[#cfd6d3] bg-white px-2 text-[14px] text-[#2a312f] outline-none"
              >
                {SECTION_ORDER.map((key) => (
                  <option key={`draft-type-${ingredient.id}-${key}`} value={key}>
                    {SECTION_META[key].label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="mb-4 text-[13px] text-[#7f8a86]">
          각 항목의 종류를 확인한 뒤 한 번에 추가하세요.
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 pt-3">
        <button
          type="button"
          onClick={() => vm.setAddPopupStage("input")}
          disabled={vm.isAdding}
          className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
        >
          이전
        </button>
        <button
          type="button"
          onClick={vm.addDraftIngredients}
          disabled={vm.isAdding || vm.draftIngredients.length === 0}
          className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {vm.isAdding ? "추가중..." : "추가하기"}
        </button>
      </div>
    </>
  );
}
