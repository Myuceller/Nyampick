import { normalizeIngredientList } from "./ingredient-normalize.ts";
import type { AiRecipeRecommendation } from "./recipe-types.ts";

const neutralSupplementalIngredients = ["쌀", "물", "육수"];

function normalizeInlineText(value: string) {
  return value
    .replace(/[{}\[\]`"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStep(value: string) {
  return normalizeInlineText(value)
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .trim();
}

export function normalizeRecipeRecommendation(
  recipe: AiRecipeRecommendation
): AiRecipeRecommendation {
  const ingredients = normalizeIngredientList(recipe.ingredients, { limit: 8 });

  for (const ingredient of neutralSupplementalIngredients) {
    if (ingredients.length >= 3) break;
    if (!ingredients.includes(ingredient)) ingredients.push(ingredient);
  }

  return {
    ...recipe,
    title: normalizeInlineText(recipe.title),
    subtitle: normalizeInlineText(recipe.subtitle),
    ingredients,
    steps: recipe.steps
      .map(normalizeStep)
      .filter((step, index, steps) => step.length > 0 && steps.indexOf(step) === index)
      .slice(0, 5),
    sourceName: recipe.sourceName ? normalizeInlineText(recipe.sourceName) : undefined,
    sourceUrl: recipe.sourceUrl?.trim() || undefined,
  };
}
