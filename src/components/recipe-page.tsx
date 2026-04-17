"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/authed-fetch";
import { cn } from "@/lib/utils";
import { RecipeList } from "./recipe/recipe-list";
import { AppButton } from "./app-button";
import { AppSearchInput } from "./app-search-input";
import {
  SECTION_META,
  SECTION_ORDER,
  TAB_LABELS,
  sectionFromItem,
} from "./recipe/constants";
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
} from "./recipe/types";

const RecipeFormSheet = dynamic(
  () => import("./recipe/recipe-form-sheet").then((mod) => mod.RecipeFormSheet),
  { ssr: false }
);

const RecipeDetailOverlay = dynamic(
  () => import("./recipe/recipe-detail-overlay").then((mod) => mod.RecipeDetailOverlay),
  { ssr: false }
);

export function RecipePage() {
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
      grouped.get(key)!.push(item);
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
      const json = (await res.json().catch(() => ({}))) as {
        items?: Array<{
          id: string;
          title: string;
          subtitle?: string;
          taste?: TasteLevel;
          source?: RecipeSource;
          favorite?: boolean;
          link?: string;
          memo?: string;
        }>;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "저장 레시피를 불러오지 못했습니다.");

      const mapped = (json.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? "",
        taste:
          item.taste === "좋아해요" ||
          item.taste === "보통이에요" ||
          item.taste === "싫어해요"
            ? item.taste
            : "보통이에요",
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
      })) as RecipeItem[];
      setRecipes(mapped);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장 레시피를 불러오지 못했습니다.";
      // If migration is not applied yet, keep UI usable with empty state.
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
      const json = (await res.json().catch(() => ({}))) as {
        items?: FridgeItem[];
        message?: string;
      };
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
        item?: {
          id: string;
          title: string;
          subtitle?: string;
          taste?: TasteLevel;
          source?: RecipeSource;
          favorite?: boolean;
          link?: string;
          memo?: string;
        };
        message?: string;
      };
      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const saved: RecipeItem = {
        id: json.item.id,
        title: json.item.title,
        subtitle: json.item.subtitle ?? "",
        taste:
          json.item.taste === "좋아해요" ||
          json.item.taste === "보통이에요" ||
          json.item.taste === "싫어해요"
            ? json.item.taste
            : "보통이에요",
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
      const json = (await res.json().catch(() => ({}))) as {
        recommendations?: Array<{
          title?: string;
          subtitle?: string;
          taste?: TasteLevel;
          ingredients?: string[];
          steps?: string[];
          source_name?: string;
          source_url?: string;
        }>;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "레시피 추천 생성에 실패했습니다.");
      }

      const recommended = (json.recommendations ?? [])
        .filter(
          (item) =>
            typeof item.title === "string" &&
            typeof item.subtitle === "string" &&
            typeof item.taste === "string" &&
            Array.isArray(item.ingredients) &&
            Array.isArray(item.steps)
        )
        .map((item, idx) => ({
          id: `ai-result-${Date.now()}-${idx}`,
          title: item.title!.trim(),
          subtitle: item.subtitle!.trim(),
          taste:
            item.taste === "좋아해요" ||
            item.taste === "보통이에요" ||
            item.taste === "싫어해요"
              ? item.taste
              : "보통이에요",
          ingredients: item.ingredients!
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
            .slice(0, 8),
          steps: item.steps!
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
        item?: {
          id: string;
          title: string;
          subtitle?: string;
          taste?: TasteLevel;
          source?: RecipeSource;
          favorite?: boolean;
          link?: string;
          memo?: string;
        };
        message?: string;
      };
      if (!res.ok || !json.item) {
        throw new Error(json.message ?? "레시피 저장에 실패했습니다.");
      }

      const newRecipe: RecipeItem = {
        id: json.item.id,
        title: json.item.title,
        subtitle: json.item.subtitle ?? "",
        taste:
          json.item.taste === "좋아해요" ||
          json.item.taste === "보통이에요" ||
          json.item.taste === "싫어해요"
            ? json.item.taste
            : "보통이에요",
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f2f3f2] pb-[116px]">
      <div className="px-4 pb-3 pt-12">
        <div className="mb-6 flex items-center">
          <h1 className="text-[24px] font-black leading-none tracking-[-0.03em] text-[#1f2423]">
            레시피 북
          </h1>
        </div>

        <AppSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="레시피 검색"
          inputClassName="border-[#e7e9e8] bg-[#e9ebea]"
          iconClassName="left-5 h-[22px] w-[22px] text-[#97a09d]"
        />
      </div>

      <div className="border-b border-[#d3d7d5] px-4">
        <div className="grid grid-cols-3">
          {(["all", "ai", "favorite"] as TabKey[]).map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative py-3 text-[17px] font-extrabold text-[#252b29]",
                  !isActive && "text-[#2b3130]"
                )}
              >
                {TAB_LABELS[tab]}
                {isActive ? (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#4ec492]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 pt-4">
        {shouldShowAiEmpty ? (
          <div className="flex h-full flex-col items-center justify-start pt-20 text-center">
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#e6dbef]">
              <Sparkles className="h-14 w-14 text-[#8f24e8]" />
            </div>
            <h2 className="mt-9 text-[37px] font-black leading-tight text-[#202624]">
              냉장고 재료로 뭘 만들까요?
            </h2>
            <p className="mt-2 text-[15px] font-medium text-[#7d8682]">
              AI가 우리 아이를 위한 레시피를 추천해요
            </p>
            <button
              type="button"
              onClick={openAiRecommendSheet}
              className="mt-6 rounded-[16px] bg-gradient-to-r from-[#9740ff] to-[#f13693] px-10 py-3 text-[18px] font-semibold text-white"
            >
              레시피 추천받기
            </button>
          </div>
        ) : (
          <RecipeList
            isLoading={isLoadingSavedRecipes}
            recipes={filteredRecipes}
            openActionMenuId={openActionMenuId}
            onOpenDetail={setDetailRecipeId}
            onToggleFavorite={(id) => {
              void toggleFavorite(id);
            }}
            onToggleActionMenu={(id) =>
              setOpenActionMenuId((prev) => (prev === id ? null : id))
            }
            onOpenEdit={openEditRecipeModal}
            onDelete={(id) => {
              void deleteRecipe(id);
            }}
          />
        )}
      </div>

      {!isOverlayOpen ? (
        <div className="fixed bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 gap-3 px-4">
          <AppButton
            label="AI 추천"
            onClick={() => {
              setActiveTab("ai");
              openAiRecommendSheet();
            }}
            bgClassName="bg-gradient-to-r from-[#7000ff] to-[#bb18ff]"
            className="flex-1 rounded-full py-4 text-[18px] font-extrabold shadow-[0_8px_22px_rgba(119,30,235,0.35)]"
          />
          <AppButton
            label="레시피 추가"
            onClick={() => setOpenAddForm(true)}
            className="flex-1 rounded-full py-4 text-[18px] font-extrabold shadow-[0_8px_22px_rgba(87,191,142,0.3)]"
          />
        </div>
      ) : null}

      {openAiSheet ? (
        <div className="sheet-backdrop-in fixed inset-0 z-[80] bg-black/35">
          <div className="sheet-up absolute bottom-0 left-1/2 flex h-[88dvh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[28px] bg-[#f2f3f2] px-4 pb-6 pt-5">
            <div className="mb-3 flex items-center justify-center">
              <h3 className="text-[18px] font-extrabold text-[#1f2423]">AI 레시피 추천</h3>
              <button
                type="button"
                onClick={closeAiRecommendSheet}
                className="absolute right-4 rounded-full p-1"
                aria-label="추천 시트 닫기"
                disabled={isGeneratingAi}
              >
                <X className="h-7 w-7 text-[#1f2423]" />
              </button>
            </div>

            {isGeneratingAi ? (
              <div className="flex h-[calc(88dvh-96px)] flex-col items-center justify-center text-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#e6dbef]">
                  <LoaderCircle className="h-16 w-16 animate-spin text-[#8f24e8]" />
                </div>
                <h4 className="mt-10 text-[44px] font-black text-[#202624]">레시피 생성중</h4>
                <p className="mt-2 text-[15px] font-medium text-[#7d8682]">
                  해당 재료로 레시피를 찾고 있어요
                </p>
              </div>
            ) : aiSheetView === "result" ? (
              <>
                <h4 className="text-[34px] font-extrabold text-[#212726]">
                  레시피 추천 결과가 나왔어요!
                </h4>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#1f2523]">재료 다시 선택</span>
                  <button
                    type="button"
                    onClick={() => setAiSheetView("select")}
                    className="flex items-center gap-1 text-[16px] font-extrabold text-[#8f24e8]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    다시 추천
                  </button>
                </div>

                <div className="mt-3 max-h-[calc(88dvh-220px)] space-y-3 overflow-y-auto pr-1">
                  {generatedRecipes.map((item) => {
                    const saved = savedGeneratedIds.has(item.id);
                    return (
                      <article
                        key={item.id}
                        className="rounded-[14px] border border-[#c7cdca] bg-[#f4f5f4] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-[17px] font-extrabold text-[#232927]">{item.title}</h5>
                            <p className="mt-1 text-[15px] font-medium text-[#79827f]">
                              {item.subtitle}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => saveGeneratedRecipe(item)}
                            disabled={saved}
                            className={cn(
                              "flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-[14px] font-bold text-white",
                              saved ? "bg-[#9f8adf]" : "bg-[#8d27f3]"
                            )}
                          >
                            <Bookmark className="h-4 w-4" />
                            {saved ? "저장됨" : "저장"}
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.ingredients.map((ingredient) => (
                            <span
                              key={`${item.id}-${ingredient}`}
                              className="rounded-full bg-[#eee5fb] px-3 py-1 text-[13px] font-bold text-[#8f42ff]"
                            >
                              {ingredient}
                            </span>
                          ))}
                        </div>

                        <ol className="mt-4 list-decimal space-y-1 pl-5 text-[14px] font-medium text-[#6f7875]">
                          {item.steps.map((step) => (
                            <li key={`${item.id}-${step}`}>{step}</li>
                          ))}
                        </ol>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <h4 className="text-[20px] font-bold text-[#212726]">내 냉장고 재료</h4>
                <AppSearchInput
                  value={ingredientKeyword}
                  onChange={setIngredientKeyword}
                  placeholder="재료 검색"
                  wrapperClassName="mt-3"
                  inputClassName="bg-[#e9ebea] focus:border-[#7c35f2]"
                />

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={toggleSelectAllDisplayed}
                    className="mb-4 flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border",
                          isAllDisplayedSelected
                            ? "border-transparent bg-[#8729f2]"
                            : "border-transparent bg-[#cfd4d3]"
                        )}
                      >
                        {isAllDisplayedSelected ? <Check className="h-4 w-4 text-white" /> : null}
                      </span>
                      <span className="text-[15px] font-bold text-[#1f2523]">전체 선택</span>
                    </div>
                    <span className="text-[15px] font-medium text-[#1f2523]">
                      {selectedIngredientIds.size}개 선택됨
                    </span>
                  </button>

                  {isLoadingFridge ? (
                    <p className="py-8 text-center text-[16px] font-semibold text-[#6f7875]">
                      냉장고 재료를 불러오는 중...
                    </p>
                  ) : null}

                  {!isLoadingFridge && ingredientSections.length === 0 ? (
                    <p className="py-8 text-center text-[16px] font-semibold text-[#6f7875]">
                      선택 가능한 재료가 없습니다.
                    </p>
                  ) : null}

                  {!isLoadingFridge
                    ? ingredientSections.map((section) => {
                        const ids = section.items.map((item) => item.id);
                        const sectionSelected =
                          ids.length > 0 && ids.every((id) => selectedIngredientIds.has(id));

                        return (
                          <div key={section.key} className="mb-4">
                            <button
                              type="button"
                              onClick={() => toggleSection(section)}
                              className="mb-2 flex items-center gap-2"
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full border",
                                  sectionSelected
                                    ? "border-transparent bg-[#8729f2]"
                                    : "border-transparent bg-[#cfd4d3]"
                                )}
                              >
                                {sectionSelected ? <Check className="h-4 w-4 text-white" /> : null}
                              </span>
                              <span className="text-[16px] font-extrabold text-[#2f6953]">
                                {section.emoji} {section.label}
                              </span>
                            </button>

                            <div className="ml-8 flex flex-wrap gap-2">
                              {section.items.map((item) => {
                                const selected = selectedIngredientIds.has(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleOneIngredient(item.id)}
                                    className={cn(
                                      "rounded-full px-4 py-1.5 text-[16px] font-semibold",
                                      selected
                                        ? "bg-[#8d27f3] text-white"
                                        : "bg-[#e1e3e2] text-[#7e8683]"
                                    )}
                                  >
                                    {item.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void requestAiRecipeFromSelection();
                  }}
                  disabled={selectedIngredientIds.size === 0}
                  className={cn(
                    "mt-4 h-12 w-full shrink-0 rounded-full text-[18px] font-semibold text-white",
                    selectedIngredientIds.size > 0
                      ? "bg-gradient-to-r from-[#9640ff] to-[#f13693]"
                      : "bg-[#c9cecc]"
                  )}
                >
                  레시피 추천받기
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <RecipeDetailOverlay
        recipe={detailRecipe}
        onClose={() => setDetailRecipeId(null)}
        onToggleFavorite={(id) => {
          void toggleFavorite(id);
        }}
      />

      <RecipeFormSheet
        open={openAddForm}
        title="새 레시피 추가"
        closeAriaLabel="레시피 추가 닫기"
        name={newTitle}
        description={newSubtitle}
        link={newLink}
        memo={newMemo}
        taste={newTaste}
        submitLabel="레시피 저장하기"
        submitDisabled={!newTitle.trim()}
        onClose={() => setOpenAddForm(false)}
        onNameChange={setNewTitle}
        onDescriptionChange={setNewSubtitle}
        onLinkChange={setNewLink}
        onMemoChange={setNewMemo}
        onTasteChange={setNewTaste}
        onSubmit={() => {
          void submitCustomRecipe();
        }}
      />

      <RecipeFormSheet
        open={Boolean(editingRecipeId)}
        title="레시피 수정"
        closeAriaLabel="레시피 수정 닫기"
        name={editName}
        description={editDescription}
        link={editLink}
        memo={editMemo}
        taste={editTaste}
        submitLabel="수정 완료"
        submitDisabled={!editName.trim()}
        onClose={() => setEditingRecipeId(null)}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onLinkChange={setEditLink}
        onMemoChange={setEditMemo}
        onTasteChange={setEditTaste}
        onSubmit={() => {
          void saveEditedRecipe();
        }}
      />
    </div>
  );
}
