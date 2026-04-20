import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { SECTION_META, SECTION_ORDER, sectionFromItem } from "./constants";
import {
  AiSheetView,
  FridgeItem,
  FridgeSection,
  FridgeSectionKey,
  GeneratedRecipe,
  RecipeItem,
  RecipeSource,
  TabKey,
  TasteLevel,
} from "./types";

interface SavedRecipeApiItem {
  id: string;
  title: string;
  subtitle?: string;
  taste?: TasteLevel;
  source?: RecipeSource;
  favorite?: boolean;
  link?: string;
  memo?: string;
}

interface SavedRecipesResponse {
  items?: SavedRecipeApiItem[];
  message?: string;
}

interface FridgeItemsResponse {
  items?: FridgeItem[];
  message?: string;
}

interface RecommendationApiItem {
  title?: string;
  subtitle?: string;
  taste?: TasteLevel;
  ingredients?: string[];
  steps?: string[];
  source_name?: string;
  source_url?: string;
}

interface RecommendationsResponse {
  recommendations?: RecommendationApiItem[];
  message?: string;
}

function normalizeTaste(taste: string | undefined): TasteLevel {
  if (taste === "좋아해요" || taste === "보통이에요" || taste === "싫어해요") {
    return taste;
  }
  return "보통이에요";
}

