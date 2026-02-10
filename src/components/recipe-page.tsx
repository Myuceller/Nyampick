"use client";

import { useState } from "react";
import {
  ChefHat,
  Sparkles,
  X,
  Plus,
  Clock,
  AlertTriangle,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipe {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  difficulty: string;
  ingredients: string[];
  isBabyFriendly: boolean;
  tip?: string;
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "r1",
    name: "닭안심 채소죽",
    description:
      "부드러운 닭안심과 다양한 채소를 넣어 영양 가득한 죽이에요. 저염으로 아기에게 안전해요.",
    cookTime: "25분",
    difficulty: "쉬움",
    ingredients: ["닭안심", "당근", "감자", "브로콜리", "쌀"],
    isBabyFriendly: true,
    tip: "닭안심은 끓는 물에 한번 데친 후 사용하면 잡내가 줄어들어요.",
  },
  {
    id: "r2",
    name: "소고기 당근 진밥",
    description:
      "철분이 풍부한 소고기와 베타카로틴이 풍부한 당근으로 만든 영양 진밥이에요.",
    cookTime: "30분",
    difficulty: "쉬움",
    ingredients: ["소고기", "당근", "쌀", "참기름"],
    isBabyFriendly: true,
    tip: "소고기는 기름기가 적은 부위를 사용하세요.",
  },
  {
    id: "r3",
    name: "감자 치즈볼",
    description:
      "감자를 으깨서 치즈와 함께 동글동글 말아주면 아이가 좋아하는 간식이 돼요.",
    cookTime: "20분",
    difficulty: "보통",
    ingredients: ["감자", "치즈", "당근"],
    isBabyFriendly: true,
  },
  {
    id: "r4",
    name: "두부 시금치 계란찜",
    description:
      "부드러운 두부와 시금치, 계란을 함께 쪄서 단백질과 철분을 동시에 섭취할 수 있어요.",
    cookTime: "15분",
    difficulty: "쉬움",
    ingredients: ["두부", "시금치", "계란"],
    isBabyFriendly: true,
    tip: "시금치는 끓는 물에 살짝 데쳐 옥살산을 제거하고 사용하세요.",
  },
];

const POPULAR_INGREDIENTS = [
  "소고기",
  "닭안심",
  "두부",
  "계란",
  "감자",
  "당근",
  "브로콜리",
  "시금치",
  "고구마",
  "쌀",
  "치즈",
  "바나나",
];

export function RecipePage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const addIngredient = (name: string) => {
    if (!ingredients.includes(name)) {
      setIngredients((prev) => [...prev, name]);
    }
  };

  const removeIngredient = (name: string) => {
    setIngredients((prev) => prev.filter((i) => i !== name));
  };

  const handleInputSubmit = () => {
    if (inputValue.trim() && !ingredients.includes(inputValue.trim())) {
      setIngredients((prev) => [...prev, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleSearch = () => {
    if (ingredients.length === 0) return;
    setIsSearching(true);
    // Simulate AI search
    setTimeout(() => {
      const matched = SAMPLE_RECIPES.filter((recipe) =>
        recipe.ingredients.some((ing) =>
          ingredients.some(
            (userIng) =>
              ing.includes(userIng) || userIng.includes(ing)
          )
        )
      );
      setRecipes(matched.length > 0 ? matched : SAMPLE_RECIPES.slice(0, 2));
      setIsSearching(false);
    }, 1200);
  };

  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-meal-breakfast" />
          <h2 className="text-lg font-bold text-foreground">AI 레시피 추천</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          집에 있는 재료를 입력하면 유아식 레시피를 추천해 드려요
        </p>
      </div>

      {/* Ingredient input */}
      <div className="mb-4">
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="재료를 입력하세요 (예: 소고기, 감자)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
            className="w-full rounded-xl border border-input bg-card py-3 pl-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleInputSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-1.5 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Popular ingredients */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            자주 쓰는 재료
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_INGREDIENTS.map((ing) => {
              const isAdded = ingredients.includes(ing);
              return (
                <button
                  key={ing}
                  type="button"
                  onClick={() =>
                    isAdded ? removeIngredient(ing) : addIngredient(ing)
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isAdded
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ing}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected ingredients */}
        {ingredients.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              선택한 재료 ({ingredients.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ingredients.map((ing) => (
                <span
                  key={ing}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                >
                  {ing}
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing)}
                    className="ml-0.5 rounded-full hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={ingredients.length === 0 || isSearching}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors",
            ingredients.length > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isSearching ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              레시피 찾는 중...
            </>
          ) : (
            <>
              <ChefHat className="h-4 w-4" />
              레시피 추천받기
            </>
          )}
        </button>
      </div>

      {/* Recipe results */}
      {recipes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            추천 레시피 ({recipes.length})
          </h3>
          {recipes.map((recipe) => {
            const isExpanded = expandedRecipe === recipe.id;
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() =>
                  setExpandedRecipe(isExpanded ? null : recipe.id)
                }
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {recipe.name}
                      </h4>
                      {recipe.isBabyFriendly && (
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          유아식
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {recipe.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {recipe.cookTime}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Utensils className="h-3 w-3" />
                    {recipe.difficulty}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      필요한 재료
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {recipe.ingredients.map((ing) => {
                        const userHas = ingredients.some(
                          (ui) => ui.includes(ing) || ing.includes(ui)
                        );
                        return (
                          <span
                            key={ing}
                            className={cn(
                              "rounded-full px-2 py-1 text-[11px] font-medium",
                              userHas
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {ing}
                            {!userHas && " (필요)"}
                          </span>
                        );
                      })}
                    </div>

                    {recipe.tip && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-meal-breakfast/10 px-3 py-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-meal-breakfast" />
                        <p className="text-[11px] text-foreground">
                          {recipe.tip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state when no search yet */}
      {recipes.length === 0 && !isSearching && (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
          <ChefHat className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            재료를 선택하고 추천받기를 눌러보세요
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            저염 유아식 레시피를 AI가 추천해 드려요
          </p>
        </div>
      )}
    </div>
  );
}
