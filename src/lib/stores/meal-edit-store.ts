import { create } from "zustand";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";

type MealEditMode = "edit" | "add";

interface MealEditState {
  initializedDate: string | null;
  draft: DayMeals;
  mode: MealEditMode;
  targetMealType: MealType;
  initialize: (date: string, initialDayMeals: DayMeals) => void;
  setMode: (mode: MealEditMode) => void;
  openAddForMeal: (mealType: MealType) => void;
  removeItem: (mealType: MealType, entryId: string) => void;
  updateItemQuantity: (
    mealType: MealType,
    entryId: string,
    quantity: string | undefined
  ) => void;
  addMenusToTarget: (menuNames: string[]) => void;
}

function createEmptyDay(date: string): DayMeals {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function cloneDayMeals(dayMeals: DayMeals): DayMeals {
  return {
    date: dayMeals.date,
    breakfast: [...dayMeals.breakfast],
    lunch: [...dayMeals.lunch],
    dinner: [...dayMeals.dinner],
    snack: [...dayMeals.snack],
  };
}

function toEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export const useMealEditStore = create<MealEditState>((set, get) => ({
  initializedDate: null,
  draft: createEmptyDay(""),
  mode: "edit",
  targetMealType: "breakfast",
  initialize: (date, initialDayMeals) =>
    set(() => ({
      initializedDate: date,
      draft: cloneDayMeals(initialDayMeals),
      mode: "edit",
      targetMealType: "breakfast",
    })),
  setMode: (mode) => set(() => ({ mode })),
  openAddForMeal: (mealType) =>
    set(() => ({
      mode: "add",
      targetMealType: mealType,
    })),
  removeItem: (mealType, entryId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [mealType]: state.draft[mealType].filter((entry) => entry.id !== entryId),
      },
    })),
  updateItemQuantity: (mealType, entryId, quantity) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [mealType]: state.draft[mealType].map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                quantity,
              }
            : entry
        ),
      },
    })),
  addMenusToTarget: (menuNames) => {
    if (menuNames.length === 0) return;
    const { targetMealType } = get();
    set((state) => {
      const newEntries: MealEntry[] = menuNames.map((menuName) => ({
        id: toEntryId(),
        menuName,
      }));
      return {
        mode: "edit",
        draft: {
          ...state.draft,
          [targetMealType]: [...state.draft[targetMealType], ...newEntries],
        },
      };
    });
  },
}));
