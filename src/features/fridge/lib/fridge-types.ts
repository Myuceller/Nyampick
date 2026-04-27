export type FridgeCategory =
  | "fruit"
  | "vegetable"
  | "protein"
  | "dairy"
  | "grain"
  | "sauce"
  | "snack"
  | "other";

export type FridgeSectionKey = "cube" | FridgeCategory;

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
  chipLabel: string;
  items: FridgeItem[];
}

export const FRIDGE_SECTION_ORDER: FridgeSectionKey[] = [
  "cube",
  "protein",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "sauce",
  "snack",
  "other",
];

export const FRIDGE_SECTION_META: Record<
  FridgeSectionKey,
  { label: string; emoji: string; chipLabel: string }
> = {
  cube: { label: "큐브 이유식", emoji: "🧊", chipLabel: "큐브 이유식" },
  protein: { label: "단백질", emoji: "🥩", chipLabel: "단백질" },
  vegetable: { label: "채소", emoji: "🥦", chipLabel: "채소" },
  fruit: { label: "과일", emoji: "🍎", chipLabel: "과일" },
  dairy: { label: "유제품", emoji: "🥛", chipLabel: "유제품" },
  grain: { label: "곡물", emoji: "🌾", chipLabel: "곡물" },
  sauce: { label: "소스", emoji: "🧂", chipLabel: "소스" },
  snack: { label: "간식", emoji: "🍪", chipLabel: "간식" },
  other: { label: "기타", emoji: "🍽️", chipLabel: "기타" },
};

export const FRIDGE_CATEGORY_LABEL: Record<FridgeCategory, string> = {
  protein: "단백질",
  vegetable: "채소",
  fruit: "과일",
  dairy: "유제품",
  grain: "곡물",
  sauce: "소스",
  snack: "간식",
  other: "기타",
};

export const FRIDGE_CATEGORY_TEXT_COLOR: Record<FridgeCategory, string> = {
  protein: "text-[#ff3b30]",
  vegetable: "text-[#3fb68b]",
  fruit: "text-[#ff4fb5]",
  dairy: "text-[#5f8cff]",
  grain: "text-[#f5a524]",
  sauce: "text-[#9a6bff]",
  snack: "text-[#e08a22]",
  other: "text-[#7d8682]",
};

export function sectionFromFridgeItem(item: FridgeItem): FridgeSectionKey {
  if (item.name.includes("큐브")) return "cube";
  return item.category;
}
