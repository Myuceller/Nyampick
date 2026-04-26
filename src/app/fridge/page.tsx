"use client";

import { Camera, Check, X } from "lucide-react";
import { AppButton } from "@/components/ui/app-button";
import { CategoryChipFilter } from "@/components/ui/category-chip-filter";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FridgePageSkeleton } from "@/components/features/fridge/fridge-page-skeleton";
import {
  CATEGORY_LABEL,
  CATEGORY_TEXT_COLOR,
  SECTION_META,
  SECTION_ORDER,
  useFridgePage,
  FridgeSectionKey,
} from "@/features/fridge/hooks/use-fridge-page";
import { cn } from "@/lib/utils";

export default function FridgePage() {
  const vm = useFridgePage();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white pb-24">
      <main className="flex flex-1 flex-col px-4 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1f2725]">
            내 냉장고
          </h1>
          <button
            type="button"
            onClick={() => vm.router.push("/fridge/edit")}
            className="text-[12px] font-semibold text-[#59C090]"
          >
            수정하기
          </button>
        </div>

        <AppSearchInput
          value={vm.keyword}
          onChange={vm.setKeyword}
          placeholder="재료 검색"
          inputClassName="border-transparent bg-[#eef0ef]"
        />

        <CategoryChipFilter
          options={vm.filterOptions}
          activeKey={vm.activeFilter}
          onChange={(key) => vm.setActiveFilter(key as "all" | FridgeSectionKey)}
        />

        <div className="-mx-4 mt-4 h-px bg-[#d3d7d5]" />

        <div className="-mx-4 bg-[#eef3f0] px-4 pb-40 pt-5">
          {vm.isLoading ? (
            <FridgePageSkeleton />
          ) : (
            <div className="space-y-7">
              {vm.filteredSections.map((section) => (
                <section key={section.key}>
                  <h2 className="mb-3 text-[16px] font-bold text-[#2a4a3c]">
                    {section.emoji} {section.label}
                  </h2>
                  <div className="space-y-2.5">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-[16px] border border-[#c2d8cc] bg-white px-5 py-[18px]"
                      >
                        <span className="text-[18px] font-medium text-[#1f2725]">
                          {item.name}
                        </span>
                        {item.quantity ? (
                          <span className="text-[31px] font-semibold text-[#2f8d68]">
                            {item.quantity}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {vm.showEmptyFridgeCta ? (
            <div className="mt-8 rounded-[16px] border border-dashed border-[#c8cfcd] bg-[#f6f8f7] px-4 py-7 text-center">
              <p className="text-[18px] font-semibold text-[#2d3532]">냉장고가 비어 있어요</p>
              <p className="mt-1 text-[14px] text-[#6f7875]">
                영수증 스캔이나 직접 입력으로 재료를 추가해보세요
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={vm.openReceiptPopup}
                  className="h-11 flex-1 rounded-xl border border-[#7bcaa3] bg-[#eef8f2] text-[14px] font-semibold text-[#2f7f59]"
                >
                  영수증 스캔
                </button>
                <button
                  type="button"
                  onClick={vm.openAddPopup}
                  className="h-11 flex-1 rounded-xl bg-[#57bf8e] text-[14px] font-semibold text-white"
                >
                  재료 추가하기
                </button>
              </div>
            </div>
          ) : null}

          {!vm.isLoading && !vm.showEmptyFridgeCta && vm.filteredSections.length === 0 ? (
            <p className="mt-8 text-center text-[18px] text-[#6f7875]">검색 결과가 없습니다</p>
          ) : null}
        </div>
      </main>

      {!vm.showEmptyFridgeCta ? (
        <div className="pointer-events-none fixed bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-4">
          <AppButton
            label="재료 추가"
            onClick={vm.openAddPopup}
            className="pointer-events-auto mx-auto flex h-12 w-[230px] rounded-full shadow-[0_4px_12px_rgba(87,191,142,0.15)]"
          />
        </div>
      ) : null}

      {vm.isAddPopupOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#7f8783]/50 px-4 py-4">
          <div className="mx-auto flex max-h-[calc(100dvh-32px)] w-full max-w-[480px] flex-col overflow-y-auto rounded-[28px] bg-[#f6f7f6] p-4">
            <div className="relative mb-4 flex items-center justify-center">
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
              onClick={vm.openReceiptPopup}
              className="mb-4 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-[#6bc89a] bg-[#eef5f1] px-4 py-4 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bde8d2]">
                <Camera className="h-6 w-6 text-[#2f7f59]" />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#2f7f59]">영수증 스캔</p>
                <p className="text-[15px] text-[#6f7875]">사진 찍고 선택해서 추가해요</p>
              </div>
            </button>

            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#d4dbd8]" />
              <span className="text-[14px] font-semibold text-[#63bc8f]">또는 직접 입력</span>
              <div className="h-px flex-1 bg-[#d4dbd8]" />
            </div>

            {vm.addPopupStage === "input" ? (
              <>
                <label className="text-[18px] font-bold text-[#1f2725]">재료명</label>
                <textarea
                  value={vm.newIngredientName}
                  onChange={(event) => vm.setNewIngredientName(event.target.value)}
                  placeholder={"예:\n브로콜리\n당근\n소고기"}
                  rows={4}
                  className="mb-2 mt-2 w-full resize-none rounded-[12px] border border-[#d1d8d5] bg-[#f8f9f8] px-4 py-3 text-[18px] leading-[1.5] outline-none placeholder:text-[#97a19e]"
                />
                <p className="mb-6 text-[13px] text-[#7f8a86]">
                  한 줄에 하나씩 입력하고 엔터로 줄바꿈하면 여러 재료를 한 번에 추가할 수 있어요.
                </p>

                <p className="mb-2 text-[18px] font-bold text-[#1f2725]">기본 종류</p>
                <div className="grid grid-cols-4 gap-2">
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
                      <div className="mt-1 text-[16px] font-semibold text-[#2a312f]">
                        {SECTION_META[key].label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-auto pt-4">
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
            ) : (
              <>
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

                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
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
            )}
          </div>
        </div>
      ) : null}

      {vm.isReceiptPopupOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#6b716e]/65 px-4 py-4">
          <div className="mx-auto w-full max-w-[480px] rounded-[28px] bg-[#f6f7f6] px-4 pb-5 pt-4">
            <input
              ref={vm.albumInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void vm.handleReceiptFile(file);
              }}
            />
            <input
              ref={vm.cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void vm.handleReceiptFile(file);
              }}
            />

            {vm.receiptStage === "capture" ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <span className="w-6" />
                  <h3 className="text-[35px] font-bold text-[#1f2725]">영수증 스캔</h3>
                  <button
                    type="button"
                    onClick={vm.closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <div className="mb-6 flex flex-col items-center py-7">
                  <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[18px] bg-[#e8eeeb]">
                    <Camera className="h-10 w-10 text-[#3b7b5e]" />
                  </div>
                  <p className="text-[40px] font-bold text-[#1f2725]">영수증 사진을 찍어주세요</p>
                  <p className="mt-1 text-[16px] text-[#8a9491]">장 본 내역을 자동으로 인식해요</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => vm.albumInputRef.current?.click()}
                    disabled={vm.isScanningReceipt}
                    className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
                  >
                    {vm.isScanningReceipt ? "처리 중..." : "앨범에서"}
                  </button>
                  <button
                    type="button"
                    onClick={() => vm.cameraInputRef.current?.click()}
                    disabled={vm.isScanningReceipt}
                    className="h-12 rounded-2xl bg-[#57bf8e] text-[16px] font-semibold text-white"
                  >
                    {vm.isScanningReceipt ? "처리 중..." : "촬영하기"}
                  </button>
                </div>
              </>
            ) : null}

            {vm.receiptStage === "scanning" ? (
              <>
                <div className="mb-5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={vm.closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <div className="mb-6 flex flex-col items-center py-14">
                  <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[18px] bg-[#e8eeeb]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#98aba2] border-t-[#57bf8e]" />
                  </div>
                  <p className="text-[35px] font-bold text-[#1f2725]">{vm.receiptStageLabel}</p>
                  <p className="mt-1 text-[16px] text-[#8a9491]">{vm.receiptStageDescription}</p>
                  <div className="mt-6 w-full max-w-[260px]">
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#dce8e2]">
                      <div
                        className="h-full rounded-full bg-[#57bf8e] transition-[width] duration-300 ease-out"
                        style={{ width: `${vm.receiptScanProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[13px] font-semibold text-[#4f7f69]">
                      <span>업로드</span>
                      <span>분석</span>
                      <span>정리</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {vm.receiptStage === "result" ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <span className="w-6" />
                  <h3 className="text-[31px] font-semibold text-[#1f2725] underline decoration-[1px] underline-offset-4">
                    스캔 결과 확인
                  </h3>
                  <button
                    type="button"
                    onClick={vm.closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <p className="mb-4 text-[19px] font-bold text-[#1f2725]">
                  추가할 재료를 선택해주세요
                </p>

                <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                  {vm.receiptCandidates.map((candidate) => {
                    const selected = vm.selectedReceiptIds.has(candidate.tempId);
                    return (
                      <button
                        key={candidate.tempId}
                        type="button"
                        onClick={() => vm.toggleReceiptCandidate(candidate.tempId)}
                        className={cn(
                          "flex h-[52px] w-full items-center justify-between rounded-[12px] border px-4 text-left",
                          selected
                            ? "border-[#57bf8e] bg-[#f8faf9]"
                            : "border-[#d5dbd8] bg-[#f7f8f7]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-semibold text-[#1f2725]">
                            {candidate.name}
                          </span>
                          <span
                            className={cn(
                              "text-[13px] font-semibold",
                              CATEGORY_TEXT_COLOR[candidate.category]
                            )}
                          >
                            {CATEGORY_LABEL[candidate.category]}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            selected
                              ? "bg-[#57bf8e] text-white"
                              : "bg-[#d5dbd8] text-transparent"
                          )}
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={vm.resetReceiptToCapture}
                    disabled={vm.isConfirmingReceipt}
                    className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
                  >
                    다시 촬영하기
                  </button>
                  <button
                    type="button"
                    onClick={() => void vm.confirmSelectedReceiptItems()}
                    disabled={vm.isConfirmingReceipt}
                    className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
                  >
                    {vm.isConfirmingReceipt ? "추가중..." : "추가하기"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
