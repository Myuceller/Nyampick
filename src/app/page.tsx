"use client";

import { useState, useEffect, useMemo } from "react";
import { Baby, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { MealList } from "@/components/meal-list";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { authedFetch } from "@/lib/authed-fetch";
import type { DayMeals } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekDaysMondayStart(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthDays(date: Date): Array<Date | null> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Array<Date | null> = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    days.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d += 1) {
    days.push(new Date(year, month, d));
  }

  return days;
}

function getMealCountByDate(mealData: Record<string, DayMeals>, date: Date) {
  const key = formatDateKey(date);
  const day = mealData[key];
  if (!day) return 0;
  return (
    day.breakfast.length + day.lunch.length + day.dinner.length + day.snack.length
  );
}

export default function Page() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [mealData, setMealData] = useState<Record<string, DayMeals>>({});
  const [childName, setChildName] = useState("");
  const [childMonthsOld, setChildMonthsOld] = useState<number | null>(null);
  const [calendarMode, setCalendarMode] = useState<"weekly" | "monthly">(
    "weekly"
  );

  useEffect(() => {
    const load = async () => {
      let baseData: Record<string, DayMeals> = {};
      try {
        const [mealRes, childRes] = await Promise.all([
          authedFetch("/api/meals", { cache: "no-store" }),
          authedFetch("/api/children", { cache: "no-store" }),
        ]);

        if (mealRes.ok) {
          const mealJson = (await mealRes.json()) as { meals?: Record<string, DayMeals> };
          baseData = mealJson.meals ?? {};
        }
        if (childRes.ok) {
          const childJson = (await childRes.json()) as {
            children?: Array<{ name: string; monthsOld: number; isPrimary: boolean }>;
          };
          const children = childJson.children ?? [];
          const primary = children.find((child) => child.isPrimary) ?? children[0];
          if (primary) {
            setChildName(primary.name);
            setChildMonthsOld(primary.monthsOld);
          }
        }
      } catch {
        baseData = {};
      }

      const editedRaw = localStorage.getItem("mammanote:meal-edit:result");
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
        localStorage.removeItem("mammanote:meal-edit:result");
      }

      setMealData(baseData);
      setMounted(true);
    };

    void load();
  }, []);

  const dateKey = formatDateKey(selectedDate);
  const currentDayMeals = mealData[dateKey];
  const weekDays = useMemo(
    () => getWeekDaysMondayStart(selectedDate),
    [selectedDate]
  );
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const monthLabel = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;

  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[#f0f4f3]">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[rgb(#F3F8F4)] pb-24">
      <div className="px-4 pb-4 pt-11">
        <p className="text-[14px] text-[#6f7875]">안녕하세요 👋</p>
        <PwaInstallPrompt className="mt-3" />
        <h1 className="mt-2 mb-2 text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#1f2725]">
          {childName ? `${childName}의 식단` : "식단"}
        </h1>

        <div className="mt-3 rounded-[22px] bg-[#fdfefd] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#d6ebe2]">
                <Baby className="h-6 w-6 text-[#56be8d]" />
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-tight text-[#26302d]">
                  {childName || "이름 미설정"}
                </p>
                <p className="text-[14px] leading-tight text-[#77807d]">
                  {childMonthsOld === null ? "개월 정보 미설정" : `생후 ${childMonthsOld}개월`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/children")}
              className="rounded-[12px] bg-[#57bf8e] px-4 py-2 text-[10px] font-light text-white"
            >
              아기 관리
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-[#fdfefd] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-bold leading-none text-[#232a28]">
              이번 주 식단
            </h2>
            <button
              type="button"
              onClick={() =>
                setCalendarMode((prev) =>
                  prev === "weekly" ? "monthly" : "weekly"
                )
              }
              className="rounded-md p-1 text-[#202725] transition-colors hover:bg-[#e4e9e7]"
              aria-label="캘린더 보기 전환"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>

          {calendarMode === "weekly" ? (
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((date) => {
                const isSelected = formatDateKey(date) === dateKey;
                const count = getMealCountByDate(mealData, date);
                const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
                return (
                  <button
                    key={formatDateKey(date)}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "flex flex-col items-center rounded-[12px] px-1 py-2.5",
                      isSelected && "bg-[#57bf8e] text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[12px]",
                        isSelected ? "text-white/80" : "text-[#7a8380]"
                      )}
                    >
                      {dayLabel}
                    </span>
                    <span className="text-[14px] font-bold leading-none">
                      {date.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {count > 0 && (
                        <>
                          <span
                            className={cn(
                              "h-[3px] w-4 rounded-full",
                              isSelected ? "bg-white/70" : "bg-[#9ad7bc]"
                            )}
                          />
                          <span
                            className={cn(
                              "h-[3px] w-4 rounded-full",
                              isSelected ? "bg-white/60" : "bg-[#b6dfcb]"
                            )}
                          />
                          <span
                            className={cn(
                              "h-[3px] w-4 rounded-full",
                              isSelected ? "bg-white/50" : "bg-[#efdbc2]"
                            )}
                          />
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="mb-1 text-center text-[14px] font-bold text-[#242a26]">
                {monthLabel}
              </p>
              <div className="grid grid-cols-7 gap-y-2 text-center text-[12px]">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
                  <span
                    key={day}
                    className={cn(
                      idx === 0 ? "text-[#eb6f6f]" : "text-[#7b8680]"
                    )}
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-y-2 text-center">
                {monthDays.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="h-10" />;
                  }
                  const isSelected = formatDateKey(date) === dateKey;
                  return (
                    <button
                      key={formatDateKey(date)}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "mx-auto h-10 w-10 rounded-[12px] text-[14px] font-semibold text-[#26302d]",
                        isSelected && "bg-[#57bf8e] text-white"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-2 text-right">
            <button
              type="button"
              className="text-[12px] font-semibold text-[#57bf8e]"
            >
              전체보기
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#7bc8a3]" />

      <MealList
        dayMeals={currentDayMeals}
        selectedDate={selectedDate}
        dateKey={dateKey}
      />

      <BottomNav />
    </div>
  );
}
