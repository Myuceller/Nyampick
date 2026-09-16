import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi } from "@mobile/lib/api";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEntry {
  id: string;
  menuName: string;
  memo?: string;
  quantity?: string;
  reaction?: "loved" | "okay" | "disliked";
}

export interface DayMeals {
  date: string;
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  snack: MealEntry[];
}

export interface HomeSummary {
  date: string;
  meals: Record<string, DayMeals>;
  todayMeals: DayMeals;
  fridgeItemCount: number;
  familyMemberCount: number;
  primaryChild: {
    id: string;
    name: string;
    monthsOld: number;
    photoUrl?: string;
    babyFoodStartedOn?: string | null;
  } | null;
}

export function useHomeSummary() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setSummary(null);
      setError("로그인 세션을 확인할 수 없어요. 다시 로그인해주세요.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ summary?: HomeSummary; message?: string }>("/api/home/summary", session.access_token);
      if (!response.summary) throw new Error(response.message ?? "홈 데이터를 불러오지 못했습니다.");
      setSummary(response.summary);
    } catch (caught) {
      setSummary(null);
      setError(caught instanceof Error ? caught.message : "홈 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { error, isLoading, refresh, summary };
}
