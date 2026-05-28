export type AiTaste = "좋아해요" | "보통이에요" | "싫어해요";

export interface GenerateRecipeInput {
  ingredients: string[];
  limit: number;
}

export interface AiRecipeRecommendation {
  title: string;
  subtitle: string;
  taste: AiTaste;
  ingredients: string[];
  steps: string[];
  sourceName?: string;
  sourceUrl?: string;
}

export interface AiUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type RecipeRejectReason =
  | "title_too_long"
  | "subtitle_too_long"
  | "too_few_ingredients"
  | "too_few_steps"
  | "missing_source"
  | "awkward_pair"
  | "missing_allergy_caution"
  | "not_enough_input_match";

export interface RecipeQualityResult {
  ready: boolean;
  reasons: RecipeRejectReason[];
  recipe: AiRecipeRecommendation;
}

export interface AiRecipeQualityTelemetry {
  normalizedIngredients: string[];
  strictCandidateCount: number;
  fallbackCandidateCount: number;
  readyCount: number;
  rejectedCount: number;
  rejectReasonCounts: Record<RecipeRejectReason, number>;
}

export interface AiRecipeGenerationResult {
  recommendations: AiRecipeRecommendation[];
  usage: AiUsageSummary;
  fallbackUsed: boolean;
  quality: AiRecipeQualityTelemetry;
}
