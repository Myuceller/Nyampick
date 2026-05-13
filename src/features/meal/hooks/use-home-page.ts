"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authedJson } from "@/lib/authed-fetch";
import type { DayMeals } from "@/lib/types";
import {
  formatDateKey,
  getMonthDays,
  getWeekDaysMondayStart,
} from "@/features/meal/lib/home-page-utils";

export function useHomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [mealData, setMealData] = useState<Record<string, DayMeals>>({});
  const [childName, setChildName] = useState("");
  const [childMonthsOld, setChildMonthsOld] = useState<number | null>(null);
  const [childPhotoUrl, setChildPhotoUrl] = useState("");
  const [calendarMode, setCalendarMode] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    const load = async () => {
      let baseData: Record<string, DayMeals> = {};
      try {
        const summaryJson = await authedJson<{
          summary?: {
            meals?: Record<string, DayMeals>;
            primaryChild?: { name: string; monthsOld: number; photoUrl?: string } | null;
          };
        }>("/api/home/summary");
        baseData = summaryJson.summary?.meals ?? {};
        const primary = summaryJson.summary?.primaryChild;
        if (primary) {
          setChildName(primary.name);
          setChildMonthsOld(primary.monthsOld);
          setChildPhotoUrl(primary.photoUrl ?? "");
        } else {
          setChildName("");
          setChildMonthsOld(null);
          setChildPhotoUrl("");
        }
      } catch {
        baseData = {};
      }

      const editedRaw = localStorage.getItem("nyampick:meal-edit:result");
      if (editedRaw) {
        try {
          const parsed = JSON.parse(editedRaw) as {
            date: string;
            dayMeals: DayMeals;
          };
          if (parsed?.date && parsed?.dayMeals) {
            baseData[parsed.date] = parsed.dayMeals;
          }
        } catch {
          // ignore invalid persisted edit payload
        }
        localStorage.removeItem("nyampick:meal-edit:result");
      }

      setMealData(baseData);
      setMounted(true);
    };

    void load();
  }, []);

  const dateKey = formatDateKey(selectedDate);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const currentDayMeals = mealData[dateKey];
  const weekDays = useMemo(() => getWeekDaysMondayStart(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const monthLabel = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;

  return {
    calendarMode,
    childMonthsOld,
    childName,
    childPhotoUrl,
    currentDayMeals,
    dateKey,
    mealData,
    monthDays,
    monthLabel,
    mounted,
    router,
    selectedDate,
    setCalendarMode,
    setSelectedDate,
    todayKey,
    weekDays,
  };
}
