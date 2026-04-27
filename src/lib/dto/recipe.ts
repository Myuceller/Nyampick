export interface SavedRecipeItemDto {
  id: string;
  title: string;
  subtitle?: string;
  taste?: string;
  source?: string;
  favorite?: boolean;
  link?: string;
  memo?: string;
}

export interface SavedRecipesResponseDto {
  items?: SavedRecipeItemDto[];
  message?: string;
}

export interface SavedRecipeMutationResponseDto {
  item?: SavedRecipeItemDto;
  message?: string;
}

export interface RecommendationItemDto {
  title?: string;
  subtitle?: string;
  taste?: string;
  ingredients?: string[];
  steps?: string[];
  source_name?: string;
  source_url?: string;
}

export interface AllergyWarningDto {
  allergy: string;
  matchedValue: string;
  matchedTerm: string;
}

export interface RecommendationsResponseDto {
  allergyWarnings?: AllergyWarningDto[];
  excludedIngredients?: string[];
  recommendations?: RecommendationItemDto[];
  message?: string;
}
