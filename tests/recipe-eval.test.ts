import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRecipe } from "../src/lib/recipe-eval/evaluate-recipe.ts";
import type { RecipeEvalTestCase } from "../src/lib/recipe-eval/types.ts";

const baseCase: RecipeEvalTestCase = {
  caseId: "test_allergy_safe",
  ingredients: ["계란", "두부", "애호박"],
  allergyIngredients: ["계란", "두부"],
  unsafeIngredients: [],
  expected: "유아식 톤과 알레르기 주의 문구를 포함한다.",
  checks: {
    minIngredientUtilization: 0.6,
    requireSource: true,
    awkwardPairs: [],
    requireBabyFriendlyTone: true,
    requireCookingSteps: true,
    avoidAllergyPush: true,
  },
};

test("evaluateRecipe passes a sourced baby-friendly recipe with allergy caution", () => {
  const result = evaluateRecipe(
    baseCase,
    [
      "계란 두부 애호박을 활용한 부드러운 유아식입니다.",
      "1. 애호박은 잘게 다지고 두부는 으깨요.",
      "2. 계란은 완전히 익혀서 소량씩 반응을 확인해요.",
      "3. 아이가 먹기 좋게 한 김 식혀 완성해요.",
      "출처: 보호자용 공개 레시피 참고",
    ].join("\n")
  );

  assert.equal(result.passed, true);
  assert.equal(result.details.hasSource, true);
  assert.equal(result.details.hasAllergyCaution, true);
  assert.equal(result.details.hasCookingSteps, true);
  assert.equal(result.reasons.length, 0);
});

test("evaluateRecipe penalizes awkward pairs and missing safeguards", () => {
  const result = evaluateRecipe(
    {
      ...baseCase,
      ingredients: ["새우", "우유", "감자"],
      allergyIngredients: ["새우", "우유"],
      unsafeIngredients: ["새우"],
      checks: {
        ...baseCase.checks,
        awkwardPairs: [["새우", "우유"]],
      },
    },
    "새우와 우유를 섞어 감자 퓨레를 만들면 완전 안전하고 맛있어요."
  );

  assert.equal(result.passed, false);
  assert.ok(result.score < 75);
  assert.deepEqual(result.details.awkwardPairs, [["새우", "우유"]]);
  assert.ok(result.reasons.length >= 3);
});
