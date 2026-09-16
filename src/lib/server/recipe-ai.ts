import OpenAI from "openai";
import {
  generateRecipeRecommendations,
  RECIPE_MODEL_CLIENT_OPTIONS,
  type RecipeModelExecutor,
} from "@/lib/ai/recipe-generation.ts";
import type {
  AiRecipeGenerationResult,
  GenerateRecipeInput,
} from "@/lib/ai/recipe-types.ts";

export type {
  AiRecipeGenerationResult,
  AiRecipeQualityTelemetry,
  AiRecipeRecommendation,
  AiTaste,
  AiUsageSummary,
  GenerateRecipeInput,
  RecipeQualityResult,
  RecipeRejectReason,
} from "@/lib/ai/recipe-types.ts";
export {
  evaluateRecipeQuality,
  isProductionReadyRecipe,
  selectProductionReadyRecommendations,
} from "@/lib/ai/recipe-quality-gate.ts";
export { parseRecommendations } from "@/lib/ai/recipe-response-parser.ts";

export async function generateRecipeRecommendationsWithOpenAI(
  input: GenerateRecipeInput
): Promise<AiRecipeGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({
    apiKey,
    ...RECIPE_MODEL_CLIENT_OPTIONS,
  });
  // `responses.create` is intentional: an incomplete response can contain
  // partial JSON, and auto-parsing it would throw before we inspect status or refusal.
  const execute: RecipeModelExecutor = async (request, options) =>
    client.responses.create(request, {
      signal: options.signal,
      timeout: options.timeoutMs,
    });

  return generateRecipeRecommendations({
    execute,
    model,
    recipeInput: input,
  });
}
