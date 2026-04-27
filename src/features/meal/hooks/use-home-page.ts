"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/authed-fetch";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { DayMeals } from "@/lib/types";
import {
  formatDateKey,
  getMonthDays,
  getWeekDaysMondayStart,
} from "@/features/meal/lib/home-page-utils";

interface HomeSummaryPayload {
  meals?: Record<string, DayMeals>;
  primaryChild?: { name: string; monthsOld: number } | null;
}

const HOME_SUMMARY_CACHE_PREFIX = "nyampick:home-summary:v1:";

export function useHomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [mealData, setMealData] = useState<Record<string, DayMeals>>({});
  const [childName, setChildName] = useState("");
  const [childMonthsOld, setChildMonthsOld] = useState<number | null>(null);
  const [calendarMode, setCalendarMode] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    const applySummary = (summary?: HomeSummaryPayload) => {
      const nextMeals = summary?.meals ?? {};
      setMealData(nextMeals);

      const primary = summary?.primaryChild;
      if (primary) {
        setChildName(primary.name);
        setChildMonthsOld(primary.monthsOld);
      } else {
        setChildName("");
        setChildMonthsOld(null);
      }

      return nextMeals;
    };

    const applyPendingMealEdit = (baseData: Record<string, DayMeals>) => {
      const editedRaw = localStorage.getItem("nyampick:meal-edit:result");
      if (!editedRaw) return baseData;

      const nextData = { ...baseData };
      try {
        const parsed = JSON.parse(editedRaw) as {
          date: string;
          dayMeals: DayMeals;
        };
        if (parsed?.date && parsed?.dayMeals) {
          nextData[parsed.date] = parsed.dayMeals;
        }
      } catch {
        // ignore invalid persisted edit payload
      }
      localStorage.removeItem("nyampick:meal-edit:result");
      return nextData;
    };

    const load = async () => {
      let cacheKey: string | null = null;
      let hasDisplayedContent = false;
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        cacheKey = userId ? `${HOME_SUMMARY_CACHE_PREFIX}${userId}` : null;

        if (cacheKey) {
          const cachedRaw = sessionStorage.getItem(cacheKey);
          if (cachedRaw) {
            try {
              const cached = JSON.parse(cachedRaw) as HomeSummaryPayload;
              const cachedMeals = applyPendingMealEdit(applySummary(cached));
              setMealData(cachedMeals);
              setMounted(true);
              hasDisplayedContent = true;
            } catch {
              sessionStorage.removeItem(cacheKey);
            }
          }
        }

        const summaryRes = await authedFetch("/api/home/summary", {
          cache: "no-store",
        });
        if (summaryRes.ok) {
          const summaryJson = (await summaryRes.json()) as {
            summary?: HomeSummaryPayload;
          };
          const freshMeals = applyPendingMealEdit(applySummary(summaryJson.summary));
          setMealData(freshMeals);

          if (cacheKey && summaryJson.summary) {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ ...summaryJson.summary, meals: freshMeals })
            );
          }
        }
      } catch (error) {
        if (!hasDisplayedContent) {
          const editedMeals = applyPendingMealEdit({});
          setMealData(editedMeals);
        }
      } finally {
        setMounted(true);
      }
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
