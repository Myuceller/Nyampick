"use client";

import { Suspense } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { AppButton } from "@/components/ui/app-button";
import { AppSearchInput } from "@/components/ui/app-search-input";
import type { MealEntry } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMealEditPage } from "@/features/meal/hooks/use-meal-edit-page";
import {
  MEAL_TYPES,
  parseCubeCount,
  parseDateLabel,
} from "@/features/meal/lib/meal-edit-utils";

function MealEditPageContent() {
  const {
    addRecentSearch,
    addSelectedMenus,
    date,
    draft,
    filteredMenus,
    goHome,
    isSaving,
    menuSource,
    menuTab,
    mode,
    openAddForMeal,
    recentSearches,
    removeItem,
    saveAndGoHome,
    search,
    selectedNames,
    setMenuSource,
    setMenuTab,
    setMode,
    setSearch,
    setSelectedNames,
    targetMealType,
    updateItemQuantity,
  } = useMealEditPage();

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[#ffffff]">
      {mode === "edit" ? (
        <>
          <div className="px-4 pb-4 pt-[calc(48px+env(safe-area-inset-top))]">
            <h1 className="whitespace-pre-line text-[24px] font-extrabold leading-[1.5] text-[#1f2725]">
              {parseDateLabel(date)}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-28">
            <div className="space-y-7">
              {MEAL_TYPES.map((mealType) => (
                <section
                  key={mealType}
                  className="rounded-[14px] border border-[#d4d9d7] bg-[#ffffff] px-4 py-4"
                >
                  <h2
                    className={cn(
                      "mb-3 text-[18px] text-[#1f2725]",
                      mealType === "snack" ? "font-semibold" : "font-extrabold"
                    )}
                  >
                    {MEAL_LABELS[mealType]}
                  </h2>
                  <div className="space-y-2.5">
                    {draft[mealType].map((entry: MealEntry) => (
                      <div key={entry.id} className="flex items-center justify-between">
                        <span className="ml-2 text-[16px] font-normal text-[#2a312f]">{entry.menuName}</span>
                        <div className="flex items-center gap-2">
                          {entry.menuName.includes("큐브") ? (
                            <div className="flex items-center gap-1 rounded-lg border border-[#cdd7d3] bg-[#f1f4f3] px-1.5 py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(1, parseCubeCount(entry.quantity) - 1);
                                  updateItemQuantity(mealType, entry.id, `${next}개`);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-[#55625d] hover:bg-[#e4ebe8]"
                                aria-label="큐브 개수 감소"
                              >
                                -
                              </button>
                              <span className="min-w-[38px] text-center text-[14px] font-semibold text-[#2b322f]">
                                {parseCubeCount(entry.quantity)}개
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = parseCubeCount(entry.quantity) + 1;
                                  updateItemQuantity(mealType, entry.id, `${next}개`);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-[#55625d] hover:bg-[#e4ebe8]"
                                aria-label="큐브 개수 증가"
                              >
                                +
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeItem(mealType, entry.id)}
                            className="rounded-md p-1 text-[#1f2523] hover:bg-[#e6ece9]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => openAddForMeal(mealType)}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-[10px] border border-[#dde2e0] bg-[#eef1ef] text-[16px] font-medium text-[#6a7471]"
                  >
                    <Plus className="h-4 w-4" /> 메뉴 추가
                  </button>
                </section>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 bg-[#ffffff] px-4 pb-6 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <AppButton
                label="취소하기"
                onClick={goHome}
                bgClassName="bg-[#e5e7e6]"
                textClassName="text-[#8a9390]"
                className="h-12 text-[18px]"
              />
              <AppButton
                label="저장하기"
                onClick={saveAndGoHome}
                disabled={isSaving}
                className="h-12 text-[18px]"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 border-b border-[#d2d8d6] bg-white pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 pb-2 pt-5">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="rounded-md p-1 text-[#1f2523] hover:bg-[#e6ece9]"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h2 className="text-[18px] font-bold leading-[1.45] text-[#232a28]">메뉴 추가</h2>
              <span className="w-7" />
            </div>

            <div className="px-4">
              <AppSearchInput
                value={search}
                onChange={setSearch}
                placeholder="레시피명, 큐브명으로 검색"
                inputClassName="border-transparent bg-[#e7e9e8] text-[#232a28]"
                iconClassName="text-[#8a9390]"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addRecentSearch(search);
                  }
                }}
              />
            </div>

            {recentSearches.length > 0 ? (
              <div className="px-4 pt-4">
                <p className="text-[16px] text-[#7f8885]">최근 검색어</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {recentSearches.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearch(tag)}
                      className="rounded-full bg-[#dfe5e3] px-3 py-1 text-[13px] text-[#51605a]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={cn(recentSearches.length > 0 ? "mt-10" : "mt-8", "px-4")}>
              <div className="grid grid-cols-3 text-center">
                <button
                  type="button"
                  onClick={() => setMenuTab("freq")}
                  className={cn(
                    "pb-2 text-[18px] font-bold",
                    menuTab === "freq"
                      ? "border-b-2 border-[#57bf8e] text-[#232a28]"
                      : "text-[#232a28]"
                  )}
                >
                  자주 먹었어요
                </button>
                <button
                  type="button"
                  onClick={() => setMenuTab("fav")}
                  className={cn(
                    "pb-2 text-[18px] font-bold",
                    menuTab === "fav"
                      ? "border-b-2 border-[#57bf8e] text-[#232a28]"
                      : "text-[#232a28]"
                  )}
                >
                  즐겨찾기
                </button>
                <button
                  type="button"
                  onClick={() => setMenuTab("manual")}
                  className={cn(
                    "pb-2 text-[18px] font-bold",
                    menuTab === "manual"
                      ? "border-b-2 border-[#57bf8e] text-[#232a28]"
                      : "text-[#232a28]"
                  )}
                >
                  직접 등록
                </button>
              </div>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
              {[
                { key: "all", label: "전체" },
                { key: "recipe", label: "내 레시피" },
                { key: "ai", label: "AI 추천" },
                { key: "fridge", label: "냉장고" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setMenuSource(item.key as "all" | "recipe" | "ai" | "fridge")
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-[16px] font-medium",
                    menuSource === item.key
                      ? "border-[#57bf8e] bg-[#57bf8e] text-white"
                      : "border-[#c7cecb] text-[#6e7673]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4">
            {filteredMenus.length === 0 ? (
              <p className="py-8 text-center text-[16px] font-medium text-[#7f8885]">
                {menuTab === "freq" ? "자주 먹은 메뉴가 없어요." : "표시할 메뉴가 없어요."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredMenus.map((menu) => {
                  const selected = selectedNames.has(menu);
                  return (
                    <button
                      key={menu}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedNames((prev) => {
                          const next = new Set(prev);
                          if (next.has(menu)) next.delete(menu);
                          else next.add(menu);
                          return next;
                        });
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[12px] border px-3.5 py-4 text-left transition",
                        selected
                          ? "border-[#57bf8e] bg-[#e8f7ef] shadow-[inset_0_0_0_1px_rgba(87,191,142,0.45)]"
                          : "border-[#d5dbd9] bg-white active:bg-[#f4f7f5]"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[20px] font-medium",
                          selected ? "text-[#1f5f43]" : "text-[#232a28]"
                        )}
                      >
                        {menu}
                      </span>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          selected
                            ? "bg-[#57bf8e] text-white"
                            : "bg-[#dcefe6] text-[#68aa8a]"
                        )}
                        aria-hidden="true"
                      >
                        {selected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
            <p className="mb-4 text-center text-sm text-[#97a09d]">
              현재 선택한 메뉴는 {MEAL_LABELS[targetMealType]}에 추가돼요
            </p>
            <AppButton
              label="기록하기"
              onClick={addSelectedMenus}
              className="h-12 w-full text-[18px]"
            />
          </div>
        </>
      )}
    </main>
  );
}

export default function MealEditPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-[#f5f6f5]" />}>
      <MealEditPageContent />
    </Suspense>
  );
}
