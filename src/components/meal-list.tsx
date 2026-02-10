"use client";

import { Plus, Trash2, Heart, Meh, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";
import { MEAL_LABELS, MEAL_COLORS, MEAL_TEXT_COLORS } from "@/lib/types";

interface MealListProps {
  dayMeals: DayMeals | undefined;
  selectedDate: Date;
  onAddMeal: (mealType: MealType) => void;
  onRemoveMeal: (mealType: MealType, entryId: string) => void;
  onToggleReaction: (mealType: MealType, entryId: string) => void;
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const reactionIcons = {
  loved: Heart,
  okay: Meh,
  disliked: ThumbsDown,
};

const reactionColors = {
  loved: "text-destructive fill-destructive",
  okay: "text-meal-breakfast",
  disliked: "text-muted-foreground",
};

function formatKoreanDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일(${dayOfWeek})`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function MealList({
  dayMeals,
  selectedDate,
  onAddMeal,
  onRemoveMeal,
  onToggleReaction,
}: MealListProps) {
  const dateLabel = formatKoreanDate(selectedDate);
  const todayLabel = isToday(selectedDate) ? ", 오늘" : "";

  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-base font-bold text-foreground">
          {dateLabel}
          {todayLabel}
        </h2>
      </div>

      {/* Meal type tabs */}
      <div className="mb-4 flex gap-2">
        {MEAL_TYPES.map((type) => {
          const count = dayMeals ? dayMeals[type].length : 0;
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"
            >
              <span
                className={cn("h-2 w-2 rounded-full", MEAL_COLORS[type])}
              />
              <span className="text-xs font-medium text-foreground">
                {MEAL_LABELS[type]}
              </span>
              {count > 0 && (
                <span className="text-xs font-semibold text-muted-foreground">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Meal sections */}
      <div className="flex flex-col gap-4">
        {MEAL_TYPES.map((type) => {
          const entries: MealEntry[] = dayMeals ? dayMeals[type] : [];
          return (
            <div key={type} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", MEAL_COLORS[type])}
                />
                <span className={cn("text-sm font-semibold", MEAL_TEXT_COLORS[type])}>
                  {MEAL_LABELS[type]}
                </span>
              </div>

              {entries.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => {
                    const ReactionIcon = entry.reaction
                      ? reactionIcons[entry.reaction]
                      : null;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {entry.menuName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Reaction toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleReaction(type, entry.id)}
                            className={cn(
                              "rounded-full p-1 transition-colors hover:bg-muted",
                              entry.reaction
                                ? reactionColors[entry.reaction]
                                : "text-muted-foreground"
                            )}
                          >
                            {ReactionIcon ? (
                              <ReactionIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Heart className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveMeal(type, entry.id)}
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  아직 기록이 없어요
                </p>
              )}

              <button
                type="button"
                onClick={() => onAddMeal(type)}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                추가하기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
