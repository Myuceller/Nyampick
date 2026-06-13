"use client";

import { AppButton } from "@/components/ui/app-button";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { CategoryChipFilter } from "@/components/ui/category-chip-filter";
import { FridgePageSkeleton } from "@/components/features/fridge/fridge-page-skeleton";
import type { useFridgePage } from "@/features/fridge/hooks/use-fridge-page";
import type { FridgeSectionKey } from "@/features/fridge/lib/fridge-types";

type FridgePageViewModel = ReturnType<typeof useFridgePage>;

interface FridgeMainContentProps {
  vm: FridgePageViewModel;
}

export function FridgeMainContent({ vm }: FridgeMainContentProps) {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-[#d3d7d5] bg-white px-4 pb-4 pt-12">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-[24px] font-bold leading-[1.28] text-[#1f2725]">
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
        </div>

        <div className="flex-1 px-4 pb-40 pt-5">
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
                          <span className="text-[24px] font-semibold text-[#2f8d68]">
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
        <div className="pointer-events-none fixed bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 bg-[#eef3f0] px-4 pb-4 pt-3">
          <AppButton
            label="재료 추가"
            onClick={vm.openAddPopup}
            className="pointer-events-auto mx-auto flex h-12 w-[230px] rounded-full shadow-[0_4px_12px_rgba(87,191,142,0.15)]"
          />
        </div>
      ) : null}

      {!vm.showEmptyFridgeCta ? (
        <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 h-[calc(110px+env(safe-area-inset-bottom))] w-full max-w-[480px] -translate-x-1/2 bg-[#eef3f0]" />
      ) : null}
    </>
  );
}
