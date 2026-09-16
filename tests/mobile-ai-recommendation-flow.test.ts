import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const recipesSource = readFileSync(
  new URL("../apps/mobile/src/features/recipes/use-recipes.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("../apps/mobile/src/lib/api.ts", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../apps/mobile/App.tsx", import.meta.url),
  "utf8"
);

test("mobile AI recommendations reject an empty successful response and share an in-flight request", () => {
  assert.match(recipesSource, /if \(recommendationRequestRef\.current\) return recommendationRequestRef\.current;/);
  assert.match(recipesSource, /const nextRecommendations = ensureUniqueRecommendationIds\(Array\.isArray\(response\.recommendations\) \? response\.recommendations : \[\]\);/);
  assert.match(recipesSource, /if \(!nextRecommendations\.length\) \{\s*throw new Error\("추천 결과가 비어 있어요\. 재료를 바꿔 다시 시도해주세요\."\);/);
  assert.match(recipesSource, /setRecommendationNotice\(`\$\{nextRecommendations\.length\}개의 AI 레시피를 준비했어요\.`\);/);
});

test("mobile AI recommendation requests have a bounded timeout and preserve a recommendation-specific retry", () => {
  assert.match(recipesSource, /timeoutMs: recommendationTimeoutMs/);
  assert.match(recipesSource, /timeoutMessage: "AI 추천 준비 시간이 길어지고 있어요\. 네트워크를 확인한 뒤 다시 시도해주세요\."/);
  assert.match(recipesSource, /const retryRecommendation = useCallback\(\(\) => \{\s*return recommend\(lastRecommendationIngredientsRef\.current \?\? undefined\);/);
  assert.match(apiSource, /const controller = options\.timeoutMs \? new AbortController\(\) : null;/);
  assert.match(apiSource, /signal: controller\?\.signal/);
  assert.match(apiSource, /if \(controller\?\.signal\.aborted\)/);
});

test("mobile AI recommendation errors retain API diagnostics and only offer safe retries", () => {
  assert.match(recipesSource, /requestAuthedApi<RecommendationsResponseDto>/);
  assert.match(recipesSource, /lastRecommendationCorrelationIdRef\.current = response\.correlationId \?\? null;/);
  assert.match(recipesSource, /if \(response\.code\) \{/);
  assert.match(recipesSource, /if \(caught\.code === "AI_RATE_LIMITED"\)/);
  assert.match(recipesSource, /if \(caught\.code === "AI_TOKEN_BUDGET_EXCEEDED"\)/);
  assert.match(recipesSource, /const \[recommendationCanRetry, setRecommendationCanRetry\] = useState\(false\);/);
  assert.match(recipesSource, /const fallbackTokenBudgetRetryAfterSeconds = 60;/);
  assert.match(recipesSource, /const retryAfterSeconds = caught\.retryAfterSeconds \?\? fallbackTokenBudgetRetryAfterSeconds;/);
  assert.doesNotMatch(recipesSource, /setHours\(24, 0, 0, 0\)/);
  assert.match(apiSource, /readonly correlationId\?: string/);
  assert.match(apiSource, /readonly retryAfterSeconds\?: number/);
  assert.match(apiSource, /response\.headers\.get\("X-Correlation-ID"\)/);
  assert.match(apiSource, /getRetryAfterSeconds\(response\.headers\.get\("Retry-After"\)\)/);
});

test("native recipe screens surface recommendation errors in the sheet and retry recommendation generation", () => {
  assert.match(appSource, /RecipeIssueNotice message=\{pickerError\}/);
  assert.match(appSource, /onRetry=\{recommendationError \? recommendationCanRetry \? \(\) => void requestRecommendation\(\) : undefined/);
  assert.match(appSource, /const outsideRetryLabel = recommendationError \? recommendationCanRetry \? "AI 추천 다시 시도" : undefined/);
  assert.match(appSource, /recommendationActionDisabled = isRecommending \|\| recommendationRetryAfterSeconds !== null/);
  assert.match(appSource, /AI가 재료를 살펴보고 있어요\. 잠시만 기다려주세요\./);
});

test("native compact recipe screen renders AI recommendations and saved recipes as separate sections", () => {
  assert.match(appSource, /const cards = \[\.\.\.recommendationCards, \.\.\.savedRecipeCards\];/);
  assert.match(appSource, /recipe\.isRecommendation \? "오늘의 추천" : "저장한 레시피"/);
});

test("mobile recipe ingredient selection respects the shared 20-item API limit before requesting AI", () => {
  assert.match(recipesSource, /MAX_RECIPE_RECOMMENDATION_INGREDIENTS/);
  assert.match(recipesSource, /if \(ingredients\.length > MAX_RECIPE_RECOMMENDATION_INGREDIENTS\) \{/);
  assert.match(recipesSource, /추천 재료는 최대 \$\{MAX_RECIPE_RECOMMENDATION_INGREDIENTS\}개까지 선택할 수 있어요\./);
  assert.match(appSource, /selectableItems\.slice\(0, MAX_RECIPE_RECOMMENDATION_INGREDIENTS\)\.map\(\(item\) => item\.id\)/);
  assert.match(appSource, /selectedIngredientIds\.size >= MAX_RECIPE_RECOMMENDATION_INGREDIENTS/);
  assert.match(appSource, /최대 \{MAX_RECIPE_RECOMMENDATION_INGREDIENTS\}개까지 선택할 수 있고/);
});

test("mobile recipe ingredients reject names over the shared API character limit before sending", () => {
  assert.match(recipesSource, /MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH/);
  assert.match(recipesSource, /ingredients\.some\(\(ingredient\) => \[\.\.\.ingredient\]\.length > MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH\)/);
  assert.match(appSource, /const selectableItems = items\.filter\(\(item\) => !isRecommendationIngredientNameTooLong\(item\.name\)\);/);
  assert.match(appSource, /disabled=\{nameTooLong\}/);
  assert.match(appSource, /이름이 \{MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH\}자를 넘는 재료는 사용할 수 없어요\./);
});
