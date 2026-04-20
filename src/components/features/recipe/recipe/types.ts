export type RecipeSource = "ai" | "manual";
export type TasteLevel = "좋아해요" | "보통이에요" | "싫어해요";
export type TabKey = "all" | "ai" | "favorite";
export type AiSheetView = "select" | "result";

export type FridgeSectionKey =
  | "cube"
  | "protein"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "grain"
  | "sauce"
  | "snack"
  | "other";

export type FridgeCategory = Exclude<FridgeSectionKey, "cube">;

export interface RecipeItem {
  id: string;
  title: string;
  subtitle: string;
  taste: TasteLevel;
  source: RecipeSource;
  favorite: boolean;
  ctaLabel?: string;
  link?: string;
  memo?: string;
  ingredients?: string[];
  steps?: string[];
}

export interface GeneratedRecipe {
  id: string;
  title: string;
  subtitle: string;
  taste: TasteLevel;
  ingredients: string[];
  steps: string[];
  sourceName?: string;
  sourceUrl?: string;
}

export interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

export interface FridgeSection {
  key: FridgeSectionKey;
  label: string;
  emoji: string;
  items: FridgeItem[];
}
