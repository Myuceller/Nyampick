import assert from "node:assert/strict";
import test from "node:test";
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
