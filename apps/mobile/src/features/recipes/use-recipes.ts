import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi, MobileApiError, requestAuthedApi } from "@mobile/lib/api";
import {
  ensureUniqueRecommendationIds,
  MAX_RECIPE_RECOMMENDATION_INGREDIENTS,
  MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH,
  type RecipeDetailsDto,
  type RecipeRecommendationDto,
  type RecommendationsResponseDto,
  type SavedRecipeItemDto,
} from "@nyampick/contracts/recipe";

export type SavedRecipe = SavedRecipeItemDto;
export type RecipeRecommendation = RecipeRecommendationDto;

export interface RecipeIngredient {
  id: string;
  name: string;
}

const recommendationTimeoutMs = 45_000;
const fallbackTokenBudgetRetryAfterSeconds = 60;

type RecommendationFailure = {
  correlationId?: string;
  message: string;
  retryAfterSeconds?: number;
  retryable: boolean;
};

function getRetryAfterLabel(retryAfterSeconds: number) {
  if (retryAfterSeconds >= 60 * 60) return `${Math.ceil(retryAfterSeconds / (60 * 60))}시간 후`;
  if (retryAfterSeconds >= 60) return `${Math.ceil(retryAfterSeconds / 60)}분 후`;
  return `${retryAfterSeconds}초 후`;
}

function getRateLimitMessage(retryAfterSeconds?: number) {
  return retryAfterSeconds
    ? `AI 추천 요청이 많아요. ${getRetryAfterLabel(retryAfterSeconds)} 다시 시도해주세요.`
    : "AI 추천 요청이 많아요. 잠시 후 다시 시도해주세요.";
}

function getIngredientLengthMessage() {
  return `재료 이름은 ${MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH}자 이하로 선택할 수 있어요.`;
}

function getRecommendationFailure(caught: unknown): RecommendationFailure {
  if (caught instanceof MobileApiError) {
    const correlationId = caught.correlationId;

    if (caught.status === 401 || caught.code === "UNAUTHORIZED") {
      return {
        correlationId,
        message: "로그인 상태가 만료되었어요. 다시 로그인한 뒤 시도해주세요.",
        retryable: false,
      };
    }

    if (caught.code === "AI_RATE_LIMITED") {
      return {
        correlationId,
        message: getRateLimitMessage(caught.retryAfterSeconds),
        retryAfterSeconds: caught.retryAfterSeconds,
        retryable: false,
      };
    }

    if (caught.code === "AI_TOKEN_BUDGET_EXCEEDED") {
      const retryAfterSeconds = caught.retryAfterSeconds ?? fallbackTokenBudgetRetryAfterSeconds;
      return {
        correlationId,
        message: caught.retryAfterSeconds
          ? `AI 추천 한도에 도달했어요. ${getRetryAfterLabel(caught.retryAfterSeconds)} 다시 시도해주세요.`
          : "AI 추천 한도에 도달했어요. 잠시 후 다시 시도해주세요.",
        retryAfterSeconds,
        retryable: false,
      };
    }

    if (caught.code === "AI_RECOMMENDATION_UNAVAILABLE") {
      return {
        correlationId,
        message: "AI 추천 서비스를 잠시 이용할 수 없어요. 잠시 후 다시 시도해주세요.",
        retryable: true,
      };
    }

    if (caught.code === "AUTH_SERVICE_UNAVAILABLE") {
      return {
        correlationId,
        message: "로그인 서비스를 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
        retryable: true,
      };
    }

    if (caught.code?.startsWith("INVALID_") || (caught.status && caught.status >= 400 && caught.status < 500)) {
      return {
        correlationId,
        message: caught.message,
        retryable: false,
      };
    }

    return {
      correlationId,
      message: caught.message,
      retryable: true,
    };
  }

  if (caught instanceof Error) {
    if (/failed to fetch|network request failed|network error/i.test(caught.message)) {
      return { message: "네트워크 연결을 확인한 뒤 다시 시도해주세요.", retryable: true };
    }
    if (
      caught.message === "냉장고에 재료를 먼저 추가해주세요." ||
      caught.message === `추천 재료는 최대 ${MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있어요.` ||
      caught.message === getIngredientLengthMessage()
    ) {
      return { message: caught.message, retryable: false };
    }
    return { message: caught.message, retryable: true };
  }
  return { message: "레시피 추천을 준비하지 못했어요. 잠시 후 다시 시도해주세요.", retryable: true };
}

