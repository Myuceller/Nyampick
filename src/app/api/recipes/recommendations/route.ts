import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { generateRecipeRecommendationsWithOpenAI } from "@/lib/server/recipe-ai";
import {
  consumeAiAttempt,
  consumeUserDailyTokenBudget,
  getClientIp,
  registerAiFailure,
  registerAiSuccess,
} from "@/lib/server/rate-limit";

interface RecommendationsRequestBody {
  ingredients?: string[];
  limit?: number;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RecommendationsRequestBody;

  if (!Array.isArray(body.ingredients)) {
    return NextResponse.json(
      { message: "ingredients must be an array" },
      { status: 400 }
    );
  }

  const ingredients = body.ingredients
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 20);

  if (ingredients.length === 0) {
    return NextResponse.json(
      { message: "at least one ingredient is required" },
      { status: 400 }
    );
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(10, Math.floor(body.limit)))
      : 3;

  const ip = getClientIp(request);
  const rateResult = consumeAiAttempt({
    userId: user.id,
    ip,
    action: "recipes",
  });
  if (!rateResult.allowed) {
    const response = NextResponse.json(
      {
        message:
          rateResult.message ?? "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 429 }
    );
    if (rateResult.retryAfterSeconds) {
      response.headers.set("Retry-After", String(rateResult.retryAfterSeconds));
    }
    return response;
  }

  try {
    const result = await generateRecipeRecommendationsWithOpenAI({
      ingredients,
      limit,
    });

    const budgetResult = consumeUserDailyTokenBudget({
      userId: user.id,
      tokens: result.usage.totalTokens,
    });
    if (!budgetResult.allowed) {
      registerAiFailure({ userId: user.id, action: "recipes" });
      const response = NextResponse.json(
        {
          message:
            budgetResult.message ??
            "오늘 사용 가능한 AI 토큰 예산을 모두 사용했습니다. 내일 다시 시도해주세요.",
        },
        { status: 429 }
      );
      if (budgetResult.retryAfterSeconds) {
        response.headers.set("Retry-After", String(budgetResult.retryAfterSeconds));
      }
      return response;
    }

    registerAiSuccess({ userId: user.id, action: "recipes" });

    return NextResponse.json({
      recommendations: result.recommendations,
      usage: result.usage,
    });
  } catch (error) {
    registerAiFailure({ userId: user.id, action: "recipes" });
    const message =
      error instanceof Error ? error.message : "failed to generate recommendations";
    return NextResponse.json({ message }, { status: 500 });
  }
}
