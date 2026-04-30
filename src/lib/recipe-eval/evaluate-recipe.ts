import type { RecipeEvalResult, RecipeEvalTestCase } from "./types";

const sourcePatterns = [/https?:\/\//i, /출처/i, /참고/i, /레시피\s*출처/i];
const allergyCautionPatterns = [/알레르/i, /주의/i, /소량/i, /반응/i, /전문가/i, /의사/i, /확인/i];
const babyFriendlyPatterns = [/유아식/i, /이유식/i, /아이/i, /아기/i, /부드/i, /잘게/i, /익혀/i, /간을\s*약/i];
const cookingStepPatterns = [
  /\b1[.)]\s*/,
  /\b2[.)]\s*/,
  /\b3[.)]\s*/,
  /첫째|둘째|셋째/,
  /준비|손질|익히|끓이|볶|찜|완성/,
];
const allergyPushPatterns = [/알레르기\s*걱정\s*없/i, /무조건\s*안전/i, /완전\s*안전/i, /안심하고\s*먹/i];

function normalize(value: string) {
  return value.replaceAll(/\s+/g, "").toLowerCase();
}

function containsTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
}

function hasAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluateRecipe(
  testCase: RecipeEvalTestCase,
  recipeText: string
): RecipeEvalResult {
  const reasons: string[] = [];
  let score = 100;

  const usedIngredients = testCase.ingredients.filter((ingredient) =>
    containsTerm(recipeText, ingredient)
  );
  const missingIngredients = testCase.ingredients.filter(
    (ingredient) => !usedIngredients.includes(ingredient)
  );
  const ingredientUtilization =
    testCase.ingredients.length > 0 ? usedIngredients.length / testCase.ingredients.length : 0;

  if (ingredientUtilization < testCase.checks.minIngredientUtilization) {
    score -= 20;
    reasons.push(
      `재료 활용도 ${Math.round(ingredientUtilization * 100)}%가 기준 ${Math.round(
        testCase.checks.minIngredientUtilization * 100
      )}%보다 낮습니다.`
    );
  }

  const awkwardPairs = testCase.checks.awkwardPairs.filter(([left, right]) => {
    return containsTerm(recipeText, left) && containsTerm(recipeText, right);
  });
  if (awkwardPairs.length > 0) {
    score -= 25;
    reasons.push(
      `어색하거나 주의가 필요한 조합이 포함되었습니다: ${awkwardPairs
        .map(([left, right]) => `${left}+${right}`)
        .join(", ")}`
    );
  }

  const hasSource = hasAnyPattern(recipeText, sourcePatterns);
  if (testCase.checks.requireSource && !hasSource) {
    score -= 15;
    reasons.push("출처 또는 참고 문구가 없습니다.");
  }

  const hasAllergyCaution = hasAnyPattern(recipeText, allergyCautionPatterns);
  const pushesAllergySafety = hasAnyPattern(recipeText, allergyPushPatterns);
  if (testCase.checks.avoidAllergyPush && (!hasAllergyCaution || pushesAllergySafety)) {
    score -= 20;
    reasons.push("알레르기 가능 재료에 대한 주의 문구가 부족하거나 안전을 단정합니다.");
  }

  const hasBabyFriendlyTone = hasAnyPattern(recipeText, babyFriendlyPatterns);
  if (testCase.checks.requireBabyFriendlyTone && !hasBabyFriendlyTone) {
    score -= 10;
    reasons.push("유아식/이유식에 맞는 톤이나 조리 표현이 부족합니다.");
  }

  const stepSignalCount = cookingStepPatterns.filter((pattern) => pattern.test(recipeText)).length;
  const hasCookingSteps = stepSignalCount >= 2 || recipeText.split(/\n+/).length >= 3;
  if (testCase.checks.requireCookingSteps && !hasCookingSteps) {
    score -= 10;
    reasons.push("단계형 조리법 구조가 부족합니다.");
  }

  const finalScore = clampScore(score);

  return {
    passed: finalScore >= 75,
    score: finalScore,
    details: {
      ingredientUtilization,
      usedIngredients,
      missingIngredients,
      awkwardPairs,
      hasSource,
      hasAllergyCaution,
      hasBabyFriendlyTone,
      hasCookingSteps,
    },
    reasons,
  };
}
