export interface IngredientMeta {
  category: string;
  babySafe: boolean;
  allergy: boolean;
  goodWith: string[];
  avoidWith: string[];
}

export type IngredientMetaMap = Record<string, IngredientMeta>;

export interface RecipeEvalChecks {
  minIngredientUtilization: number;
  requireSource: boolean;
  awkwardPairs: [string, string][];
  requireBabyFriendlyTone: boolean;
  requireCookingSteps: boolean;
  avoidAllergyPush: boolean;
}

export interface RecipeEvalTestCase {
  caseId: string;
  ingredients: string[];
  allergyIngredients: string[];
  unsafeIngredients: string[];
  checks: RecipeEvalChecks;
  expected: string;
}

export interface GenerateEvalCasesOptions {
  count?: number;
  minIngredients?: number;
  maxIngredients?: number;
  seed?: string;
}

export interface RecipeEvalDetails {
  ingredientUtilization: number;
  usedIngredients: string[];
  missingIngredients: string[];
  awkwardPairs: [string, string][];
  hasSource: boolean;
  hasAllergyCaution: boolean;
  hasBabyFriendlyTone: boolean;
  hasCookingSteps: boolean;
}

export interface RecipeEvalResult {
  passed: boolean;
  score: number;
  details: RecipeEvalDetails;
  reasons: string[];
}
