import type { DayMeals, MealEntry, MealType, MenuItem } from "./types";

// Sample menu items
export const SAMPLE_MENUS: MenuItem[] = [
  { id: "1", name: "닭안심 채소죽", category: "rice", isFavorite: true },
  { id: "2", name: "소고기야채 주먹밥", category: "rice", isFavorite: true },
  { id: "3", name: "단호박감자 으깬죽", category: "rice", isFavorite: false },
  { id: "4", name: "흰쌀밥", category: "rice", isFavorite: false },
  { id: "5", name: "잡곡밥", category: "rice", isFavorite: false },
  { id: "6", name: "미역두부국", category: "soup", isFavorite: true },
  { id: "7", name: "소고기뭇국", category: "soup", isFavorite: false },
  { id: "8", name: "된장국", category: "soup", isFavorite: false },
  { id: "9", name: "달걀탕", category: "soup", isFavorite: false },
  { id: "10", name: "두부시금치 계란찜", category: "side", isFavorite: true },
  { id: "11", name: "감자채볶음", category: "side", isFavorite: false },
  { id: "12", name: "멸치볶음", category: "side", isFavorite: false },
  { id: "13", name: "당근달걀말이", category: "side", isFavorite: true },
  { id: "14", name: "연두부", category: "side", isFavorite: false },
  { id: "15", name: "바나나 큐브", category: "snack", isFavorite: true },
  { id: "16", name: "요거트", category: "snack", isFavorite: true },
  { id: "17", name: "방울토마토", category: "snack", isFavorite: false },
  { id: "18", name: "고구마 스틱", category: "snack", isFavorite: false },
  { id: "19", name: "과일 퓨레", category: "snack", isFavorite: false },
  { id: "20", name: "유산균", category: "vitamin", isFavorite: true },
  { id: "21", name: "비타민D", category: "vitamin", isFavorite: true },
  { id: "22", name: "철분제", category: "vitamin", isFavorite: false },
  { id: "23", name: "연어구이", category: "side", isFavorite: false },
  { id: "24", name: "대구살 찜", category: "side", isFavorite: false },
  { id: "25", name: "브로콜리 퓨레", category: "side", isFavorite: false },
];

// Sample meal data
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getSampleMealData(): Record<string, DayMeals> {
  const today = new Date();
  const formatDate = (d: Date) => formatLocalDate(d);

  const dates: Record<string, DayMeals> = {};

  // Today
  dates[formatDate(today)] = {
    date: formatDate(today),
    breakfast: [
      { id: "b1", menuName: "닭안심 채소죽", reaction: "loved" },
      { id: "b2", menuName: "바나나 큐브", reaction: "loved" },
    ],
    lunch: [
      { id: "l1", menuName: "소고기야채 주먹밥", reaction: "okay" },
      { id: "l2", menuName: "미역두부국", reaction: "loved" },
    ],
    dinner: [
      { id: "d1", menuName: "두부시금치 계란찜", reaction: "okay" },
      { id: "d2", menuName: "단호박감자 으깬죽" },
    ],
    snack: [
      { id: "s1", menuName: "요거트", reaction: "loved" },
      { id: "s2", menuName: "방울토마토", reaction: "disliked" },
    ],
  };

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  dates[formatDate(yesterday)] = {
    date: formatDate(yesterday),
    breakfast: [
      { id: "yb1", menuName: "흰쌀밥" },
      { id: "yb2", menuName: "된장국" },
    ],
    lunch: [
      { id: "yl1", menuName: "잡곡밥" },
      { id: "yl2", menuName: "감자채볶음" },
    ],
    dinner: [
      { id: "yd1", menuName: "소고기뭇국" },
      { id: "yd2", menuName: "연두부" },
    ],
    snack: [{ id: "ys1", menuName: "고구마 스틱", reaction: "loved" }],
  };

  // Day before yesterday
  const dayBefore = new Date(today);
  dayBefore.setDate(dayBefore.getDate() - 2);
  dates[formatDate(dayBefore)] = {
    date: formatDate(dayBefore),
    breakfast: [
      { id: "db1", menuName: "단호박감자 으깬죽", reaction: "okay" },
    ],
    lunch: [
      { id: "dl1", menuName: "닭안심 채소죽", reaction: "loved" },
      { id: "dl2", menuName: "당근달걀말이", reaction: "loved" },
    ],
    dinner: [
      { id: "dd1", menuName: "연어구이", reaction: "loved" },
      { id: "dd2", menuName: "달걀탕" },
    ],
    snack: [
      { id: "ds1", menuName: "과일 퓨레" },
      { id: "ds2", menuName: "유산균" },
    ],
  };

  // A few more days
  for (let i = 3; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates[formatDate(d)] = {
      date: formatDate(d),
      breakfast: [{ id: `e${i}b`, menuName: "흰쌀밥" }],
      lunch: [{ id: `e${i}l`, menuName: "소고기야채 주먹밥" }],
      dinner: [{ id: `e${i}d`, menuName: "멸치볶음" }],
      snack: [{ id: `e${i}s`, menuName: "바나나 큐브" }],
    };
  }

  return dates;
}

export function createMealEntry(menuName: string): MealEntry {
  return {
    id: Math.random().toString(36).substring(2, 9),
    menuName,
  };
}

export function getMealCount(dayMeals: DayMeals | undefined): Record<MealType, number> {
  if (!dayMeals) return { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  return {
    breakfast: dayMeals.breakfast.length,
    lunch: dayMeals.lunch.length,
    dinner: dayMeals.dinner.length,
    snack: dayMeals.snack.length,
  };
}
