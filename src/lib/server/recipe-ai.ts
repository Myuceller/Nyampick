import OpenAI from "openai";
import { normalizeIngredientList } from "../ai/ingredient-normalize.ts";
import { buildRecipeSystemPrompt, buildRecipeUserPrompt } from "../ai/recipe-prompt.ts";
import {
  hasEnoughReadyRecommendations,
  selectProductionReadyRecommendations,
} from "../ai/recipe-quality-gate.ts";
import { summarizeQualityTelemetry } from "../ai/recipe-quality-telemetry.ts";
import { parseRecommendations } from "../ai/recipe-response-parser.ts";
import type {
  AiRecipeGenerationResult,
  AiRecipeRecommendation,
  AiUsageSummary,
  GenerateRecipeInput,
} from "../ai/recipe-types.ts";

export type {
  AiRecipeGenerationResult,
  AiRecipeQualityTelemetry,
  AiRecipeRecommendation,
  AiTaste,
  AiUsageSummary,
  GenerateRecipeInput,
  RecipeQualityResult,
  RecipeRejectReason,
} from "../ai/recipe-types.ts";
export {
  evaluateRecipeQuality,
  isProductionReadyRecipe,
  selectProductionReadyRecommendations,
} from "../ai/recipe-quality-gate.ts";
export { parseRecommendations } from "../ai/recipe-response-parser.ts";

interface GenerateOnceResult {
  recommendations: AiRecipeRecommendation[];
  usage: AiUsageSummary;
}

async function generateOnce(
  client: OpenAI,
  model: string,
  input: GenerateRecipeInput,
  requireSource: boolean
): Promise<GenerateOnceResult> {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: buildRecipeSystemPrompt({ requireSource }) }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildRecipeUserPrompt(input) }],
      },
    ],
    max_output_tokens: 900,
    temperature: 0.2,
  });

  const outputText = response.output_text?.trim() ?? "";
  const usage = response.usage;
  return {
    recommendations: parseRecommendations(outputText, { requireSource }),
    usage: {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}

function combineUsage(left: AiUsageSummary, right: AiUsageSummary): AiUsageSummary {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

export async function generateRecipeRecommendationsWithOpenAI(
  input: GenerateRecipeInput
): Promise<AiRecipeGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });
  const normalizedInput: GenerateRecipeInput = {
    ...input,
    ingredients: normalizeIngredientList(input.ingredients, { limit: 20 }),
  };
  if (normalizedInput.ingredients.length === 0) {
    throw new Error("추천에 사용할 재료가 없습니다.");
  }

  const strict = await generateOnce(client, model, normalizedInput, true);
  if (hasEnoughReadyRecommendations(strict.recommendations, normalizedInput)) {
    const recommendations = selectProductionReadyRecommendations(
      strict.recommendations,
      normalizedInput
    );
    return {
      recommendations,
      usage: strict.usage,
      fallbackUsed: false,
      quality: summarizeQualityTelemetry({
        recommendations: strict.recommendations,
        normalizedInput,
        strictCandidateCount: strict.recommendations.length,
        fallbackCandidateCount: 0,
      }),
    };
  }

  const fallback = await generateOnce(client, model, normalizedInput, false);
  const allRecommendations = [...strict.recommendations, ...fallback.recommendations];
  const selected = selectProductionReadyRecommendations(allRecommendations, normalizedInput);
  if (selected.length < input.limit) {
    throw new Error("AI가 레시피를 생성하지 못했습니다.");
  }

  return {
    recommendations: selected,
    usage: combineUsage(strict.usage, fallback.usage),
    fallbackUsed: true,
    quality: summarizeQualityTelemetry({
      recommendations: allRecommendations,
      normalizedInput,
      strictCandidateCount: strict.recommendations.length,
      fallbackCandidateCount: fallback.recommendations.length,
    }),
  };
}
