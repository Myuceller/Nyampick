import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createRecommendationId, type RecipeRecommendationDto } from "@nyampick/contracts/recipe";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  getPublicRecipeRecommendationError,
  validateRecipeRecommendationRequest,
  type RecipeRecommendationApiErrorCode,
} from "@/lib/server/recipe-recommendation-request";
import { generateRecipeRecommendationsWithOpenAI } from "@/lib/server/recipe-ai";
import {
  consumeAiAttempt,
  consumeUserDailyTokenBudget,
  getClientIp,
  registerAiFailure,
  registerAiSuccess,
} from "@/lib/server/rate-limit";

const CORRELATION_ID_HEADER = "X-Correlation-ID";

function getNonZeroReasons(reasons: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(reasons).filter(([, count]) => count > 0)
  );
}

function jsonWithCorrelation(
  payload: Record<string, unknown>,
  status: number,
  correlationId: string,
  retryAfterSeconds?: number
) {
  const response = NextResponse.json(
    { ...payload, correlationId },
    { status }
  );
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  response.headers.set("Cache-Control", "no-store");
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    response.headers.set("Retry-After", String(Math.ceil(retryAfterSeconds)));
  }
  return response;
}

function publicErrorResponse(
  code: RecipeRecommendationApiErrorCode,
  correlationId: string,
  retryAfterSeconds?: number
) {
  const error = getPublicRecipeRecommendationError(code);
  return jsonWithCorrelation(
    { code: error.code, message: error.message },
    error.status,
    correlationId,
    retryAfterSeconds
  );
}

function safelyRegisterAiFailure(userId: string) {
  try {
    registerAiFailure({ userId, action: "recipes" });
  } catch {
    // Failure accounting must never replace the stable public API response.
  }
}

function safelyRegisterAiSuccess(userId: string) {
  try {
    registerAiSuccess({ userId, action: "recipes" });
  } catch {
    // A completed recommendation should still be returned if bookkeeping fails.
  }
}

function logInternalFailure(correlationId: string, phase: string) {
  console.error("[ai.recipe.failure]", { correlationId, phase });
}

export async function POST(request: Request) {
  const correlationId = randomUUID();

  let user: Awaited<ReturnType<typeof getUserFromRequest>>;
  try {
    user = await getUserFromRequest(request);
  } catch {
    logInternalFailure(correlationId, "authentication");
    return publicErrorResponse("AUTH_SERVICE_UNAVAILABLE", correlationId);
  }

  if (!user) {
    return publicErrorResponse("UNAUTHORIZED", correlationId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return publicErrorResponse("INVALID_JSON", correlationId);
  }

  const validation = validateRecipeRecommendationRequest(body);
  if (!validation.ok) {
    return publicErrorResponse(validation.code, correlationId);
  }
  const { ingredients, limit } = validation.value;

  let rateResult: ReturnType<typeof consumeAiAttempt>;
  try {
    rateResult = consumeAiAttempt({
      userId: user.id,
      ip: getClientIp(request),
      action: "recipes",
    });
  } catch {
    logInternalFailure(correlationId, "attempt_limit");
    return publicErrorResponse("AI_RECOMMENDATION_UNAVAILABLE", correlationId);
  }

  if (!rateResult.allowed) {
    return publicErrorResponse(
      "AI_RATE_LIMITED",
      correlationId,
      rateResult.retryAfterSeconds
    );
  }

  try {
    const startedAt = Date.now();
    const result = await generateRecipeRecommendationsWithOpenAI({
      ingredients,
      limit,
    });
    const latencyMs = Date.now() - startedAt;

    if (!Array.isArray(result.recommendations) || result.recommendations.length === 0) {
      safelyRegisterAiFailure(user.id);
      logInternalFailure(correlationId, "empty_result");
      return publicErrorResponse("AI_RECOMMENDATION_UNAVAILABLE", correlationId);
    }

    const totalTokens = result.usage?.totalTokens;
    if (!Number.isSafeInteger(totalTokens) || totalTokens < 0) {
      safelyRegisterAiFailure(user.id);
      logInternalFailure(correlationId, "invalid_usage");
      return publicErrorResponse("AI_RECOMMENDATION_UNAVAILABLE", correlationId);
    }

    const recommendations: RecipeRecommendationDto[] = result.recommendations
      .slice(0, limit)
      .map((recipe, index) => {
        const candidate = {
          title: recipe.title,
          subtitle: recipe.subtitle,
          taste: recipe.taste,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          sourceName: recipe.sourceName,
          sourceUrl: recipe.sourceUrl,
        };
        return { id: createRecommendationId(candidate, index), ...candidate };
      });

    const budgetResult = consumeUserDailyTokenBudget({
      userId: user.id,
      tokens: totalTokens,
    });
    if (!budgetResult.allowed) {
      // The model completed successfully; a local budget denial is not an AI failure.
      safelyRegisterAiSuccess(user.id);
      return publicErrorResponse(
        "AI_TOKEN_BUDGET_EXCEEDED",
        correlationId,
        budgetResult.retryAfterSeconds
      );
    }

    safelyRegisterAiSuccess(user.id);
    const logPayload = {
      correlationId,
      ingredientCount: ingredients.length,
      requestedLimit: limit,
      recommendationCount: recommendations.length,
      fallbackUsed: result.fallbackUsed,
      latencyMs,
      totalTokens,
      strictCandidateCount: result.quality.strictCandidateCount,
      fallbackCandidateCount: result.quality.fallbackCandidateCount,
      readyCount: result.quality.readyCount,
      rejectedCount: result.quality.rejectedCount,
      rejectReasons: getNonZeroReasons(result.quality.rejectReasonCounts),
    };
    if (result.quality.rejectedCount > 0 || result.fallbackUsed) {
      console.warn("[ai.recipe.quality]", logPayload);
    } else {
      console.info("[ai.recipe.quality]", logPayload);
    }

    return jsonWithCorrelation(
      {
        recommendations,
        usage: result.usage,
        metrics: {
          latencyMs,
          fallbackUsed: result.fallbackUsed,
          parseSuccess: true,
          recommendationCount: recommendations.length,
        },
      },
      200,
      correlationId
    );
  } catch {
    safelyRegisterAiFailure(user.id);
    logInternalFailure(correlationId, "generation");
    return publicErrorResponse("AI_RECOMMENDATION_UNAVAILABLE", correlationId);
  }
}
