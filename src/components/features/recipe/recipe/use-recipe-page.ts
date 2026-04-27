import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import type { ApiMessageResponseDto } from "@/lib/dto/common";
import type { FridgeItemsResponseDto } from "@/lib/dto/fridge";
import type {
  RecommendationsResponseDto,
  SavedRecipeMutationResponseDto,
  SavedRecipesResponseDto,
} from "@/lib/dto/recipe";
import { SECTION_META, SECTION_ORDER, sectionFromItem } from "./constants";
import {
  mapRecommendationDtoToGeneratedRecipe,
  mapSavedRecipeDtoToItem,
} from "./recipe-mappers";
import {
  AiSheetView,
  FridgeItem,
  FridgeSection,
  FridgeSectionKey,
  GeneratedRecipe,
  RecipeItem,
  TabKey,
  TasteLevel,
} from "./types";

export type AiGenerationStage = "requesting" | "analyzing" | "finalizing";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const [aiGenerationStage, setAiGenerationStage] =
    useState<AiGenerationStage>("requesting");
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
  const [isSubmittingCustomRecipe, setIsSubmittingCustomRecipe] = useState(false);
  const [isSavingEditedRecipe, setIsSavingEditedRecipe] = useState(false);

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
      const json = (await res.json().catch(() => ({}))) as SavedRecipesResponseDto;
      if (!res.ok) throw new Error(json.message ?? "저장 레시피를 불러오지 못했습니다.");

      const mapped = (json.items ?? []).map(mapSavedRecipeDtoToItem);
      setRecipes(mapped);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장 레시피를 불러오지 못했습니다.";
      if (!message.includes("saved_recipes 테이블이 없습니다")) {
        toast.error(message);
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
      const json = (await res.json().catch(() => ({}))) as ApiMessageResponseDto;
      toast.error(json.message ?? "즐겨찾기 변경에 실패했습니다.");
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
      const json = (await res.json().catch(() => ({}))) as ApiMessageResponseDto;
      toast.error(json.message ?? "레시피 삭제에 실패했습니다.");
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
    if (!editingRecipeId || trimmedName.length === 0 || isSavingEditedRecipe) return;
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

    try {
      setIsSavingEditedRecipe(true);
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
        const json = (await res.json().catch(() => ({}))) as ApiMessageResponseDto;
        toast.error(json.message ?? "레시피 수정에 실패했습니다.");
        return;
      }

      setEditingRecipeId(null);
    } finally {
      setIsSavingEditedRecipe(false);
    }
  };

  const loadFridgeItemsForAi = async () => {
    try {
      setIsLoadingFridge(true);
      const res = await authedFetch("/api/fridge/items", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as FridgeItemsResponseDto;
      if (!res.ok) throw new Error(json.message ?? "냉장고 재료를 불러오지 못했습니다.");
      setFridgeItems((json.items ?? []) as FridgeItem[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "냉장고 재료를 불러오지 못했습니다.";
      toast.error(message);
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

      const json = (await res.json().catch(() => ({}))) as SavedRecipeMutationResponseDto;

      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const saved: RecipeItem = {
        ...mapSavedRecipeDtoToItem(json.item),
        ingredients: item.ingredients,
        steps: item.steps,
      };

      setRecipes((prev) => [saved, ...prev]);
      setSavedGeneratedIds((prev) => new Set(prev).add(item.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "레시피 저장에 실패했습니다.";
      toast.error(message);
    }
  };

  const requestAiRecipeFromSelection = async () => {
    if (isGeneratingAi) return;

    const selectedNames = fridgeItems
      .filter((item) => selectedIngredientIds.has(item.id))
      .map((item) => item.name);

    if (selectedNames.length === 0) {
      toast.error("추천 받을 재료를 1개 이상 선택해주세요.");
      return;
    }

    let analyzeTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      setIsGeneratingAi(true);
      setAiGenerationStage("requesting");
      analyzeTimer = setTimeout(() => {
        setAiGenerationStage((current) =>
          current === "requesting" ? "analyzing" : current
        );
      }, 700);

      const res = await authedFetch("/api/recipes/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: selectedNames, limit: 3 }),
      });

      if (analyzeTimer) {
        clearTimeout(analyzeTimer);
        analyzeTimer = null;
      }

      const json = (await res.json().catch(() => ({}))) as RecommendationsResponseDto;
      if (!res.ok) {
        throw new Error(json.message ?? "레시피 추천 생성에 실패했습니다.");
      }
      if ((json.allergyWarnings ?? []).length > 0) {
        const matchedValues = Array.from(
          new Set((json.allergyWarnings ?? []).map((warning) => warning.matchedValue))
        );
        const allergyNames = Array.from(
          new Set((json.allergyWarnings ?? []).map((warning) => warning.allergy))
        );
        toast.warning(
          `선택한 재료에 ${allergyNames.join(", ")} 알레르기와 관련된 재료가 있어요: ${matchedValues.join(", ")}. 추천에서는 제외할게요.`
        );
      }
      setAiGenerationStage("analyzing");

      const recommended = (json.recommendations ?? [])
        .map((item, idx) =>
          mapRecommendationDtoToGeneratedRecipe(item, `ai-result-${Date.now()}-${idx}`)
        )
        .filter((item): item is GeneratedRecipe => item !== null);

      if (recommended.length === 0) {
        throw new Error("추천 결과가 비어 있습니다. 재료를 바꿔 다시 시도해주세요.");
      }

      setAiGenerationStage("finalizing");
      await wait(250);
      setGeneratedRecipes(recommended);
      setSavedGeneratedIds(new Set());
      setAiSheetView("result");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "레시피 추천 생성에 실패했습니다.";
      toast.error(message);
    } finally {
      if (analyzeTimer) {
        clearTimeout(analyzeTimer);
      }
      setIsGeneratingAi(false);
      setAiGenerationStage("requesting");
    }
  };

  const submitCustomRecipe = async () => {
    const title = newTitle.trim();
    if (!title || isSubmittingCustomRecipe) return;

    try {
      setIsSubmittingCustomRecipe(true);
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
      const json = (await res.json().catch(() => ({}))) as SavedRecipeMutationResponseDto;

      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const newRecipe: RecipeItem = mapSavedRecipeDtoToItem(json.item);

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
      toast.error(message);
    } finally {
      setIsSubmittingCustomRecipe(false);
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
    isSubmittingCustomRecipe,
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
    isSavingEditedRecipe,
    saveEditedRecipe,

    openAiSheet,
    aiSheetView,
    setAiSheetView,
    isGeneratingAi,
    aiGenerationStage,
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
