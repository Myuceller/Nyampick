"use client";

import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MealList } from "@/components/features/meal/meal-list";
import { HomeSkeleton } from "@/components/features/meal/home-skeleton";
import { PwaInstallPrompt } from "@/components/layout/pwa-install-prompt";
import { cn } from "@/lib/utils";
import { useHomePage } from "@/features/meal/hooks/use-home-page";
import {
  formatDateKey,
  getMealMarkerCountByDate,
  MEAL_DOT_COLORS,
} from "@/features/meal/lib/home-page-utils";

export default function Page() {
  const {
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
  } = useHomePage();

  if (!mounted) {
    return (
      <>
        <HomeSkeleton />
        <BottomNav />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[#fdfefd] pb-24">
      <div className="bg-[#f3f8f4] px-4 pb-4 pt-11">
        <p className="text-[14px] text-[#6f7875]">안녕하세요 👋</p>
        <PwaInstallPrompt className="mt-3" />
        <h1 className="mt-2 mb-2 text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#1f2725]">
          {childName ? `${childName}의 식단` : "식단"}
        </h1>

        <div className="mt-3 rounded-[22px] bg-[#fdfefd] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-[12px]">
                {childPhotoUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${childPhotoUrl})` }}
                  />
                ) : (
                  <Image
                    src="/icons/icon-source-baby.png"
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain"
                  />
                )}
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
                const isToday = formatDateKey(date) === todayKey;
                const count = getMealMarkerCountByDate(mealData, date);
                const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
                return (
                  <button
                    key={formatDateKey(date)}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "flex flex-col items-center rounded-[12px] px-1 py-2.5",
                      !isSelected && isToday && "bg-[#e8f6ef]",
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
                    <div className="mt-1 flex h-[17px] flex-col justify-between">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span
                          key={`${formatDateKey(date)}-weekly-line-${i + 1}`}
                          className={cn(
                            "h-[3px] w-4 rounded-full",
                            i < count
                              ? isSelected
                                ? i === 0
                                  ? "bg-white/70"
                                  : i === 1
                                    ? "bg-white/60"
                                    : "bg-white/50"
                                : MEAL_DOT_COLORS[i]
                              : "bg-transparent"
                          )}
                        />
                      ))}
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
                    return <div key={`empty-${idx}`} className="h-12" />;
                  }
                  const isSelected = formatDateKey(date) === dateKey;
                  const isToday = formatDateKey(date) === todayKey;
                  const count = getMealMarkerCountByDate(mealData, date);
                  return (
                    <button
                      key={formatDateKey(date)}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                    className={cn(
                      "mx-auto flex h-12 w-10 flex-col items-center justify-center rounded-[12px] text-[#26302d]",
                      !isSelected && isToday && "bg-[#e8f6ef]",
                      isSelected && "bg-[#57bf8e] text-white"
                    )}
                  >
                      <span className="text-[14px] font-semibold leading-none">{date.getDate()}</span>
                      <span className="mt-1 flex h-2 items-center justify-center gap-1">
                        {Array.from({ length: count }).map((_, i) => (
                          <span
                            key={`${formatDateKey(date)}-monthly-dot-${i + 1}`}
                            className={cn("h-1.5 w-1.5 rounded-full", MEAL_DOT_COLORS[i])}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => router.push(`/meal/overview?date=${dateKey}`)}
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