export function useRecipePage() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openAddForm, setOpenAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newTaste, setNewTaste] = useState<TasteLevel>("보통이에요");

  const [openAiSheet, setOpenAiSheet] = useState(false);
  const [aiSheetView, setAiSheetView] = useState<AiSheetView>("select");
  const [isLoadingFridge, setIsLoadingFridge] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [ingredientKeyword, setIngredientKeyword] = useState("");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [savedGeneratedIds, setSavedGeneratedIds] = useState<Set<string>>(new Set());
  const [isLoadingSavedRecipes, setIsLoadingSavedRecipes] = useState(true);
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editTaste, setEditTaste] = useState<TasteLevel>("보통이에요");

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredIngredientKeyword = useDeferredValue(ingredientKeyword);

  const filteredRecipes = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const tabMatched =
        activeTab === "all" ||
        (activeTab === "ai" && recipe.source === "ai") ||
        (activeTab === "favorite" && recipe.favorite);

      if (!tabMatched) return false;
      if (!q) return true;

      return (
        recipe.title.toLowerCase().includes(q) ||
        recipe.subtitle.toLowerCase().includes(q)
      );
    });
  }, [activeTab, deferredSearchQuery, recipes]);

  const aiRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.source === "ai"),
    [recipes]
  );

  const shouldShowAiEmpty = activeTab === "ai" && aiRecipes.length === 0;

  const detailRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === detailRecipeId) ?? null,
    [detailRecipeId, recipes]
  );

  const isOverlayOpen =
    openAiSheet || openAddForm || Boolean(editingRecipeId) || Boolean(detailRecipe);

  const ingredientSections = useMemo(() => {
    const keyword = deferredIngredientKeyword.trim();
    const grouped = new Map<FridgeSectionKey, FridgeItem[]>();
    for (const key of SECTION_ORDER) grouped.set(key, []);

    for (const item of fridgeItems) {
      if (keyword && !item.name.includes(keyword)) continue;
      const key = sectionFromItem(item);
      grouped.get(key)?.push(item);
    }

    return SECTION_ORDER.map((key) => ({
      key,
      label: SECTION_META[key].label,
      emoji: SECTION_META[key].emoji,
      items: grouped.get(key) ?? [],
    })).filter((section) => section.items.length > 0) as FridgeSection[];
  }, [deferredIngredientKeyword, fridgeItems]);

  const displayedIngredientIds = useMemo(
    () => ingredientSections.flatMap((section) => section.items.map((item) => item.id)),
    [ingredientSections]
  );

  const isAllDisplayedSelected =
    displayedIngredientIds.length > 0 &&
    displayedIngredientIds.every((id) => selectedIngredientIds.has(id));

  const loadSavedRecipes = async () => {
    try {
      setIsLoadingSavedRecipes(true);
      const res = await authedFetch("/api/recipes/saved", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as SavedRecipesResponse;
      if (!res.ok) throw new Error(json.message ?? "저장 레시피를 불러오지 못했습니다.");

      const mapped = (json.items ?? []).map((item: SavedRecipeApiItem): RecipeItem => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? "",
        taste: normalizeTaste(item.taste),
        source: item.source === "ai" ? "ai" : "manual",
        favorite: Boolean(item.favorite),
        ctaLabel: "레시피 보기 ↗",
        link: item.link,
        memo: item.memo,
        ingredients: [],
        steps: (item.memo ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      }));
      setRecipes(mapped);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장 레시피를 불러오지 못했습니다.";
      if (!message.includes("saved_recipes 테이블이 없습니다")) {
        alert(message);
      }
      setRecipes([]);
    } finally {
      setIsLoadingSavedRecipes(false);
    }
  };

  useEffect(() => {
    void loadSavedRecipes();
  }, []);

  const toggleFavorite = async (id: string) => {
    const current = recipes.find((recipe) => recipe.id === id);
    if (!current) return;
    const nextFavorite = !current.favorite;

    setRecipes((prev) =>
      prev.map((recipe) =>
        recipe.id === id ? { ...recipe, favorite: nextFavorite } : recipe
      )
    );

    const res = await authedFetch("/api/recipes/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, favorite: nextFavorite }),
    });

    if (!res.ok) {
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === id ? { ...recipe, favorite: current.favorite } : recipe
        )
      );
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      alert(json.message ?? "즐겨찾기 변경에 실패했습니다.");
    }
  };

  const deleteRecipe = async (id: string) => {
    const previous = recipes;
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    setOpenActionMenuId(null);

    const res = await authedFetch("/api/recipes/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      setRecipes(previous);
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      alert(json.message ?? "레시피 삭제에 실패했습니다.");
    }
  };

  const openEditRecipeModal = (recipe: RecipeItem) => {
    setEditingRecipeId(recipe.id);
    setEditName(recipe.title);
    setEditDescription(recipe.subtitle);
    setEditLink(recipe.link ?? "");
    setEditMemo(recipe.memo ?? "");
    setEditTaste(recipe.taste);
    setOpenActionMenuId(null);
  };

  const saveEditedRecipe = async () => {
    const trimmedName = editName.trim();
    if (!editingRecipeId || trimmedName.length === 0) return;
    const id = editingRecipeId;
    const patch = {
      title: trimmedName,
      subtitle: editDescription.trim(),
      link: editLink.trim(),
      memo: editMemo.trim(),
      taste: editTaste,
      steps: editMemo
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    };

    setRecipes((prev) =>
      prev.map((recipe) =>
        recipe.id === id
          ? {
              ...recipe,
              ...patch,
            }
          : recipe
      )
    );

    const res = await authedFetch("/api/recipes/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });

    if (!res.ok) {
      await loadSavedRecipes();
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      alert(json.message ?? "레시피 수정에 실패했습니다.");
      return;
    }

    setEditingRecipeId(null);
  };

  const loadFridgeItemsForAi = async () => {
    try {
      setIsLoadingFridge(true);
      const res = await authedFetch("/api/fridge/items", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as FridgeItemsResponse;
      if (!res.ok) throw new Error(json.message ?? "냉장고 재료를 불러오지 못했습니다.");
      setFridgeItems(json.items ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "냉장고 재료를 불러오지 못했습니다.";
      alert(message);
    } finally {
      setIsLoadingFridge(false);
    }
  };

  const openAiRecommendSheet = () => {
    setOpenAiSheet(true);
    setAiSheetView("select");
    if (fridgeItems.length === 0) {
      void loadFridgeItemsForAi();
    }
  };

  const closeAiRecommendSheet = () => {
    if (isGeneratingAi) return;
    setOpenAiSheet(false);
    setIngredientKeyword("");
  };

  const toggleSelectAllDisplayed = () => {
    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (isAllDisplayedSelected) {
        for (const id of displayedIngredientIds) next.delete(id);
      } else {
        for (const id of displayedIngredientIds) next.add(id);
      }
      return next;
    });
  };

  const toggleOneIngredient = (id: string) => {
    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (section: FridgeSection) => {
    const ids = section.items.map((item) => item.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIngredientIds.has(id));

    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const saveGeneratedRecipe = async (item: GeneratedRecipe) => {
    if (savedGeneratedIds.has(item.id)) return;

    try {
      const res = await authedFetch("/api/recipes/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          subtitle: item.subtitle,
          taste: item.taste,
          source: "ai",
          link: item.sourceUrl?.trim() || "",
          memo: item.steps.map((step, idx) => `${idx + 1}. ${step}`).join("\n"),
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        item?: SavedRecipeApiItem;
        message?: string;
      };

      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const saved: RecipeItem = {
        id: json.item.id,
        title: json.item.title,
        subtitle: json.item.subtitle ?? "",
        taste: normalizeTaste(json.item.taste),
        source: json.item.source === "ai" ? "ai" : "manual",
        favorite: Boolean(json.item.favorite),
        ctaLabel: "레시피 보기 ↗",
        link: json.item.link,
        memo: json.item.memo,
        ingredients: item.ingredients,
        steps: item.steps,
      };

      setRecipes((prev) => [saved, ...prev]);
      setSavedGeneratedIds((prev) => new Set(prev).add(item.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "레시피 저장에 실패했습니다.";
      alert(message);
    }
  };

  const requestAiRecipeFromSelection = async () => {
    const selectedNames = fridgeItems
      .filter((item) => selectedIngredientIds.has(item.id))
      .map((item) => item.name);

    if (selectedNames.length === 0) {
      alert("추천 받을 재료를 1개 이상 선택해주세요.");
      return;
    }

    try {
      setIsGeneratingAi(true);
      const res = await authedFetch("/api/recipes/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: selectedNames, limit: 3 }),
      });
      const json = (await res.json().catch(() => ({}))) as RecommendationsResponse;
      if (!res.ok) {
        throw new Error(json.message ?? "레시피 추천 생성에 실패했습니다.");
      }

      const recommended = (json.recommendations ?? [])
        .filter(
          (item: RecommendationApiItem) =>
            typeof item.title === "string" &&
            typeof item.subtitle === "string" &&
            typeof item.taste === "string" &&
            Array.isArray(item.ingredients) &&
            Array.isArray(item.steps)
        )
        .map((item: RecommendationApiItem, idx: number): GeneratedRecipe => ({
          id: `ai-result-${Date.now()}-${idx}`,
          title: (item.title ?? "").trim(),
          subtitle: (item.subtitle ?? "").trim(),
          taste: normalizeTaste(item.taste),
          ingredients: (item.ingredients ?? [])
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
            .slice(0, 8),
          steps: (item.steps ?? [])
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
            .slice(0, 5),
          sourceName:
            typeof item.source_name === "string" ? item.source_name.trim() : "",
          sourceUrl:
            typeof item.source_url === "string" ? item.source_url.trim() : "",
        }))
        .filter(
          (item) =>
            item.title.length > 0 &&
            item.subtitle.length > 0 &&
            item.ingredients.length > 0 &&
            item.steps.length > 0
        );

      if (recommended.length === 0) {
        throw new Error("추천 결과가 비어 있습니다. 재료를 바꿔 다시 시도해주세요.");
      }

      setGeneratedRecipes(recommended);
      setSavedGeneratedIds(new Set());
      setAiSheetView("result");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "레시피 추천 생성에 실패했습니다.";
      alert(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const submitCustomRecipe = async () => {
    const title = newTitle.trim();
    if (!title) return;

    try {
      const res = await authedFetch("/api/recipes/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle: newSubtitle.trim(),
          link: newLink.trim(),
          memo: newMemo.trim(),
          taste: newTaste,
          source: "manual",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        item?: SavedRecipeApiItem;
        message?: string;
      };

      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const newRecipe: RecipeItem = {
        id: json.item.id,
        title: json.item.title,
        subtitle: json.item.subtitle ?? "",
        taste: normalizeTaste(json.item.taste),
        source: json.item.source === "ai" ? "ai" : "manual",
        favorite: Boolean(json.item.favorite),
        ctaLabel: "레시피 보기 ↗",
        link: json.item.link,
        memo: json.item.memo,
        ingredients: [],
        steps: (json.item.memo ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      };

      setRecipes((prev) => [newRecipe, ...prev]);
      setOpenAddForm(false);
      setNewTitle("");
      setNewSubtitle("");
      setNewLink("");
      setNewMemo("");
      setNewTaste("보통이에요");
      setActiveTab("all");
    } catch (error) {
      const message = error instanceof Error ? error.message : "레시피 저장에 실패했습니다.";
      alert(message);
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filteredRecipes,
    shouldShowAiEmpty,
    isLoadingSavedRecipes,
    openActionMenuId,
    setOpenActionMenuId,
    detailRecipe,
    setDetailRecipeId,
    toggleFavorite,
    deleteRecipe,
    openEditRecipeModal,

    openAddForm,
    setOpenAddForm,
    newTitle,
    setNewTitle,
    newSubtitle,
    setNewSubtitle,
    newLink,
    setNewLink,
    newMemo,
    setNewMemo,
    newTaste,
    setNewTaste,
    submitCustomRecipe,

    editingRecipeId,
    setEditingRecipeId,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editLink,
    setEditLink,
    editMemo,
    setEditMemo,
    editTaste,
    setEditTaste,
    saveEditedRecipe,

    openAiSheet,
    aiSheetView,
    setAiSheetView,
    isGeneratingAi,
    isLoadingFridge,
    ingredientKeyword,
    setIngredientKeyword,
    ingredientSections,
    selectedIngredientIds,
    generatedRecipes,
    savedGeneratedIds,
    isAllDisplayedSelected,
    openAiRecommendSheet,
    closeAiRecommendSheet,
    toggleSelectAllDisplayed,
    toggleOneIngredient,
    toggleSection,
    requestAiRecipeFromSelection,
    saveGeneratedRecipe,

    isOverlayOpen,
  };
}
