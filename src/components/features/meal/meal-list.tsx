"use client";

import { Heart, SquarePen } from "lucide-react";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";

interface MealListProps {
  dayMeals: DayMeals | undefined;
  selectedDate: Date;
  dateKey: string;
  readOnly?: boolean;
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function formatKoreanDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일 ${dayOfWeek}요일`;
}

export function MealList({
  dayMeals,
  selectedDate,
  dateKey,
  readOnly = false,
}: MealListProps) {
  const router = useRouter();
  const dateLabel = formatKoreanDate(selectedDate);
  const totalMealCount = MEAL_TYPES.reduce(
    (sum, type) => sum + (dayMeals ? dayMeals[type].length : 0),
    0
  );

  return (
    <div className="flex-1 px-4 pb-24 pt-6 bg-[#fdfefd]">
      <p className="ml-3 mb-2 text-[12px] text-[#7f8885]">{dateLabel}</p>
      <div className="ml-3 mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-bold leading-none text-[#242b29]">
          오늘의 식단
        </h2>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => {
              const emptyDay: DayMeals = {
                date: dateKey,
                breakfast: [],
                lunch: [],
                dinner: [],
                snack: [],
              };
              localStorage.setItem(
                `nyampick:meal-edit:init:${dateKey}`,
                JSON.stringify(dayMeals ?? emptyDay)
              );
              router.push(`/meal/edit?date=${dateKey}`);
            }}
            className="rounded-md p-1 text-[#1f2523] transition-colors hover:bg-[#dfe5e3]"
            aria-label="식단 수정"
          >
            <SquarePen className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      {totalMealCount === 0 ? (
        <div className="rounded-[14px] border bg-[#fdfefd] px-4 py-10 text-center">
          <p className="text-[18px] font-normal text-[#6e7673]">
            아직 식단이 준비되지 않았습니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {MEAL_TYPES.map((type) => {
            const entries: MealEntry[] = dayMeals ? dayMeals[type] : [];
            return (
              <div
                key={type}
                className="rounded-[14px] border border-[#c8cfcd] bg-[#fdfefd] px-4 py-3.5"
              >
                <div className="mb-2">
                  <span className="text-[18px] font-bold leading-none text-[#252c2a]">
                    {MEAL_LABELS[type]}
                  </span>
                </div>

                {entries.length > 0 ? (
                  <div className="flex flex-col gap-1.5 pl-[10px]">
                    {entries.map((entry) => {
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[16px] font-medium leading-[1.25] text-[#2a312f]">
                            {entry.menuName}
                          </span>
                          {entry.reaction === "loved" ? (
                            <Heart className="h-5 w-5 fill-[#ff3848] text-[#ff3848]" />
                          ) : (
                            <span className="w-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[18px] font-normal text-[#6e7673]">
                    아직 식단이 준비되지 않았습니다
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
