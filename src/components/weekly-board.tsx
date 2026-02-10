"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayMeals, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";

const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

const MEAL_ROW_COLORS: Record<MealType, { bg: string; text: string; dot: string }> = {
  breakfast: { bg: "bg-orange-50", text: "text-meal-breakfast", dot: "bg-meal-breakfast" },
  lunch: { bg: "bg-emerald-50", text: "text-meal-lunch", dot: "bg-meal-lunch" },
  dinner: { bg: "bg-blue-50", text: "text-meal-dinner", dot: "bg-meal-dinner" },
  snack: { bg: "bg-pink-50", text: "text-meal-snack", dot: "bg-meal-snack" },
};

interface WeeklyBoardProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  mealData: Record<string, DayMeals>;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WeeklyBoard({
  selectedDate,
  onDateSelect,
  mealData,
}: WeeklyBoardProps) {
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const today = new Date();
  const todayStr = formatLocalDate(today);

  const goToPrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    onDateSelect(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    onDateSelect(next);
  };

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-card">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={goToPrevWeek}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </p>
          <p className="text-xs text-muted-foreground">{weekLabel}</p>
        </div>
        <button
          type="button"
          onClick={goToNextWeek}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekly grid board */}
      <div className="flex-1 overflow-auto px-3 pb-4 no-scrollbar">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Day header row */}
          <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border bg-secondary/50">
            <div className="flex items-center justify-center border-r border-border py-2">
              <span className="text-[10px] font-medium text-muted-foreground">WEEKLY</span>
            </div>
            {weekDates.map((date, i) => {
              const dateStr = formatLocalDate(date);
              const isToday = dateStr === todayStr;
              const isSelected = formatLocalDate(selectedDate) === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onDateSelect(date)}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-border py-2 transition-colors last:border-r-0",
                    isSelected && "bg-primary/10",
                    !isSelected && "hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      i === 0 ? "text-destructive" : "text-muted-foreground",
                      isSelected && "text-primary"
                    )}
                  >
                    {DAYS_KR[i]}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      isToday && !isSelected && "bg-primary text-primary-foreground",
                      isSelected && "bg-primary text-primary-foreground",
                      !isToday && !isSelected && "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Meal rows */}
          {mealTypes.map((mealType) => {
            const colors = MEAL_ROW_COLORS[mealType];
            return (
              <div
                key={mealType}
                className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border last:border-b-0"
              >
                {/* Meal type label */}
                <div
                  className={cn(
                    "flex items-center justify-center border-r border-border",
                    colors.bg
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
                    <span className={cn("text-[10px] font-semibold", colors.text)}>
                      {MEAL_LABELS[mealType]}
                    </span>
                  </div>
                </div>

                {/* Day cells */}
                {weekDates.map((date, i) => {
                  const dateStr = formatLocalDate(date);
                  const dayData = mealData[dateStr];
                  const entries = dayData ? dayData[mealType] : [];
                  const isSelected = formatLocalDate(selectedDate) === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => onDateSelect(date)}
                      className={cn(
                        "flex min-h-[56px] flex-col items-start justify-start border-r border-border p-1 transition-colors last:border-r-0",
                        isSelected && "bg-primary/5",
                        !isSelected && "hover:bg-muted/30"
                      )}
                    >
                      {entries.length > 0 ? (
                        entries.map((entry) => (
                          <span
                            key={entry.id}
                            className={cn(
                              "block w-full truncate text-[9px] leading-tight",
                              entry.reaction === "loved"
                                ? "font-semibold text-foreground"
                                : entry.reaction === "disliked"
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground/80"
                            )}
                          >
                            {entry.menuName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-muted-foreground/40">-</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
