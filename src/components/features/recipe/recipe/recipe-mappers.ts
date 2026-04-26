import type { RecommendationItemDto, SavedRecipeItemDto } from "@/lib/dto/recipe";
import type { GeneratedRecipe, RecipeItem, TasteLevel } from "./types";

export function normalizeTaste(taste: string | undefined): TasteLevel {
  if (taste === "좋아해요" || taste === "보통이에요" || taste === "싫어해요") {
    return taste;
  }
  return "보통이에요";
}

export function mapSavedRecipeDtoToItem(item: SavedRecipeItemDto): RecipeItem {
  return {
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
  };
}

export function mapRecommendationDtoToGeneratedRecipe(
  item: RecommendationItemDto,
  id: string
): GeneratedRecipe | null {
  const title = (item.title ?? "").trim();
  const subtitle = (item.subtitle ?? "").trim();
  const ingredients = (item.ingredients ?? [])
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 8);
  const steps = (item.steps ?? [])
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 5);

  if (!title || !subtitle || ingredients.length === 0 || steps.length === 0) {
    return null;
  }

  return {
    id,
    title,
    subtitle,
    taste: normalizeTaste(item.taste),
    ingredients,
    steps,
    sourceName: typeof item.source_name === "string" ? item.source_name.trim() : "",
    sourceUrl: typeof item.source_url === "string" ? item.source_url.trim() : "",
  };
}
