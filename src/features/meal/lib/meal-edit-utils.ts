import type { DayMeals, MealType } from "@/lib/types";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
export const FREQUENT_MENUS: string[] = [];
export const RECENT_SEARCH_KEY = "nyampick:meal-edit:recent-searches";

export function createEmptyDay(date: string): DayMeals {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

export function parseDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "식단을 수정해요";
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일 ${dayOfWeek}요일의\n식단을 수정해요`;
}

export function parseCubeCount(quantity?: string) {
  if (!quantity) return 1;
  const numeric = Number.parseInt(quantity, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) return 1;
  return numeric;
}
