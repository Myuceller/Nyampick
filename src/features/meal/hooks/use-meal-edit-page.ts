"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import { useMealEditStore } from "@/lib/stores/meal-edit-store";
import type { DayMeals } from "@/lib/types";
import {
  createEmptyDay,
  FREQUENT_MENUS,
  RECENT_SEARCH_KEY,
} from "@/features/meal/lib/meal-edit-utils";

interface SavedRecipeMenuItem {
  id: string;
  title: string;
  source?: "ai" | "manual";
  favorite?: boolean;
}

interface FridgeMenuItem {
  id: string;
  name: string;
}

export function useMealEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? "";

  const mode = useMealEditStore((state) => state.mode);
  const targetMealType = useMealEditStore((state) => state.targetMealType);
  const draft = useMealEditStore((state) => state.draft);
  const initialize = useMealEditStore((state) => state.initialize);
  const setMode = useMealEditStore((state) => state.setMode);
  const openAddForMeal = useMealEditStore((state) => state.openAddForMeal);
  const removeItem = useMealEditStore((state) => state.removeItem);
  const updateItemQuantity = useMealEditStore((state) => state.updateItemQuantity);
  const addMenusToTarget = useMealEditStore((state) => state.addMenusToTarget);

  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [menuTab, setMenuTab] = useState<"freq" | "fav" | "manual">("freq");
  const [menuSource, setMenuSource] = useState<"all" | "recipe" | "ai" | "fridge">("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeMenuItem[]>([]);
  const [fridgeMenus, setFridgeMenus] = useState<FridgeMenuItem[]>([]);

  useEffect(() => {
    if (!date) return;
    const initRaw = localStorage.getItem(`nyampick:meal-edit:init:${date}`);
    if (!initRaw) {
      initialize(date, createEmptyDay(date));
      return;
    }
    try {
      const parsed = JSON.parse(initRaw) as DayMeals;
      initialize(date, parsed);
    } catch {
      initialize(date, createEmptyDay(date));
    }
  }, [date, initialize]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCH_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((value) => typeof value === "string").slice(0, 8));
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    const loadSavedRecipes = async () => {
      try {
        const response = await authedFetch("/api/recipes/saved", { cache: "no-store" });
        const json = (await response.json().catch(() => ({}))) as {
          items?: SavedRecipeMenuItem[];
          message?: string;
        };
        if (!response.ok) {
          throw new Error(json.message ?? "레시피 목록을 불러오지 못했습니다.");
        }
        setSavedRecipes(Array.isArray(json.items) ? json.items : []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "레시피 목록을 불러오지 못했습니다.";
        toast.error(message);
        setSavedRecipes([]);
      }
    };

    if (mode === "add") {
      void loadSavedRecipes();
    }
  }, [mode]);

  useEffect(() => {
    const loadFridgeMenus = async () => {
      try {
        const response = await authedFetch("/api/fridge/items", { cache: "no-store" });
        const json = (await response.json().catch(() => ({}))) as {
          items?: FridgeMenuItem[];
          message?: string;
        };
        if (!response.ok) {
          throw new Error(json.message ?? "냉장고 목록을 불러오지 못했습니다.");
        }
        setFridgeMenus(
          Array.isArray(json.items)
            ? json.items.filter((item) => typeof item?.name === "string")
            : []
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "냉장고 목록을 불러오지 못했습니다.";
        toast.error(message);
        setFridgeMenus([]);
      }
    };

    if (mode === "add") {
      void loadFridgeMenus();
    }
  }, [mode]);

  const filteredMenus = useMemo(() => {
    const query = search.trim().toLowerCase();
    const recipeSourceMatched = (item: SavedRecipeMenuItem) => {
      if (menuSource === "all") return true;
      if (menuSource === "recipe") return item.source !== "ai";
      if (menuSource === "ai") return item.source === "ai";
      return false;
    };

    const recipeNames = savedRecipes
      .filter((item) => {
        if (!recipeSourceMatched(item)) return false;
        if (menuTab === "fav") return Boolean(item.favorite);
        return true;
      })
      .map((item) => item.title.trim())
      .filter((title) => title.length > 0);

    const fridgeNames =
      menuTab === "manual" && (menuSource === "all" || menuSource === "fridge")
        ? fridgeMenus
            .map((item) => item.name.trim())
            .filter((name) => name.length > 0)
        : [];

    const base = (() => {
      if (menuTab === "freq") return FREQUENT_MENUS;
      if (menuSource === "fridge" && menuTab === "fav") return [];
      return Array.from(new Set([...recipeNames, ...fridgeNames]));
    })();

    if (!query) return base;
    return base.filter((name) => name.toLowerCase().includes(query));
  }, [fridgeMenus, menuSource, menuTab, savedRecipes, search]);

  const addSelectedMenus = () => {
    if (selectedNames.size === 0) return;
    addMenusToTarget(Array.from(selectedNames));
    setSelectedNames(new Set());
    setSearch("");
  };

  const addRecentSearch = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item !== value);
      return [value, ...filtered].slice(0, 8);
    });
  };

  const goHome = () => router.push("/meal");

  const saveAndGoHome = async () => {
    if (!date) {
      goHome();
      return;
    }

    try {
      setIsSaving(true);
      const response = await authedFetch("/api/meals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          meals: {
            breakfast: draft.breakfast,
            lunch: draft.lunch,
            dinner: draft.dinner,
            snack: draft.snack,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorBody.message ?? "식단 저장에 실패했습니다.");
      }

      const json = (await response.json()) as { meals?: DayMeals };
      if (json.meals) {
        localStorage.setItem(
          "nyampick:meal-edit:result",
          JSON.stringify({ date, dayMeals: json.meals })
        );
      }
      goHome();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "식단 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    addRecentSearch,
    addSelectedMenus,
    date,
    draft,
    filteredMenus,
    goHome,
    isSaving,
    menuSource,
    menuTab,
    mode,
    openAddForMeal,
    recentSearches,
    removeItem,
    saveAndGoHome,
    search,
    selectedNames,
    setMenuSource,
    setMenuTab,
    setMode,
    setSearch,
    setSelectedNames,
    targetMealType,
    updateItemQuantity,
  };
}