export function useRecipes() {
  const { session } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(null);
  const [recommendationCanRetry, setRecommendationCanRetry] = useState(false);
  const [recommendationRetryAfterSeconds, setRecommendationRetryAfterSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommending, setIsRecommending] = useState(false);
  const lastRecommendationIngredientsRef = useRef<string[] | null>(null);
  const lastRecommendationCorrelationIdRef = useRef<string | null>(null);
  const recommendationRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!recommendationRetryAfterSeconds) return;

    const timeout = setTimeout(() => setRecommendationRetryAfterSeconds(null), recommendationRetryAfterSeconds * 1_000);
    return () => clearTimeout(timeout);
  }, [recommendationRetryAfterSeconds]);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ items?: SavedRecipe[]; message?: string }>("/api/recipes/saved", session.access_token);
      setSavedRecipes(response.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장한 레시피를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const loadFridgeIngredients = useCallback(async () => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const fridge = await getAuthedApi<{ items?: RecipeIngredient[] }>("/api/fridge/items", session.access_token);
    return (fridge.items ?? []).filter((item) => item.id && item.name?.trim());
  }, [session?.access_token]);

  const recommend = useCallback((selectedIngredients?: string[]) => {
    if (recommendationRequestRef.current) return recommendationRequestRef.current;
    if (recommendationRetryAfterSeconds) {
      const message = getRateLimitMessage(recommendationRetryAfterSeconds);
      setRecommendationError(message);
      setRecommendationCanRetry(false);
      return Promise.reject(new Error(message));
    }

    const request = (async () => {
      if (!session?.access_token) {
        const message = "로그인 세션을 확인할 수 없어요.";
        setRecommendationError(message);
        setRecommendationCanRetry(false);
        throw new Error(message);
      }

      try {
        setIsRecommending(true);
        setError(null);
        setRecommendationError(null);
        setRecommendationNotice(null);
        setRecommendationCanRetry(false);
        lastRecommendationCorrelationIdRef.current = null;
        const candidateIngredients = selectedIngredients?.map((item) => item.trim().replace(/\s+/g, " ")).filter(Boolean) ?? (await loadFridgeIngredients()).map((item) => item.name.trim().replace(/\s+/g, " ")).filter(Boolean);
        const ingredients = Array.from(new Set(candidateIngredients));
        if (!ingredients.length) throw new Error("냉장고에 재료를 먼저 추가해주세요.");
        if (ingredients.length > MAX_RECIPE_RECOMMENDATION_INGREDIENTS) {
          throw new Error(`추천 재료는 최대 ${MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있어요.`);
        }
        if (ingredients.some((ingredient) => [...ingredient].length > MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH)) {
          throw new Error(getIngredientLengthMessage());
        }

        lastRecommendationIngredientsRef.current = ingredients;
        const response = await requestAuthedApi<RecommendationsResponseDto>("/api/recipes/recommendations", session.access_token, {
          method: "POST",
          body: { ingredients, limit: 3 },
          timeoutMs: recommendationTimeoutMs,
          timeoutMessage: "AI 추천 준비 시간이 길어지고 있어요. 네트워크를 확인한 뒤 다시 시도해주세요.",
        });
        lastRecommendationCorrelationIdRef.current = response.correlationId ?? null;
        if (response.code) {
          throw new MobileApiError(
            response.message ?? "레시피 추천을 준비하지 못했어요.",
            undefined,
            response.code,
            response.correlationId
          );
        }
        const nextRecommendations = ensureUniqueRecommendationIds(Array.isArray(response.recommendations) ? response.recommendations : []);
        if (!nextRecommendations.length) {
          throw new Error("추천 결과가 비어 있어요. 재료를 바꿔 다시 시도해주세요.");
        }

        setRecommendations(nextRecommendations);
        setRecommendationCanRetry(false);
        setRecommendationNotice(`${nextRecommendations.length}개의 AI 레시피를 준비했어요.`);
      } catch (caught) {
        const failure = getRecommendationFailure(caught);
        if (failure.correlationId) {
          lastRecommendationCorrelationIdRef.current = failure.correlationId;
        }
        setRecommendationError(failure.message);
        setRecommendationCanRetry(failure.retryable);
        setRecommendationRetryAfterSeconds(failure.retryAfterSeconds ?? null);
        throw new Error(failure.message);
      } finally {
        setIsRecommending(false);
      }
    })();

    recommendationRequestRef.current = request;
    void request.then(
      () => {
        if (recommendationRequestRef.current === request) recommendationRequestRef.current = null;
      },
      () => {
        if (recommendationRequestRef.current === request) recommendationRequestRef.current = null;
      }
    );
    return request;
  }, [loadFridgeIngredients, recommendationRetryAfterSeconds, session?.access_token]);

  const retryRecommendation = useCallback(() => {
    return recommend(lastRecommendationIngredientsRef.current ?? undefined);
  }, [recommend]);

  const saveRecommendation = useCallback(async (recipe: RecipeRecommendation) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setError(null);
      await requestAuthedApi<{ item: SavedRecipe }>("/api/recipes/saved", session.access_token, {
        method: "POST",
        body: {
          title: recipe.title,
          subtitle: recipe.subtitle,
          taste: recipe.taste,
          source: "ai",
          link: recipe.sourceUrl,
          memo: recipe.steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
          recipeData: {
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            sourceName: recipe.sourceName,
            sourceUrl: recipe.sourceUrl,
          } satisfies RecipeDetailsDto,
        },
      });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "레시피를 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    }
  }, [refresh, session?.access_token]);

  const createRecipe = useCallback(async (input: Pick<SavedRecipe, "title" | "subtitle" | "memo" | "taste" | "link">) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const title = input.title.trim();
    if (!title) throw new Error("레시피 이름을 입력해주세요.");
    try {
      setError(null);
      const response = await requestAuthedApi<{ item?: SavedRecipe; message?: string }>("/api/recipes/saved", session.access_token, {
        method: "POST",
        body: { title, subtitle: input.subtitle?.trim(), memo: input.memo?.trim(), taste: input.taste, link: input.link?.trim(), source: "manual" },
      });
      if (!response.item) throw new Error(response.message ?? "레시피를 저장하지 못했습니다.");
      setSavedRecipes((previous) => [response.item!, ...previous]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "레시피를 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    }
  }, [session?.access_token]);

  const updateRecipe = useCallback(async (id: string, patch: Partial<Pick<SavedRecipe, "title" | "subtitle" | "memo" | "favorite" | "taste" | "link" | "recipeData">>) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    if (patch.title !== undefined && !patch.title.trim()) throw new Error("레시피 이름을 입력해주세요.");
    try {
      setError(null);
      const response = await requestAuthedApi<{ item?: SavedRecipe; message?: string }>("/api/recipes/saved", session.access_token, {
        method: "PATCH",
        body: { id, ...patch, title: patch.title?.trim(), subtitle: patch.subtitle?.trim(), memo: patch.memo?.trim(), link: patch.link?.trim() },
      });
      if (!response.item) throw new Error(response.message ?? "레시피를 수정하지 못했습니다.");
      setSavedRecipes((previous) => previous.map((item) => item.id === id ? response.item! : item));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "레시피를 수정하지 못했습니다.";
      setError(message);
      throw new Error(message);
    }
  }, [session?.access_token]);

  const removeRecipe = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const previous = savedRecipes;
    setSavedRecipes((current) => current.filter((item) => item.id !== id));
    try {
      setError(null);
      await requestAuthedApi<{ ok: true; message?: string }>("/api/recipes/saved", session.access_token, { method: "DELETE", body: { id } });
    } catch (caught) {
      setSavedRecipes(previous);
      const message = caught instanceof Error ? caught.message : "레시피를 삭제하지 못했습니다.";
      setError(message);
      throw new Error(message);
    }
  }, [savedRecipes, session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { createRecipe, error, isLoading, isRecommending, loadFridgeIngredients, recommend, recommendationCanRetry, recommendationError, recommendationNotice, recommendationRetryAfterSeconds, recommendations, refresh, removeRecipe, retryRecommendation, saveRecommendation, savedRecipes, updateRecipe };
}
