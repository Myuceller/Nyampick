"use client";

import { useState, useCallback, useEffect } from "react";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/app-header";
import { BottomNav, type TabId } from "@/components/bottom-nav";
import { CalendarView } from "@/components/calendar-view";
import { MealList } from "@/components/meal-list";
import { AddMealSheet } from "@/components/add-meal-sheet";
import { WeeklyBoard } from "@/components/weekly-board";
import { RecipePage } from "@/components/recipe-page";
import { CommunityPage } from "@/components/community-page";
import { MyPage } from "@/components/my-page";
import type { DayMeals, MealType } from "@/lib/types";
import { getSampleMealData, createMealEntry } from "@/lib/meal-store";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [mealData, setMealData] = useState<Record<string, DayMeals>>({});
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");

  useEffect(() => {
    setMealData(getSampleMealData());
    setMounted(true);
  }, []);

  // Add meal sheet state
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType>("breakfast");

  const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const currentDayMeals = mealData[dateKey];

  const handleAddMeal = useCallback((mealType: MealType) => {
    setAddMealType(mealType);
    setAddMealOpen(true);
  }, []);

  const handleRemoveMeal = useCallback(
    (mealType: MealType, entryId: string) => {
      setMealData((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...day,
            [mealType]: day[mealType].filter(
              (e: { id: string }) => e.id !== entryId
            ),
          },
        };
      });
    },
    [dateKey]
  );

  const handleToggleReaction = useCallback(
    (mealType: MealType, entryId: string) => {
      const reactions: Array<"loved" | "okay" | "disliked" | undefined> = [
        "loved",
        "okay",
        "disliked",
        undefined,
      ];
      setMealData((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...day,
            [mealType]: day[mealType].map(
              (e: { id: string; reaction?: string }) => {
                if (e.id !== entryId) return e;
                const currentIdx = reactions.indexOf(
                  e.reaction as "loved" | "okay" | "disliked" | undefined
                );
                const nextReaction =
                  reactions[(currentIdx + 1) % reactions.length];
                return { ...e, reaction: nextReaction };
              }
            ),
          },
        };
      });
    },
    [dateKey]
  );

  const handleAddItems = useCallback(
    (items: string[]) => {
      setMealData((prev) => {
        const day = prev[dateKey] || {
          date: dateKey,
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: [],
        };
        return {
          ...prev,
          [dateKey]: {
            ...day,
            [addMealType]: [
              ...day[addMealType],
              ...items.map((name) => createMealEntry(name)),
            ],
          },
        };
      });
    },
    [dateKey, addMealType]
  );

  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <AppHeader />

      {activeTab === "calendar" && (
        <>
          {/* View mode toggle */}
          <div className="flex items-center justify-end gap-1 bg-card px-4 pb-1 pt-2">
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {viewMode === "monthly" ? (
            <>
              <CalendarView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                mealData={mealData}
                viewMode={viewMode}
              />

              <div className="h-px bg-border" />

              <MealList
                dayMeals={currentDayMeals}
                selectedDate={selectedDate}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                onToggleReaction={handleToggleReaction}
              />
            </>
          ) : (
            <WeeklyBoard
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              mealData={mealData}
            />
          )}

          <AddMealSheet
            open={addMealOpen}
            onOpenChange={setAddMealOpen}
            mealType={addMealType}
            onAddItems={handleAddItems}
          />
        </>
      )}

      {activeTab === "recipe" && <RecipePage />}
      {activeTab === "community" && <CommunityPage />}
      {activeTab === "mypage" && <MyPage />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
