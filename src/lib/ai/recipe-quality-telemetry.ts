import { evaluateRecipeQuality, recipeRejectReasons } from "./recipe-quality-gate.ts";
import type {
  AiRecipeQualityTelemetry,
  AiRecipeRecommendation,
  GenerateRecipeInput,
  RecipeRejectReason,
} from "./recipe-types.ts";

export function summarizeQualityTelemetry(input: {
  recommendations: AiRecipeRecommendation[];
  normalizedInput: GenerateRecipeInput;
  strictCandidateCount: number;
  fallbackCandidateCount: number;
}): AiRecipeQualityTelemetry {
  const rejectReasonCounts = Object.fromEntries(
    recipeRejectReasons.map((reason) => [reason, 0])
  ) as Record<RecipeRejectReason, number>;
  let readyCount = 0;
  let rejectedCount = 0;

  for (const recipe of input.recommendations) {
    const result = evaluateRecipeQuality(recipe, input.normalizedInput);
    if (result.ready) {
      readyCount += 1;
      continue;
    }
    rejectedCount += 1;
    for (const reason of result.reasons) rejectReasonCounts[reason] += 1;
  }

  return {
    normalizedIngredients: input.normalizedInput.ingredients,
    strictCandidateCount: input.strictCandidateCount,
    fallbackCandidateCount: input.fallbackCandidateCount,
    readyCount,
    rejectedCount,
    rejectReasonCounts,
  };
}
