/**
 * Transport-only recipe contracts shared by the web API and native app.
 * Keep this package independent from React, Next.js, Expo, storage, and secrets.
 */

export type RecipeTaste = "좋아해요" | "보통이에요" | "싫어해요";
export type RecipeSource = "ai" | "manual";

export const MAX_RECIPE_RECOMMENDATION_INGREDIENTS = 20;
export const MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH = 80;
export const MIN_RECIPE_RECOMMENDATION_LIMIT = 1;
export const MAX_RECIPE_RECOMMENDATION_LIMIT = 10;
export const DEFAULT_RECIPE_RECOMMENDATION_LIMIT = 3;

export interface RecipeDetailsDto {
  ingredients: string[];
  steps: string[];
  sourceName?: string;
  sourceUrl?: string;
}

export interface SavedRecipeItemDto {
  id: string;
  title: string;
  subtitle?: string;
  taste?: RecipeTaste;
  source: RecipeSource;
  favorite: boolean;
  link?: string;
  memo?: string;
  recipeData?: RecipeDetailsDto;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRecipesResponseDto {
  items?: SavedRecipeItemDto[];
  message?: string;
}

export interface SavedRecipeMutationResponseDto {
  item?: SavedRecipeItemDto;
  message?: string;
}

export interface RecipeRecommendationDto {
  id: string;
  title: string;
  subtitle: string;
  taste: RecipeTaste;
  ingredients: string[];
  steps: string[];
  sourceName?: string;
  sourceUrl?: string;
}

export type RecipeRecommendationErrorCode =
  | "UNAUTHORIZED"
  | "AUTH_SERVICE_UNAVAILABLE"
  | "INVALID_JSON"
  | "INVALID_INGREDIENTS"
  | "INVALID_LIMIT"
  | "AI_RATE_LIMITED"
  | "AI_TOKEN_BUDGET_EXCEEDED"
  | "AI_RECOMMENDATION_UNAVAILABLE";

export type RecipeRecommendationInputDto = Omit<RecipeRecommendationDto, "id"> & {
  id?: string;
};

export interface RecommendationsResponseDto {
  recommendations?: RecipeRecommendationDto[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  metrics?: {
    latencyMs?: number;
    fallbackUsed?: boolean;
    parseSuccess?: boolean;
    recommendationCount?: number;
  };
  code?: RecipeRecommendationErrorCode;
  correlationId?: string;
  message?: string;
}

const MAX_INGREDIENTS = 30;
const MAX_STEPS = 20;
const MAX_ITEM_LENGTH = 160;
const MAX_SOURCE_NAME_LENGTH = 160;
const MAX_SOURCE_URL_LENGTH = 2_048;

function normalizeStringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_ITEM_LENGTH))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeOptionalString(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) || undefined : undefined;
}

/**
 * Normalizes persisted AI recipe fields. `undefined` means no details were
 * supplied; an object always results in a safe, serializable details value.
 */
export function normalizeRecipeDetails(value: unknown): RecipeDetailsDto | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;

  const input = value as Record<string, unknown>;
  return {
    ingredients: normalizeStringList(input.ingredients, MAX_INGREDIENTS),
    steps: normalizeStringList(input.steps, MAX_STEPS),
    sourceName: normalizeOptionalString(input.sourceName, MAX_SOURCE_NAME_LENGTH),
    sourceUrl: normalizeOptionalString(input.sourceUrl, MAX_SOURCE_URL_LENGTH),
  };
}

export function isCompleteAiRecipeDetails(value: RecipeDetailsDto | undefined) {
  return Boolean(value && value.ingredients.length > 0 && value.steps.length > 0);
}

/**
 * API recommendations have no database ID yet. Derive an opaque, deterministic
 * card ID from the complete result and its list position so selection never
 * falls back to a title or array index alone.
 */
export function createRecommendationId(
  recipe: Omit<RecipeRecommendationDto, "id">,
  position: number
) {
  const source = JSON.stringify([
    position,
    recipe.title,
    recipe.subtitle,
    recipe.taste,
    recipe.ingredients,
    recipe.steps,
    recipe.sourceName ?? "",
    recipe.sourceUrl ?? "",
  ]);
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `ai-${position + 1}-${(hash >>> 0).toString(36)}`;
}

/**
 * Keeps recommendation cards addressable when an older API deployment omits
 * IDs, and repairs duplicate IDs before a client renders or selects them.
 */
export function ensureUniqueRecommendationIds(
  recommendations: RecipeRecommendationInputDto[]
): RecipeRecommendationDto[] {
  const usedIds = new Set<string>();

  return recommendations.map(({ id: responseId, ...recipe }, position) => {
    const fallbackId = createRecommendationId(recipe, position);
    const preferredId = responseId?.trim() || fallbackId;
    let id = preferredId;
    let duplicateIndex = 1;

    while (usedIds.has(id)) {
      id = `${fallbackId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedIds.add(id);

    return { id, ...recipe };
  });
}
