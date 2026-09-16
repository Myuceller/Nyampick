import { zodTextFormat } from "openai/helpers/zod";
import { normalizeIngredientList } from "./ingredient-normalize.ts";
import {
  buildRecipeSystemPrompt,
  buildRecipeUserPrompt,
  type RecipeGenerationMode,
} from "./recipe-prompt.ts";
import { selectProductionReadyRecommendations } from "./recipe-quality-gate.ts";
import { summarizeQualityTelemetry } from "./recipe-quality-telemetry.ts";
import {
  aiGeneratedRecipeResponseSchema,
  parseGeneratedRecommendations,
} from "./recipe-response-parser.ts";
import type {
  AiRecipeGenerationResult,
  AiRecipeRecommendation,
  AiUsageSummary,
  GenerateRecipeInput,
} from "./recipe-types.ts";

export function buildRecipeModelRequest(input: {
  model: string;
  recipeInput: GenerateRecipeInput;
  mode: RecipeGenerationMode;
}) {
  return {
    model: input.model,
    input: [
      {
        role: "system" as const,
        content: [
          {
            type: "input_text" as const,
            text: buildRecipeSystemPrompt({ mode: input.mode }),
          },
        ],
      },
      {
        role: "user" as const,
        content: [
          {
            type: "input_text" as const,
            text: buildRecipeUserPrompt(input.recipeInput),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(
        aiGeneratedRecipeResponseSchema,
        "nyampick_recipe_recommendations"
      ),
    },
    max_output_tokens: Math.min(3_200, Math.max(900, input.recipeInput.limit * 320)),
    temperature: 0.2,
    store: false as const,
  };
}

export type RecipeModelRequest = ReturnType<typeof buildRecipeModelRequest>;

export const RECIPE_MODEL_ATTEMPT_TIMEOUT_MS = 18_000;
export const RECIPE_GENERATION_TIMEOUT_MS = 38_000;
export const RECIPE_MODEL_CLIENT_OPTIONS = {
  maxRetries: 0,
  timeout: RECIPE_MODEL_ATTEMPT_TIMEOUT_MS,
} as const;

export interface RecipeModelResponse {
  status?:
    | "completed"
    | "failed"
    | "in_progress"
    | "cancelled"
    | "queued"
    | "incomplete";
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string | null;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; refusal?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
}

export type RecipeModelExecutor = (
  request: RecipeModelRequest,
  options: { signal: AbortSignal; timeoutMs: number }
) => Promise<RecipeModelResponse>;

type RecipeModelFailureCode =
  | "incomplete"
  | "content_filter"
  | "refusal"
  | "empty_response"
  | "invalid_response"
  | "provider_failure";

interface RecipeModelSuccess {
  ok: true;
  recommendations: AiRecipeRecommendation[];
}

interface RecipeModelFailure {
  ok: false;
  code: RecipeModelFailureCode;
  message: string;
  allowFallback: boolean;
}

export type RecipeModelOutcome = RecipeModelSuccess | RecipeModelFailure;

function hasRefusal(response: RecipeModelResponse) {
  return response.output?.some(
    (output) =>
      output.type === "message" &&
      output.content?.some((content) => content.type === "refusal")
  );
}

export function readRecipeModelResponse(response: RecipeModelResponse): RecipeModelOutcome {
  if (response.error || response.status === "failed" || response.status === "cancelled") {
    return {
      ok: false,
      code: "provider_failure",
      message: "AI 응답 생성에 실패했습니다.",
      allowFallback: false,
    };
  }

  if (response.status === "incomplete") {
    const contentFiltered = response.incomplete_details?.reason === "content_filter";
    return {
      ok: false,
      code: contentFiltered ? "content_filter" : "incomplete",
      message: contentFiltered
        ? "AI 안전 필터로 인해 추천을 만들지 못했습니다."
        : "AI 응답이 완성되지 않았습니다.",
      allowFallback: !contentFiltered,
    };
  }

  if (response.status === "in_progress" || response.status === "queued") {
    return {
      ok: false,
      code: "provider_failure",
      message: "AI 응답 생성이 완료되지 않았습니다.",
      allowFallback: false,
    };
  }

  if (hasRefusal(response)) {
    return {
      ok: false,
      code: "refusal",
      message: "AI가 레시피 요청을 처리할 수 없습니다.",
      allowFallback: false,
    };
  }

  const outputText = response.output_text?.trim() ?? "";
  if (!outputText) {
    return {
      ok: false,
      code: "empty_response",
      message: "AI 응답이 비어 있습니다.",
      allowFallback: true,
    };
  }

  try {
    const parsed = JSON.parse(outputText) as unknown;
    return {
      ok: true,
      recommendations: parseGeneratedRecommendations(parsed),
    };
  } catch {
    return {
      ok: false,
      code: "invalid_response",
      message: "AI 응답 형식이 올바르지 않습니다.",
      allowFallback: true,
    };
  }
}

function usageFromResponse(response: RecipeModelResponse): AiUsageSummary {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };
}

function combineUsage(left: AiUsageSummary, right: AiUsageSummary): AiUsageSummary {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

interface GenerationPassResult {
  outcome: RecipeModelOutcome;
  usage: AiUsageSummary;
}

async function generateOnce(input: {
  execute: RecipeModelExecutor;
  model: string;
  recipeInput: GenerateRecipeInput;
  mode: RecipeGenerationMode;
  signal: AbortSignal;
}): Promise<GenerationPassResult> {
  const response = await input.execute(
    buildRecipeModelRequest({
      model: input.model,
      recipeInput: input.recipeInput,
      mode: input.mode,
    }),
    {
      signal: input.signal,
      timeoutMs: RECIPE_MODEL_ATTEMPT_TIMEOUT_MS,
    }
  );

  return {
    outcome: readRecipeModelResponse(response),
    usage: usageFromResponse(response),
  };
}

function outcomeRecommendations(outcome: RecipeModelOutcome) {
  return outcome.ok ? outcome.recommendations : [];
}

function createResult(input: {
  recommendations: AiRecipeRecommendation[];
  allCandidates: AiRecipeRecommendation[];
  normalizedInput: GenerateRecipeInput;
  strictCandidateCount: number;
  fallbackCandidateCount: number;
  usage: AiUsageSummary;
  fallbackUsed: boolean;
}): AiRecipeGenerationResult {
  return {
    recommendations: input.recommendations,
    usage: input.usage,
    fallbackUsed: input.fallbackUsed,
    quality: summarizeQualityTelemetry({
      recommendations: input.allCandidates,
      normalizedInput: input.normalizedInput,
      strictCandidateCount: input.strictCandidateCount,
      fallbackCandidateCount: input.fallbackCandidateCount,
      requireSource: false,
    }),
  };
}

async function generateRecipeRecommendationsWithinDeadline(input: {
  execute: RecipeModelExecutor;
  model: string;
  recipeInput: GenerateRecipeInput;
  signal: AbortSignal;
}): Promise<AiRecipeGenerationResult> {
  const requestedLimit = Number.isFinite(input.recipeInput.limit)
    ? Math.floor(input.recipeInput.limit)
    : 3;
  const normalizedInput: GenerateRecipeInput = {
    ...input.recipeInput,
    ingredients: normalizeIngredientList(input.recipeInput.ingredients, { limit: 20 }),
    limit: Math.max(1, Math.min(10, requestedLimit)),
  };
  if (normalizedInput.ingredients.length === 0) {
    throw new Error("추천에 사용할 재료가 없습니다.");
  }

  const qualityOptions = { requireSource: false };
  const strict = await generateOnce({
    execute: input.execute,
    model: input.model,
    recipeInput: normalizedInput,
    mode: "strict",
    signal: input.signal,
  });
  if (!strict.outcome.ok && !strict.outcome.allowFallback) {
    throw new Error(strict.outcome.message);
  }

  const strictCandidates = outcomeRecommendations(strict.outcome);
  const strictReady = selectProductionReadyRecommendations(
    strictCandidates,
    normalizedInput,
    qualityOptions
  );
  if (strictReady.length >= normalizedInput.limit) {
    return createResult({
      recommendations: strictReady,
      allCandidates: strictCandidates,
      normalizedInput,
      strictCandidateCount: strictCandidates.length,
      fallbackCandidateCount: 0,
      usage: strict.usage,
      fallbackUsed: false,
    });
  }

  let fallback: GenerationPassResult;
  try {
    fallback = await generateOnce({
      execute: input.execute,
      model: input.model,
      recipeInput: normalizedInput,
      mode: "fallback",
      signal: input.signal,
    });
  } catch (error) {
    if (strictReady.length === 0) throw error;
    return createResult({
      recommendations: strictReady,
      allCandidates: strictCandidates,
      normalizedInput,
      strictCandidateCount: strictCandidates.length,
      fallbackCandidateCount: 0,
      usage: strict.usage,
      fallbackUsed: true,
    });
  }

  const fallbackCandidates = outcomeRecommendations(fallback.outcome);
  const allCandidates = [...strictCandidates, ...fallbackCandidates];
  const selected = selectProductionReadyRecommendations(
    allCandidates,
    normalizedInput,
    qualityOptions
  );
  if (selected.length === 0) {
    const message = fallback.outcome.ok
      ? "AI가 사용할 수 있는 레시피를 생성하지 못했습니다."
      : fallback.outcome.message;
    throw new Error(message);
  }

  return createResult({
    recommendations: selected,
    allCandidates,
    normalizedInput,
    strictCandidateCount: strictCandidates.length,
    fallbackCandidateCount: fallbackCandidates.length,
    usage: combineUsage(strict.usage, fallback.usage),
    fallbackUsed: true,
  });
}

export async function generateRecipeRecommendations(input: {
  execute: RecipeModelExecutor;
  model: string;
  recipeInput: GenerateRecipeInput;
}): Promise<AiRecipeGenerationResult> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("AI 추천 생성 시간이 초과되었습니다."));
    }, RECIPE_GENERATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      generateRecipeRecommendationsWithinDeadline({
        ...input,
        signal: controller.signal,
      }),
      deadline,
    ]);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("AI 추천 생성 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
