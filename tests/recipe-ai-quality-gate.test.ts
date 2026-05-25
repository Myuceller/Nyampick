import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeIngredientList,
  normalizeIngredientName,
} from "../src/lib/ai/ingredient-normalize.ts";
import { normalizeRecipeRecommendation } from "../src/lib/ai/recipe-normalize.ts";
import {
  isProductionReadyRecipe,
  selectProductionReadyRecommendations,
  type AiRecipeRecommendation,
} from "../src/lib/server/recipe-ai.ts";

const readyRecipe: AiRecipeRecommendation = {
  title: "두부 애호박죽",
  subtitle: "부드러운 유아식 죽",
  taste: "좋아해요",
  ingredients: ["두부", "애호박", "쌀"],
  steps: [
    "두부와 애호박을 잘게 다진다.",
    "쌀과 함께 부드럽게 끓인다.",
    "알레르기 반응을 소량부터 확인한다.",
  ],
  sourceName: "공개 레시피",
  sourceUrl: "https://example.com/recipe",
};

test("normalizeIngredientName maps noisy receipt names to canonical names", () => {
  assert.equal(normalizeIngredientName("친환경 애호박 1개"), "애호박");
  assert.equal(normalizeIngredientName("무항생제 닭안심 300g"), "닭고기");
  assert.equal(normalizeIngredientName("서울우유 1L"), "우유");
});

test("normalizeIngredientList deduplicates equivalent ingredients", () => {
  assert.deepEqual(
    normalizeIngredientList(["국산 애호박 1개", "애호박", "무항생제 닭가슴살", "닭안심"]),
    ["애호박", "닭고기"]
  );
});

test("normalizeRecipeRecommendation cleans recipe fields before quality gate", () => {
  const normalized = normalizeRecipeRecommendation({
    ...readyRecipe,
    title: "  두부   애호박죽  ",
    ingredients: ["친환경 애호박 1개", "두부 1/2모", "쌀 100g"],
    steps: [
      "1. 두부와 애호박을 잘게 다진다.",
      "2) 쌀과 함께 부드럽게 끓인다.",
      "- 알레르기 반응을 소량부터 확인한다.",
    ],
  });

  assert.equal(normalized.title, "두부 애호박죽");
  assert.deepEqual(normalized.ingredients, ["애호박", "두부", "쌀"]);
  assert.deepEqual(normalized.steps, [
    "두부와 애호박을 잘게 다진다.",
    "쌀과 함께 부드럽게 끓인다.",
    "알레르기 반응을 소량부터 확인한다.",
  ]);
});

test("isProductionReadyRecipe rejects awkward ingredient pairs", () => {
  const recipe: AiRecipeRecommendation = {
    ...readyRecipe,
    title: "새우 우유죽",
    ingredients: ["새우", "우유", "쌀"],
    steps: [
      "새우를 잘게 다진다.",
      "우유와 쌀을 넣고 끓인다.",
      "알레르기 반응을 소량부터 확인한다.",
    ],
  };

  assert.equal(
    isProductionReadyRecipe(recipe, { ingredients: ["새우", "우유", "쌀"], limit: 1 }),
    false
  );
});

test("selectProductionReadyRecommendations keeps only ready recommendations", () => {
  const selected = selectProductionReadyRecommendations(
    [
      {
        ...readyRecipe,
        title: "바나나 소고기죽",
        ingredients: ["바나나", "소고기", "쌀"],
      },
      readyRecipe,
    ],
    { ingredients: ["두부", "애호박", "쌀"], limit: 2 }
  );

  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.title, "두부 애호박죽");
});

test("quality gate evaluates normalized ingredient aliases", () => {
  const selected = selectProductionReadyRecommendations(
    [
      {
        ...readyRecipe,
        title: "바나나 닭죽",
        ingredients: ["바나나", "닭안심", "쌀"],
      },
      {
        ...readyRecipe,
        ingredients: ["무항생제 닭안심", "친환경 애호박", "쌀"],
      },
    ],
    { ingredients: ["닭가슴살 300g", "애호박 1개", "쌀"], limit: 2 }
  );

  assert.equal(selected.length, 1);
  assert.deepEqual(selected[0]?.ingredients, ["닭고기", "애호박", "쌀"]);
});
