import type { DayMeals } from "@/lib/types";

export const MEAL_DOT_COLORS = ["bg-[#9ad7bc]", "bg-[#b6dfcb]", "bg-[#efdbc2]"] as const;

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getWeekDaysMondayStart(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

export function getMonthDays(date: Date): Array<Date | null> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Array<Date | null> = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

export function getMealMarkerCountByDate(mealData: Record<string, DayMeals>, date: Date) {
  const key = formatDateKey(date);
  const day = mealData[key];
  if (!day) return 0;

  const filledMeals = [
    day.breakfast.length > 0,
    day.lunch.length > 0,
    day.dinner.length > 0,
    day.snack.length > 0,
  ].filter(Boolean).length;

  return Math.min(3, filledMeals);
}
