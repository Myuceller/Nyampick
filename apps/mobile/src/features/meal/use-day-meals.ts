import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import type { DayMeals, MealEntry, MealType } from "@mobile/features/home/use-home-summary";
import { getAuthedApi, requestAuthedApi } from "@mobile/lib/api";

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyDayMeals(date: string): DayMeals {
  return { date, breakfast: [], lunch: [], dinner: [], snack: [] };
}

export function useDayMeals(selectedDate?: string) {
  const { session } = useAuth();
  const date = useMemo(() => selectedDate ?? todayKey(), [selectedDate]);
  const [meals, setMeals] = useState<DayMeals>(() => emptyDayMeals(date));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ meals?: DayMeals; message?: string }>(`/api/meals?date=${date}`, session.access_token);
      setMeals(response.meals ?? emptyDayMeals(date));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "식단을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [date, session?.access_token]);

  const loadAllMeals = useCallback(async () => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const response = await getAuthedApi<{ meals?: Record<string, DayMeals>; message?: string }>("/api/meals", session.access_token);
    return response.meals ?? {};
  }, [session?.access_token]);

  const addMeal = useCallback(async (mealType: MealType, name: string) => {
    const item = name.trim();
    if (!item) throw new Error("메뉴 이름을 입력해주세요.");
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ meals?: DayMeals; message?: string }>("/api/meals", session.access_token, {
        method: "POST",
        body: { date, mealType, items: [item] },
      });
      setMeals(response.meals ?? emptyDayMeals(date));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "식단을 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [date, session?.access_token]);

  const updateReaction = useCallback(async (mealType: MealType, entryId: string, reaction: "loved" | "okay" | "disliked" | null) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ meals?: DayMeals; message?: string }>("/api/meals", session.access_token, {
        method: "PATCH",
        body: { date, mealType, entryId, reaction },
      });
      setMeals(response.meals ?? emptyDayMeals(date));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "식단 반응을 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [date, session?.access_token]);

  const updateMeal = useCallback(async (mealType: MealType, entryId: string, patch: Pick<MealEntry, "menuName" | "quantity" | "memo">) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const menuName = patch.menuName.trim();
    if (!menuName) throw new Error("메뉴 이름을 입력해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ meals?: DayMeals; message?: string }>("/api/meals", session.access_token, {
        method: "PATCH",
        body: { date, mealType, entryId, menuName, quantity: patch.quantity?.trim() || "", memo: patch.memo?.trim() || "" },
      });
      setMeals(response.meals ?? emptyDayMeals(date));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "식단을 수정하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [date, session?.access_token]);

  const removeMeal = useCallback(async (mealType: MealType, entryId: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ meals?: DayMeals; message?: string }>("/api/meals", session.access_token, {
        method: "DELETE",
        body: { date, mealType, entryId },
      });
      setMeals(response.meals ?? emptyDayMeals(date));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "식단을 삭제하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [date, session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { addMeal, date, error, isLoading, isSaving, loadAllMeals, meals, refresh, removeMeal, updateMeal, updateReaction };
}
