import assert from "node:assert/strict";
import test from "node:test";
import { classifyRecipeAiFailure } from "../src/lib/server/recipe-ai-diagnostics.ts";

test("recipe AI diagnostics classify provider failures without raw messages", () => {
  assert.deepEqual(
    classifyRecipeAiFailure({ status: 401, message: "secret provider response" }),
    { reason: "authentication", providerStatus: 401 }
  );
  assert.deepEqual(
    classifyRecipeAiFailure({ status: 429, code: "insufficient_quota" }),
    { reason: "quota", providerStatus: 429 }
  );
  assert.deepEqual(classifyRecipeAiFailure({ status: 404 }), {
    reason: "model_access",
    providerStatus: 404,
  });
  assert.deepEqual(classifyRecipeAiFailure({ status: 400 }), {
    reason: "invalid_request",
    providerStatus: 400,
  });
});

test("recipe AI diagnostics classify local timeout and output failures", () => {
  assert.deepEqual(
    classifyRecipeAiFailure({ name: "RecipeAiConfigurationError" }),
    { reason: "configuration" }
  );
  assert.deepEqual(classifyRecipeAiFailure({ name: "APIConnectionTimeoutError" }), {
    reason: "timeout",
  });
  assert.deepEqual(
    classifyRecipeAiFailure({
      message: "AI가 사용할 수 있는 레시피를 생성하지 못했습니다.",
    }),
    { reason: "invalid_output" }
  );
});
