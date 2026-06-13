"use client";

import { ArrowLeft, Check, MinusCircle, PlusCircle, X } from "lucide-react";
import { AppButton } from "@/components/ui/app-button";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { CategoryChipFilter } from "@/components/ui/category-chip-filter";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FridgeEditSkeleton } from "@/components/features/fridge/fridge-edit-skeleton";
import {
  SectionKey,
  SECTION_META,
  getWiggleStyle,
  useFridgeEditPage,
} from "@/features/fridge/hooks/use-fridge-edit-page";
import { cn } from "@/lib/utils";

export default function FridgeEditPage() {
  const vm = useFridgeEditPage();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white">
      <div className="px-4 pb-3 pt-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => vm.router.push("/fridge")}
            className="rounded-md p-1 text-[#1f2725]"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[24px] font-bold leading-[1.28] text-[#1f2725]">냉장고 수정</h1>
          <span className="w-8" />
        </div>

        <p className="mt-6 text-center text-[14px] leading-snug text-[#6f7875]">
          재료를 한번에 삭제하고 싶다면
          <br />
          꼭 눌러서 선택해보세요
        </p>

        <AppSearchInput
          value={vm.keyword}
          onChange={vm.setKeyword}
          placeholder="수정할 재료 검색"
          wrapperClassName="mt-6"
          inputClassName="border-transparent bg-[#eef0ef]"
        />

        <CategoryChipFilter
          options={vm.filterOptions}
          activeKey={vm.activeFilter}
          onChange={(key) => vm.setActiveFilter(key as "all" | SectionKey)}
        />
      </div>

      <div className="h-px bg-[#d3d7d5]" />

      <div className="flex-1 overflow-y-auto bg-[#eef3f0] px-4 pb-28 pt-4">
        {vm.isLoading ? (
          <FridgeEditSkeleton />
        ) : vm.visibleSectionOrder.length === 0 ? (
          <p className="text-center text-[18px] text-[#6f7875]">표시할 재료가 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {vm.visibleSectionOrder.map((section) => (
              <section key={section}>
                <h2 className="mb-3 text-[16px] font-bold text-[#2a4a3c]">
                  {SECTION_META[section].emoji} {SECTION_META[section].label}
                </h2>
                <div className="space-y-2.5">
                  {vm.grouped[section].map((item) => {
                    const isEditing = vm.editingQtyId === item.id;
                    const isSelectedForDelete = vm.selectedDeleteIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between rounded-[16px] border px-5 py-[18px]",
                          vm.isDeleteMode
                            ? "cursor-pointer [animation:fridgeWiggle_var(--wiggle-duration)_ease-in-out_infinite] [animation-delay:var(--wiggle-delay)]"
                            : "",
                          vm.isDeleteMode && isSelectedForDelete
                            ? "border-[#ff6e7a] bg-[#f9d9df]"
                            : "border-[#c2d8cc] bg-white"
                        )}
                        style={vm.isDeleteMode ? getWiggleStyle(item.id) : undefined}
                        onMouseDown={() => vm.startLongPress(item.id)}
                        onMouseUp={vm.endLongPress}
                        onMouseLeave={vm.endLongPress}
                        onTouchStart={() => vm.startLongPress(item.id)}
                        onTouchEnd={vm.endLongPress}
                        onTouchCancel={vm.endLongPress}
                        onClick={() => {
                          if (vm.isDeleteMode) {
                            vm.toggleDeleteSelection(item.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[18px] font-medium text-[#1f2725]">{item.name}</span>
                          {item.quantity ? (
                            isEditing ? (
                              <>
                                <div className="flex items-center gap-1 rounded-xl border border-[#65c496] px-2 py-1 text-[#57bf8e]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      vm.setEditingQtyValue((value) => Math.max(0, value - 1))
                                    }
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-[40px] text-center text-[16px] font-semibold">
                                    {`${Math.max(0, vm.editingQtyValue)}${vm.editingQtySuffix}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => vm.setEditingQtyValue((value) => value + 1)}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={vm.commitQuantity}
                                  className="rounded-lg border border-[#65c496] p-1 text-[#57bf8e]"
                                  aria-label="수량 적용"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (vm.isDeleteMode) return;
                                  vm.startEditQuantity(item);
                                }}
                                className="rounded-xl border border-[#ccd2d0] px-3 py-1 text-[16px] text-[#79827f]"
                              >
                                {item.quantity} ✎
                              </button>
                            )
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (vm.isDeleteMode) {
                              vm.toggleDeleteSelection(item.id);
                              return;
                            }
                            vm.requestRemoveItem(item);
                          }}
                          className="rounded-md p-1 text-[#1f2725]"
                          aria-label="재료 삭제"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {vm.isDeleteMode ? (
        <div className="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 px-4">
          <div className="pointer-events-auto flex w-full items-center gap-2">
            <AppButton
              label={vm.cancelDeleteLabel}
              onClick={vm.cancelDeleteMode}
              bgClassName="bg-[#7b8782]"
              className="h-12 rounded-full"
              style={{ flexBasis: 0, flexGrow: vm.cancelDeleteLabel.length }}
            />
            <AppButton
              label={vm.bulkDeleteLabel}
              onClick={vm.confirmBulkDelete}
              disabled={vm.selectedDeleteIds.size === 0}
              bgClassName="bg-[#ff2f3e]"
              className="h-12 rounded-full disabled:opacity-40"
              style={{ flexBasis: 0, flexGrow: vm.bulkDeleteLabel.length }}
            />
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 px-4">
          <AppButton
            label="저장하기"
            disabled={vm.isSaving}
            onClick={vm.saveChanges}
            className="pointer-events-auto mx-auto flex h-12 w-[180px] rounded-full text-[18px] disabled:opacity-70"
          />
        </div>
      )}

      <ConfirmModal
        open={Boolean(vm.pendingDeleteItem)}
        title="정말 삭제할까요?"
        description={vm.pendingDeleteItem ? `“${vm.pendingDeleteItem.name}” 재료가 사라져요` : ""}
        onCancel={() => vm.setPendingDeleteItem(null)}
        onConfirm={vm.confirmRemoveItem}
      />

      <ConfirmModal
        open={vm.showBulkDeleteConfirm}
        title="정말 삭제할까요?"
        description="선택한 재료가 모두 사라져요!"
        onCancel={() => vm.setShowBulkDeleteConfirm(false)}
        onConfirm={vm.applyBulkDelete}
      />

      <style jsx global>{`
        @keyframes fridgeWiggle {
          0% {
            transform: rotate(calc(var(--wiggle-rotate, 0.8deg) * -1));
          }
          50% {
            transform: rotate(var(--wiggle-rotate, 0.8deg));
          }
          100% {
            transform: rotate(calc(var(--wiggle-rotate, 0.8deg) * -1));
          }
        }
      `}</style>
    </main>
  );
}
