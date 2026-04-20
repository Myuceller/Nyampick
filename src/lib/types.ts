export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-meal-breakfast",
  lunch: "bg-meal-lunch",
  dinner: "bg-meal-dinner",
  snack: "bg-meal-snack",
};

export const MEAL_TEXT_COLORS: Record<MealType, string> = {
  breakfast: "text-meal-breakfast",
  lunch: "text-meal-lunch",
  dinner: "text-meal-dinner",
  snack: "text-meal-snack",
};

export interface MenuItem {
  id: string;
  name: string;
  category: "rice" | "soup" | "side" | "snack" | "vitamin" | "other";
  isFavorite: boolean;
}

export interface MealEntry {
  id: string;
  menuName: string;
  quantity?: string;
  reaction?: "loved" | "okay" | "disliked";
  memo?: string;
}

export interface DayMeals {
  date: string;
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  snack: MealEntry[];
}

export interface NutritionSummary {
  carbs: number;
  protein: number;
  fat: number;
  total: number;
}

export const CATEGORY_LABELS: Record<MenuItem["category"], string> = {
  rice: "밥/죽",
  soup: "국/탕",
  side: "반찬",
  snack: "간식",
  vitamin: "비타민",
  other: "기타",
};
