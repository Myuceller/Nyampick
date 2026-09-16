import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_RECOMMENDATION_LIMIT,
  MAX_RECOMMENDATION_INGREDIENT_LENGTH,
  MAX_RECOMMENDATION_INGREDIENTS,
  getPublicRecipeRecommendationError,
  validateRecipeRecommendationRequest,
  type RecipeRecommendationApiErrorCode,
} from "../src/lib/server/recipe-recommendation-request.ts";

const routeSource = readFileSync(
  new URL("../src/app/api/recipes/recommendations/route.ts", import.meta.url),
  "utf8"
);

test("recommendation input is normalized with a stable default limit", () => {
  const result = validateRecipeRecommendationRequest({
    ingredients: [" 두부 ", "애호박\n", "두부"],
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      ingredients: ["두부", "애호박"],
      limit: DEFAULT_RECOMMENDATION_LIMIT,
    },
  });
});

test("recommendation limit accepts only integers from 1 through 10", () => {
  for (const limit of [1, 3, 10]) {
    const result = validateRecipeRecommendationRequest({
      ingredients: ["두부"],
      limit,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.limit, limit);
  }

  for (const limit of [0, 1.5, 11, "3", null, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = validateRecipeRecommendationRequest({
      ingredients: ["두부"],
      limit,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_LIMIT");
  }
});

test("recommendation ingredients reject missing, mixed, empty, and oversized input", () => {
  const invalidBodies: unknown[] = [
    null,
    [],
    {},
    { ingredients: [] },
    { ingredients: ["두부", 42] },
    { ingredients: ["  "] },
    {
      ingredients: Array.from(
        { length: MAX_RECOMMENDATION_INGREDIENTS + 1 },
        (_, index) => `재료 ${index}`
      ),
    },
    { ingredients: ["가".repeat(MAX_RECOMMENDATION_INGREDIENT_LENGTH + 1)] },
  ];

  for (const body of invalidBodies) {
    const result = validateRecipeRecommendationRequest(body);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.code === "INVALID_JSON" || result.code === "INVALID_INGREDIENTS"
      );
    }
  }
});

test("public recommendation errors expose only stable codes and safe Korean copy", () => {
  const codes: RecipeRecommendationApiErrorCode[] = [
    "UNAUTHORIZED",
    "AUTH_SERVICE_UNAVAILABLE",
    "INVALID_JSON",
    "INVALID_INGREDIENTS",
    "INVALID_LIMIT",
    "AI_RATE_LIMITED",
    "AI_TOKEN_BUDGET_EXCEEDED",
    "AI_RECOMMENDATION_UNAVAILABLE",
  ];

  for (const code of codes) {
    const error = getPublicRecipeRecommendationError(code);
    assert.equal(error.code, code);
    assert.ok([400, 401, 429, 503].includes(error.status));
    assert.ok(error.message.length > 0);
    assert.doesNotMatch(error.message, /OPENAI|API[_ -]?KEY|token|sk-/i);
  }
});

test("recommendation route validates before charging attempts and rejects empty success", () => {
  const validationIndex = routeSource.indexOf(
    "validateRecipeRecommendationRequest(body)"
  );
  const attemptIndex = routeSource.indexOf("rateResult = consumeAiAttempt(");
  const generationIndex = routeSource.indexOf(
    "const result = await generateRecipeRecommendationsWithOpenAI("
  );
  const emptyIndex = routeSource.indexOf("result.recommendations.length === 0");
  const budgetIndex = routeSource.indexOf(
    "const budgetResult = consumeUserDailyTokenBudget("
  );
  const successIndex = routeSource.indexOf(
    "safelyRegisterAiSuccess(user.id)",
    budgetIndex
  );

  assert.ok(validationIndex > 0);
  assert.ok(attemptIndex > validationIndex);
  assert.ok(generationIndex > attemptIndex);
  assert.ok(emptyIndex > generationIndex);
  assert.ok(budgetIndex > emptyIndex);
  assert.ok(successIndex > budgetIndex);
  assert.match(routeSource, /AI_RECOMMENDATION_UNAVAILABLE/);
});

test("recommendation route redacts logs and returns correlation IDs", () => {
  const logStart = routeSource.indexOf("const logPayload = {");
  const logEnd = routeSource.indexOf("return jsonWithCorrelation(", logStart);
  const logBlock = routeSource.slice(logStart, logEnd);

  assert.ok(logStart > 0 && logEnd > logStart);
  assert.doesNotMatch(logBlock, /userId|normalizedIngredients/);
  assert.match(logBlock, /ingredientCount/);
  assert.match(routeSource, /X-Correlation-ID/);
  assert.match(routeSource, /Cache-Control/);
  assert.doesNotMatch(routeSource, /instanceof Error\s*\?\s*\w+\.message/);
  assert.doesNotMatch(routeSource, /catch\s*\(\s*error\s*\)/);
});
