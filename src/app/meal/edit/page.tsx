"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { SAMPLE_MENUS } from "@/lib/meal-store";
import { authedFetch } from "@/lib/authed-fetch";
import { useMealEditStore } from "@/lib/stores/meal-edit-store";
import { cn } from "@/lib/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function createEmptyDay(date: string): DayMeals {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function parseDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "식단을 수정해요";
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일 ${dayOfWeek}요일의 식단을 수정해요`;
}

function MealEditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? "";

  const mode = useMealEditStore((state) => state.mode);
  const targetMealType = useMealEditStore((state) => state.targetMealType);
  const draft = useMealEditStore((state) => state.draft);
  const initialize = useMealEditStore((state) => state.initialize);
  const setMode = useMealEditStore((state) => state.setMode);
  const openAddForMeal = useMealEditStore((state) => state.openAddForMeal);
  const removeItem = useMealEditStore((state) => state.removeItem);
  const addMenusToTarget = useMealEditStore((state) => state.addMenusToTarget);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [menuTab, setMenuTab] = useState<"freq" | "fav" | "manual">("freq");
  const [menuSource, setMenuSource] = useState<"all" | "recipe" | "fridge">("all");

  useEffect(() => {
    if (!date) return;
    const initRaw = localStorage.getItem(`mammanote:meal-edit:init:${date}`);
    if (!initRaw) {
      initialize(date, createEmptyDay(date));
      return;
    }
    try {
      const parsed = JSON.parse(initRaw) as DayMeals;
      initialize(date, parsed);
    } catch {
      initialize(date, createEmptyDay(date));
    }
  }, [date, initialize]);

  const filteredMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = SAMPLE_MENUS.map((m) => m.name);
    if (!q) return base;
    return base.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const addSelectedMenus = () => {
    if (selectedNames.size === 0) return;
    addMenusToTarget(Array.from(selectedNames));
    setSelectedNames(new Set());
    setSearch("");
  };

  const goHome = () => router.push("/");

  const saveAndGoHome = async () => {
    if (!date) {
      goHome();
      return;
    }

    try {
      setIsSaving(true);
      const response = await authedFetch("/api/meals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          meals: {
            breakfast: draft.breakfast,
            lunch: draft.lunch,
            dinner: draft.dinner,
            snack: draft.snack,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorBody.message ?? "식단 저장에 실패했습니다.");
      }

      const json = (await response.json()) as { meals?: DayMeals };
      if (json.meals) {
        localStorage.setItem(
          "mammanote:meal-edit:result",
          JSON.stringify({ date, dayMeals: json.meals })
        );
      }
      goHome();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "식단 저장에 실패했습니다.";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#f4f5f4]">
      {mode === "edit" ? (
        <>
          <div className="px-4 pb-4 pt-8">
            <h1 className="text-[24px] font-extrabold leading-tight text-[#1f2725]">
              {parseDateLabel(date)}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-28">
            <div className="space-y-5">
              {MEAL_TYPES.map((mealType) => (
                <section
                  key={mealType}
                  className="rounded-[14px] border border-[#d4d9d7] bg-[#f6f7f6] px-3.5 py-3.5"
                >
                  <h2 className="mb-2 text-[24px] font-bold text-[#1f2725]">{MEAL_LABELS[mealType]}</h2>
                  <div className="space-y-1.5">
                    {draft[mealType].map((entry: MealEntry) => (
                      <div key={entry.id} className="flex items-center justify-between">
                        <span className="text-[18px] text-[#2a312f]">{entry.menuName}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(mealType, entry.id)}
                          className="rounded-md p-1 text-[#1f2523] hover:bg-[#e6ece9]"
                        >
                          <X className="h-4 w-4" />
                        </button>
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

          <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 bg-[#f4f5f4] px-4 pb-6 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={goHome}
                className="h-12 rounded-2xl bg-[#e5e7e6] text-[18px] font-semibold text-[#8a9390]"
              >
                취소하기
              </button>
              <button
                type="button"
                onClick={saveAndGoHome}
                disabled={isSaving}
                className="h-12 rounded-2xl bg-[#57bf8e] text-[18px] font-semibold text-white"
              >
                {isSaving ? "저장중..." : "저장하기"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pb-2 pt-5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-md p-1 text-[#1f2523] hover:bg-[#e6ece9]"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 className="text-[30px] font-bold text-[#232a28]">메뉴 추가</h2>
            <span className="w-7" />
          </div>

          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a9390]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="레시피명, 큐브명으로 검색"
                className="h-12 w-full rounded-2xl bg-[#e7e9e8] py-3 pl-10 pr-3 text-[18px] text-[#232a28] outline-none"
              />
            </div>
          </div>

          <div className="px-4 pt-3">
            <p className="text-[16px] text-[#7f8885]">최근 검색어</p>
            <div className="mt-2 flex gap-2">
              {[
                "감자",
                "당근",
                "브로콜리",
              ].map((tag) => (
                <span key={tag} className="rounded-full bg-[#dfe5e3] px-3 py-1 text-[13px] text-[#51605a]">
                  {tag} ×
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 border-b border-[#d2d8d6] px-4">
            <div className="grid grid-cols-3 text-center">
              <button
                type="button"
                onClick={() => setMenuTab("freq")}
                className={cn(
                  "pb-2 text-[20px] font-bold",
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
                  "pb-2 text-[20px] font-bold",
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
                  "pb-2 text-[20px] font-bold",
                  menuTab === "manual"
                    ? "border-b-2 border-[#57bf8e] text-[#232a28]"
                    : "text-[#232a28]"
                )}
              >
                직접 등록
              </button>
            </div>
          </div>

          <div className="flex gap-2 px-4 pt-3">
            {[
              { key: "all", label: "전체" },
              { key: "recipe", label: "레시피북" },
              { key: "fridge", label: "냉장고" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMenuSource(item.key as "all" | "recipe" | "fridge")}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-[16px] font-medium",
                  menuSource === item.key
                    ? "border-[#57bf8e] bg-[#57bf8e] text-white"
                    : "border-[#c7cecb] text-[#6e7673]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-3">
            {filteredMenus.map((menu) => {
              const selected = selectedNames.has(menu);
              return (
                <div key={menu} className="flex items-center justify-between border-b border-[#d5dbd9] py-3">
                  <span className="text-[20px] text-[#232a28]">{menu}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNames((prev) => {
                        const next = new Set(prev);
                        if (next.has(menu)) next.delete(menu);
                        else next.add(menu);
                        return next;
                      })
                    }
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-white",
                      selected ? "bg-[#57bf8e]" : "bg-[#a9dcca]"
                    )}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="px-4 pb-4 pt-2">
            <p className="mb-2 text-center text-sm text-[#97a09d]">
              현재 선택한 메뉴는 {MEAL_LABELS[targetMealType]}에 추가돼요
            </p>
            <button
              type="button"
              onClick={addSelectedMenus}
              className="h-12 w-full rounded-2xl bg-[#57bf8e] text-[18px] font-semibold text-white"
            >
              기록하기
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function MealEditPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f6f5]" />}>
      <MealEditPageContent />
    </Suspense>
  );
}
