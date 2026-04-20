import { FridgeItem, FridgeSectionKey, TabKey, TasteLevel } from "./types";

export const SECTION_ORDER: FridgeSectionKey[] = [
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

export const SECTION_META: Record<FridgeSectionKey, { label: string; emoji: string }> = {
  cube: { label: "큐브 이유식", emoji: "🧊" },
  protein: { label: "단백질", emoji: "🥩" },
  vegetable: { label: "채소", emoji: "🥦" },
  fruit: { label: "과일", emoji: "🍎" },
  dairy: { label: "유제품", emoji: "🥛" },
  grain: { label: "곡물", emoji: "🌾" },
  sauce: { label: "소스", emoji: "🧂" },
  snack: { label: "간식", emoji: "🍪" },
  other: { label: "기타", emoji: "🍽️" },
};

export const TASTE_STYLES: Record<TasteLevel, string> = {
  좋아해요: "bg-[#dff0e7] text-[#36a978]",
  보통이에요: "bg-[#f8f0d8] text-[#d5881c]",
  싫어해요: "bg-[#ffe7ea] text-[#ff4a6a]",
};

export const TAB_LABELS: Record<TabKey, string> = {
  all: "전체 레시피",
  ai: "AI 추천",
  favorite: "즐겨찾기",
};

export function sectionFromItem(item: FridgeItem): FridgeSectionKey {
  if (item.name.includes("큐브")) return "cube";
  return item.category;
}
