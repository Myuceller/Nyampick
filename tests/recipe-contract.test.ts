import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecommendationId,
  ensureUniqueRecommendationIds,
  isCompleteAiRecipeDetails,
  normalizeRecipeDetails,
  type RecipeRecommendationDto,
} from "../packages/contracts/src/recipe.ts";
import { readFileSync } from "node:fs";

const recommendation: Omit<RecipeRecommendationDto, "id"> = {
  title: "두부 애호박죽",
  subtitle: "부드럽게 끓인 유아식",
  taste: "좋아해요",
  ingredients: ["두부", "애호박", "쌀"],
  steps: ["재료를 다진다.", "부드럽게 끓인다."],
  sourceName: "공개 레시피",
  sourceUrl: "https://example.com/recipe",
};

test("recipe recommendation IDs are deterministic and include list position", () => {
  assert.equal(createRecommendationId(recommendation, 0), createRecommendationId(recommendation, 0));
  assert.notEqual(createRecommendationId(recommendation, 0), createRecommendationId(recommendation, 1));
});

test("mobile can repair missing and duplicate recommendation IDs", () => {
  const recommendations = ensureUniqueRecommendationIds([
    recommendation,
    { ...recommendation, id: "duplicate-id", title: "두부 달걀찜" },
    { ...recommendation, id: "duplicate-id", title: "애호박 진밥" },
  ]);

  assert.match(recommendations[0].id, /^ai-1-/);
  assert.equal(recommendations[1].id, "duplicate-id");
  assert.equal(new Set(recommendations.map((item) => item.id)).size, recommendations.length);
});

test("AI recipe details preserve ingredients, steps, and source fields", () => {
  const details = normalizeRecipeDetails({
    ingredients: [" 두부 ", "애호박"],
    steps: [" 잘게 다진다. ", "끓인다."],
    sourceName: " 공개 레시피 ",
    sourceUrl: " https://example.com/recipe ",
  });

  assert.deepEqual(details, {
    ingredients: ["두부", "애호박"],
    steps: ["잘게 다진다.", "끓인다."],
    sourceName: "공개 레시피",
    sourceUrl: "https://example.com/recipe",
  });
  assert.equal(isCompleteAiRecipeDetails(details), true);
  assert.equal(isCompleteAiRecipeDetails(normalizeRecipeDetails({ ingredients: ["두부"] })), false);
});

test("active mobile recipe flow submits the complete AI recipe contract", () => {
  const mobileSource = readFileSync(new URL("../apps/mobile/src/features/recipes/use-recipes.ts", import.meta.url), "utf8");
  const routeSource = readFileSync(new URL("../src/app/api/recipes/recommendations/route.ts", import.meta.url), "utf8");
  const savedRouteSource = readFileSync(new URL("../src/app/api/recipes/saved/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /createRecommendationId/);
  assert.match(mobileSource, /recipeData:\s*\{/);
  assert.match(mobileSource, /sourceName: recipe\.sourceName/);
  assert.match(savedRouteSource, /isCompleteAiRecipeDetails/);
  assert.match(savedRouteSource, /"code" in error && error\.code === "42703"/);
  assert.match(savedRouteSource, /AI 레시피 상세 저장소가 준비되지 않았습니다/);
});
