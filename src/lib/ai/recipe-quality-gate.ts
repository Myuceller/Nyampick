import { normalizeIngredientList } from "./ingredient-normalize.ts";
import { normalizeRecipeRecommendation } from "./recipe-normalize.ts";
import type {
  AiRecipeRecommendation,
  GenerateRecipeInput,
  RecipeQualityResult,
  RecipeRejectReason,
} from "./recipe-types.ts";

export const recipeRejectReasons: RecipeRejectReason[] = [
  "title_too_long",
  "subtitle_too_long",
  "too_few_ingredients",
  "too_few_steps",
  "missing_source",
  "awkward_pair",
  "missing_allergy_caution",
  "not_enough_input_match",
];

const awkwardIngredientPairs: [string, string][] = [
  ["바나나", "소고기"],
  ["바나나", "닭고기"],
  ["바나나", "양파"],
  ["새우", "우유"],
  ["새우", "치즈"],
];

const allergyIngredients = ["계란", "달걀", "두부", "우유", "치즈", "새우"];
const neutralSupplementalIngredients = ["쌀", "물", "육수"];

function includesTerm(text: string, term: string) {
  return text.replaceAll(/\s+/g, "").includes(term.replaceAll(/\s+/g, ""));
}

function recipeText(recipe: AiRecipeRecommendation) {
  return [
    recipe.title,
    recipe.subtitle,
    ...recipe.ingredients,
    ...recipe.steps,
  ].join(" ");
}

function hasAwkwardPair(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  return awkwardIngredientPairs.some(([left, right]) => {
    return includesTerm(text, left) && includesTerm(text, right);
  });
}

function inputHasAwkwardPair(input: GenerateRecipeInput) {
  const selected = input.ingredients.join(" ");
  return awkwardIngredientPairs.some(([left, right]) => {
    return includesTerm(selected, left) && includesTerm(selected, right);
  });
}

function hasAllergyIngredient(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  return allergyIngredients.some((ingredient) => includesTerm(text, ingredient));
}

function hasAllergyCaution(recipe: AiRecipeRecommendation) {
  const text = recipe.steps.join(" ");
  return ["알레르", "주의", "소량", "반응", "확인", "전문가", "의사"].some((term) =>
    includesTerm(text, term)
  );
}

function replaceAllTerms(text: string, terms: string[], replacement: string) {
  return terms.reduce((current, term) => current.replaceAll(term, replacement), text);
}

function getAwkwardTermsToRemove(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  const terms = new Set<string>();
  for (const [left, right] of awkwardIngredientPairs) {
    if (!includesTerm(text, left) || !includesTerm(text, right)) continue;
    if (left === "바나나") {
      terms.add(left);
    } else if (right === "우유" || right === "치즈") {
      terms.add(right);
    } else {
      terms.add(right);
    }
  }
  return [...terms];
}

export function normalizeRecipeQuality(recipe: AiRecipeRecommendation): AiRecipeRecommendation {
  const recipeBase = normalizeRecipeRecommendation(recipe);
  const awkwardTerms = getAwkwardTermsToRemove(recipeBase);
  const replacement = "물";
  const ingredients = recipeBase.ingredients
    .filter((ingredient) => !awkwardTerms.some((term) => includesTerm(ingredient, term)))
    .map((ingredient) => replaceAllTerms(ingredient, awkwardTerms, replacement))
    .filter((ingredient, index, items) => ingredient.trim().length > 0 && items.indexOf(ingredient) === index);

  for (const ingredient of neutralSupplementalIngredients) {
    if (ingredients.length >= 3) break;
    if (!ingredients.includes(ingredient)) ingredients.push(ingredient);
  }

  const normalized: AiRecipeRecommendation = {
    ...recipeBase,
    title: replaceAllTerms(recipeBase.title, awkwardTerms, "").replaceAll(/\s+/g, " ").trim(),
    subtitle: replaceAllTerms(recipeBase.subtitle, awkwardTerms, "").replaceAll(/\s+/g, " ").trim(),
    ingredients,
    steps: recipeBase.steps.map((step) => replaceAllTerms(step, awkwardTerms, replacement)),
  };

  if (hasAllergyIngredient(normalized) && !hasAllergyCaution(normalized)) {
    normalized.steps = [
      ...normalized.steps,
      "알레르기 반응을 소량부터 확인한다.",
    ].slice(0, 5);
  }

  return normalized;
}

function titleLength(value: string) {
  return [...value].length;
}

function countInputIngredients(recipe: AiRecipeRecommendation, input: GenerateRecipeInput) {
  const text = recipeText(recipe);
  return input.ingredients.filter((ingredient) => includesTerm(text, ingredient)).length;
}

export function evaluateRecipeQuality(
  recipe: AiRecipeRecommendation,
  input: GenerateRecipeInput
): RecipeQualityResult {
  const normalizedRecipe = normalizeRecipeRecommendation(recipe);
  const normalizedInput = {
    ...input,
    ingredients: normalizeIngredientList(input.ingredients),
  };
  const reasons: RecipeRejectReason[] = [];

  if (titleLength(normalizedRecipe.title) > 18) reasons.push("title_too_long");
  if (titleLength(normalizedRecipe.subtitle) > 28) reasons.push("subtitle_too_long");
  if (normalizedRecipe.ingredients.length < 3) reasons.push("too_few_ingredients");
  if (normalizedRecipe.steps.length < 3) reasons.push("too_few_steps");
  if (!normalizedRecipe.sourceName || !normalizedRecipe.sourceUrl) reasons.push("missing_source");
  if (hasAwkwardPair(normalizedRecipe)) reasons.push("awkward_pair");
  if (hasAllergyIngredient(normalizedRecipe) && !hasAllergyCaution(normalizedRecipe)) {
    reasons.push("missing_allergy_caution");
  }
  const minimumInputMatches = inputHasAwkwardPair(normalizedInput)
    ? 1
    : Math.min(2, normalizedInput.ingredients.length);
  if (countInputIngredients(normalizedRecipe, normalizedInput) < minimumInputMatches) {
    reasons.push("not_enough_input_match");
  }

  return {
    ready: reasons.length === 0,
    reasons,
    recipe: normalizedRecipe,
  };
}

export function isProductionReadyRecipe(recipe: AiRecipeRecommendation, input: GenerateRecipeInput) {
  return evaluateRecipeQuality(recipe, input).ready;
}

export function selectProductionReadyRecommendations(
  recommendations: AiRecipeRecommendation[],
  input: GenerateRecipeInput
) {
  const ready = recommendations
    .map(normalizeRecipeRecommendation)
    .filter((recipe) => evaluateRecipeQuality(recipe, input).ready);
  return ready.slice(0, input.limit);
}

export function hasEnoughReadyRecommendations(
  recommendations: AiRecipeRecommendation[],
  input: GenerateRecipeInput
) {
  return recommendations.filter((recipe) => evaluateRecipeQuality(recipe, input).ready).length >= input.limit;
}
