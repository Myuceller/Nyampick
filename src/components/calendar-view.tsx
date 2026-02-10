"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayMeals, MealType } from "@/lib/types";

const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  mealData: Record<string, DayMeals>;
  viewMode: "monthly" | "weekly";
}

export function CalendarView({
  selectedDate,
  onDateSelect,
  mealData,
  viewMode,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const todayStr = formatDate(today);

  const daysInView = useMemo(() => {
    if (viewMode === "weekly") {
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
      });
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth, selectedDate, viewMode]);

  const goToPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const monthLabel = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  const getMealDots = (dateStr: string): MealType[] => {
    const dayData = mealData[dateStr];
    if (!dayData) return [];
    const dots: MealType[] = [];
    if (dayData.breakfast.length > 0) dots.push("breakfast");
    if (dayData.lunch.length > 0) dots.push("lunch");
    if (dayData.dinner.length > 0) dots.push("dinner");
    if (dayData.snack.length > 0) dots.push("snack");
    return dots;
  };

  const dotColorMap: Record<MealType, string> = {
    breakfast: "bg-meal-breakfast",
    lunch: "bg-meal-lunch",
    dinner: "bg-meal-dinner",
    snack: "bg-meal-snack",
  };

  return (
    <div className="bg-card px-4 pb-3">
      {viewMode === "monthly" && (
        <div className="flex items-center justify-between py-3">
          <button type="button" onClick={goToPrevMonth} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <button type="button" onClick={goToNextMonth} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {viewMode === "weekly" && (
        <div className="py-3">
          <span className="text-sm font-semibold text-foreground">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월{" "}
            {Math.ceil(selectedDate.getDate() / 7)}주차
          </span>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {DAYS_KR.map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-1 text-center text-[11px] font-medium",
              i === 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}

        {daysInView.map((date, i) => {
          if (!date)
            return <div key={`empty-${i}`} className="aspect-square" />;

          const dateStr = formatDate(date);
          const isToday = dateStr === todayStr;
          const isSelected =
            formatDate(selectedDate) === dateStr;
          const dots = getMealDots(dateStr);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl py-1.5 transition-all",
                viewMode === "weekly" ? "py-2" : "",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-secondary text-secondary-foreground"
                    : "text-foreground hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  isSelected ? "font-bold" : "font-medium"
                )}
              >
                {date.getDate()}
              </span>
              {dots.length > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {dots.map((dot) => (
                    <span
                      key={dot}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        isSelected ? "bg-primary-foreground/70" : dotColorMap[dot]
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
