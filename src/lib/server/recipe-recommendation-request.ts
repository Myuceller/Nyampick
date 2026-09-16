import {
  DEFAULT_RECIPE_RECOMMENDATION_LIMIT,
  MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH,
  MAX_RECIPE_RECOMMENDATION_INGREDIENTS,
  MAX_RECIPE_RECOMMENDATION_LIMIT,
  MIN_RECIPE_RECOMMENDATION_LIMIT,
  type RecipeRecommendationErrorCode,
} from "@nyampick/contracts/recipe";

export const MAX_RECOMMENDATION_INGREDIENTS = MAX_RECIPE_RECOMMENDATION_INGREDIENTS;
export const MAX_RECOMMENDATION_INGREDIENT_LENGTH =
  MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH;
export const MIN_RECOMMENDATION_LIMIT = MIN_RECIPE_RECOMMENDATION_LIMIT;
export const MAX_RECOMMENDATION_LIMIT = MAX_RECIPE_RECOMMENDATION_LIMIT;
export const DEFAULT_RECOMMENDATION_LIMIT = DEFAULT_RECIPE_RECOMMENDATION_LIMIT;

export interface ValidRecipeRecommendationRequest {
  ingredients: string[];
  limit: number;
}

export type RecipeRecommendationRequestErrorCode =
  | "INVALID_JSON"
  | "INVALID_INGREDIENTS"
  | "INVALID_LIMIT";

export type RecipeRecommendationApiErrorCode = RecipeRecommendationErrorCode;

export interface RecipeRecommendationRequestValidationError {
  ok: false;
  code: RecipeRecommendationRequestErrorCode;
  message: string;
}

export interface RecipeRecommendationRequestValidationSuccess {
  ok: true;
  value: ValidRecipeRecommendationRequest;
}

export type RecipeRecommendationRequestValidationResult =
  | RecipeRecommendationRequestValidationError
  | RecipeRecommendationRequestValidationSuccess;

export interface PublicRecipeRecommendationError {
  code: RecipeRecommendationApiErrorCode;
  message: string;
  status: 400 | 401 | 429 | 503;
}

const publicErrors: Record<RecipeRecommendationApiErrorCode, PublicRecipeRecommendationError> = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "로그인이 필요합니다.",
    status: 401,
  },
  AUTH_SERVICE_UNAVAILABLE: {
    code: "AUTH_SERVICE_UNAVAILABLE",
    message: "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
    status: 503,
  },
  INVALID_JSON: {
    code: "INVALID_JSON",
    message: "요청 형식을 확인해주세요.",
    status: 400,
  },
  INVALID_INGREDIENTS: {
    code: "INVALID_INGREDIENTS",
    message: "추천 받을 재료를 1개 이상 20개 이하로 입력해주세요. 재료 이름은 각각 80자 이하여야 합니다.",
    status: 400,
  },
  INVALID_LIMIT: {
    code: "INVALID_LIMIT",
    message: "추천 개수는 1개 이상 10개 이하의 정수여야 합니다.",
    status: 400,
  },
  AI_RATE_LIMITED: {
    code: "AI_RATE_LIMITED",
    message: "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
    status: 429,
  },
  AI_TOKEN_BUDGET_EXCEEDED: {
    code: "AI_TOKEN_BUDGET_EXCEEDED",
    message: "오늘 사용 가능한 AI 추천 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.",
    status: 429,
  },
  AI_RECOMMENDATION_UNAVAILABLE: {
    code: "AI_RECOMMENDATION_UNAVAILABLE",
    message: "레시피 추천을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
    status: 503,
  },
};

export function getPublicRecipeRecommendationError(
  code: RecipeRecommendationApiErrorCode
): PublicRecipeRecommendationError {
  return publicErrors[code];
}

function invalidRequest(
  code: RecipeRecommendationRequestErrorCode
): RecipeRecommendationRequestValidationError {
  const error = getPublicRecipeRecommendationError(code);
  return { ok: false, code, message: error.message };
}

/**
 * Validates the transport boundary before a request consumes an AI rate-limit
 * attempt or sends user content to a model provider.
 */
export function validateRecipeRecommendationRequest(
  body: unknown
): RecipeRecommendationRequestValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return invalidRequest("INVALID_JSON");
  }

  const input = body as Record<string, unknown>;
  if (
    !Array.isArray(input.ingredients) ||
    input.ingredients.length < 1 ||
    input.ingredients.length > MAX_RECOMMENDATION_INGREDIENTS
  ) {
    return invalidRequest("INVALID_INGREDIENTS");
  }

  const ingredients: string[] = [];
  const seenIngredients = new Set<string>();
  for (const value of input.ingredients) {
    if (typeof value !== "string") {
      return invalidRequest("INVALID_INGREDIENTS");
    }

    const ingredient = value.trim().replace(/\s+/g, " ");
    if (
      ingredient.length === 0 ||
      [...ingredient].length > MAX_RECOMMENDATION_INGREDIENT_LENGTH
    ) {
      return invalidRequest("INVALID_INGREDIENTS");
    }

    const key = ingredient.toLocaleLowerCase("ko-KR");
    if (!seenIngredients.has(key)) {
      seenIngredients.add(key);
      ingredients.push(ingredient);
    }
  }

  const rawLimit = input.limit;
  if (
    rawLimit !== undefined &&
    (typeof rawLimit !== "number" ||
      !Number.isInteger(rawLimit) ||
      rawLimit < MIN_RECOMMENDATION_LIMIT ||
      rawLimit > MAX_RECOMMENDATION_LIMIT)
  ) {
    return invalidRequest("INVALID_LIMIT");
  }

  return {
    ok: true,
    value: {
      ingredients,
      limit: rawLimit ?? DEFAULT_RECOMMENDATION_LIMIT,
    },
  };
}
