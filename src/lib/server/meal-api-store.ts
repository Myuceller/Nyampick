import { randomUUID } from "crypto";
import { SAMPLE_MENUS, getSampleMealData } from "@/lib/meal-store";
import type { DayMeals, MealType, MenuItem } from "@/lib/types";

export type FridgeCategory =
  | "fruit"
  | "vegetable"
  | "protein"
  | "dairy"
  | "grain"
  | "sauce"
  | "snack"
  | "other";

export interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

export interface ReceiptScanCandidate {
  tempId: string;
  name: string;
  category: FridgeCategory;
  confidence: number;
}

export interface ReceiptScanSession {
  id: string;
  createdAt: string;
  candidates: ReceiptScanCandidate[];
}

export interface FamilyMember {
  id: string;
  name: string;
  role: "mother" | "father" | "grandparent" | "caregiver";
  status: "connected" | "pending";
  invitedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  babyName: string;
  babyMonthsOld: number;
  email?: string;
}

interface RecipeRecommendation {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  mealType: MealType;
  reasons: string[];
  nutrition: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
  };
  fridgeMatchCount: number;
}

interface MealApiStore {
  meals: Record<string, DayMeals>;
  menus: MenuItem[];
  fridgeItems: FridgeItem[];
  receiptScans: Record<string, ReceiptScanSession>;
  profile: UserProfile;
  familyMembers: FamilyMember[];
}

declare global {
  // eslint-disable-next-line no-var
  var __mealApiStore: MealApiStore | undefined;
}

const FRIDGE_CATEGORIES: FridgeCategory[] = [
  "fruit",
  "vegetable",
  "protein",
  "dairy",
  "grain",
  "sauce",
  "snack",
  "other",
];

const SAMPLE_RECIPES = [
  {
    id: "rec-1",
    title: "닭안심 채소죽",
    description: "부드러운 단백질과 채소를 함께 넣은 균형식",
    ingredients: ["닭안심", "당근", "감자", "쌀"],
    mealType: "dinner" as MealType,
    nutrition: { carbs: 48, protein: 30, fat: 22, calories: 360 },
    focus: "protein" as const,
  },
  {
    id: "rec-2",
    title: "두부 시금치 계란찜",
    description: "단백질과 철분을 보강하는 반찬",
    ingredients: ["두부", "시금치", "계란"],
    mealType: "lunch" as MealType,
    nutrition: { carbs: 20, protein: 46, fat: 34, calories: 290 },
    focus: "protein" as const,
  },
  {
    id: "rec-3",
    title: "소고기 당근 진밥",
    description: "철분 섭취를 위한 소고기 중심 식단",
    ingredients: ["소고기", "당근", "쌀"],
    mealType: "lunch" as MealType,
    nutrition: { carbs: 52, protein: 32, fat: 16, calories: 380 },
    focus: "carb" as const,
  },
  {
    id: "rec-4",
    title: "바나나 요거트 볼",
    description: "간단한 간식용 에너지 보충",
    ingredients: ["바나나", "요거트"],
    mealType: "snack" as MealType,
    nutrition: { carbs: 62, protein: 18, fat: 20, calories: 210 },
    focus: "carb" as const,
  },
  {
    id: "rec-5",
    title: "연어 감자구이",
    description: "오메가3와 단백질 보강",
    ingredients: ["연어", "감자", "브로콜리"],
    mealType: "dinner" as MealType,
    nutrition: { carbs: 34, protein: 42, fat: 24, calories: 420 },
    focus: "protein" as const,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createStore(): MealApiStore {
  return {
    meals: getSampleMealData(),
    menus: [...SAMPLE_MENUS],
    fridgeItems: [
      {
        id: randomUUID(),
        name: "사과",
        category: "fruit",
        quantity: "3개",
        addedAt: nowIso(),
        source: "manual",
      },
      {
        id: randomUUID(),
        name: "삼겹살",
        category: "protein",
        quantity: "600g",
        addedAt: nowIso(),
        source: "receipt",
      },
      {
        id: randomUUID(),
        name: "두부",
        category: "protein",
        quantity: "1모",
        addedAt: nowIso(),
        source: "manual",
      },
    ],
    receiptScans: {},
    profile: {
      id: "me",
      name: "하율맘",
      babyName: "하율",
      babyMonthsOld: 11,
      email: "mammanote@example.com",
    },
    familyMembers: [
      {
        id: randomUUID(),
        name: "하율아빠",
        role: "father",
        status: "connected",
        invitedAt: nowIso(),
      },
    ],
  };
}

function getStore(): MealApiStore {
  if (!global.__mealApiStore) {
    global.__mealApiStore = createStore();
  }
  return global.__mealApiStore;
}

function createEmptyDay(date: string): DayMeals {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function guessFridgeCategory(name: string): FridgeCategory {
  const n = name.toLowerCase();
  if (["사과", "바나나", "딸기", "토마토", "apple", "banana"].some((k) => n.includes(k))) {
    return "fruit";
  }
  if (["당근", "브로콜리", "양파", "감자", "시금치", "배추", "오이"].some((k) => n.includes(k))) {
    return "vegetable";
  }
  if (["소고기", "돼지", "삼겹", "닭", "연어", "두부", "계란", "고기"].some((k) => n.includes(k))) {
    return "protein";
  }
  if (["우유", "치즈", "요거트"].some((k) => n.includes(k))) {
    return "dairy";
  }
  if (["쌀", "밥", "빵", "면", "오트", "곡물"].some((k) => n.includes(k))) {
    return "grain";
  }
  if (["간장", "된장", "고추장", "소스", "참기름"].some((k) => n.includes(k))) {
    return "sauce";
  }
  if (["과자", "젤리", "아이스크림", "스낵"].some((k) => n.includes(k))) {
    return "snack";
  }
  return "other";
}

function classifyNutritionBucket(name: string): "carb" | "protein" | "fat" | "other" {
  const n = name.toLowerCase();
  if (["밥", "쌀", "죽", "빵", "감자", "고구마", "면", "바나나"].some((k) => n.includes(k))) {
    return "carb";
  }
  if (["닭", "소고기", "돼지", "두부", "계란", "연어", "대구", "요거트"].some((k) => n.includes(k))) {
    return "protein";
  }
  if (["치즈", "견과", "참기름", "버터"].some((k) => n.includes(k))) {
    return "fat";
  }
  return "other";
}

function getMealsByDate(date: string): DayMeals | null {
  return getStore().meals[date] ?? null;
}

export function getMenus(
  category?: MenuItem["category"],
  favoritesOnly?: boolean
): MenuItem[] {
  const { menus } = getStore();
  return menus.filter((menu) => {
    if (category && menu.category !== category) return false;
    if (favoritesOnly && !menu.isFavorite) return false;
    return true;
  });
}

export function listFridgeItems(filters?: {
  category?: FridgeCategory;
  keyword?: string;
}): FridgeItem[] {
  const items = getStore().fridgeItems;
  return items.filter((item) => {
    if (filters?.category && item.category !== filters.category) return false;
    if (filters?.keyword && !item.name.includes(filters.keyword)) return false;
    return true;
  });
}

export function addFridgeItem(input: {
  name: string;
  category?: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  source?: "manual" | "receipt";
}): FridgeItem {
  const store = getStore();
  const item: FridgeItem = {
    id: randomUUID(),
    name: input.name,
    category: input.category ?? guessFridgeCategory(input.name),
    quantity: input.quantity,
    expiresAt: input.expiresAt,
    addedAt: nowIso(),
    source: input.source ?? "manual",
  };
  store.fridgeItems.unshift(item);
  return item;
}

export function updateFridgeItem(
  id: string,
  patch: Partial<Pick<FridgeItem, "name" | "category" | "quantity" | "expiresAt">>
): FridgeItem | null {
  const store = getStore();
  const idx = store.fridgeItems.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const current = store.fridgeItems[idx];
  const updated: FridgeItem = {
    ...current,
    ...patch,
    category:
      patch.category ??
      (patch.name && !patch.category
        ? guessFridgeCategory(patch.name)
        : current.category),
  };

  store.fridgeItems[idx] = updated;
  return updated;
}

export function deleteFridgeItem(id: string): boolean {
  const store = getStore();
  const before = store.fridgeItems.length;
  store.fridgeItems = store.fridgeItems.filter((item) => item.id !== id);
  return before !== store.fridgeItems.length;
}

export function createReceiptScanSession(rawText?: string): ReceiptScanSession {
  const store = getStore();
  const sessionId = randomUUID();

  const parsedLines = (rawText ?? "사과\n삼겹살\n두부\n바나나\n요거트")
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const unique = Array.from(new Set(parsedLines));

  const candidates: ReceiptScanCandidate[] = unique.map((name, index) => ({
    tempId: `${sessionId}-${index}`,
    name,
    category: guessFridgeCategory(name),
    confidence: Math.max(0.65, 0.96 - index * 0.04),
  }));

  const session: ReceiptScanSession = {
    id: sessionId,
    createdAt: nowIso(),
    candidates,
  };

  store.receiptScans[sessionId] = session;
  return session;
}

export function getReceiptScanSession(scanId: string): ReceiptScanSession | null {
  return getStore().receiptScans[scanId] ?? null;
}

export function confirmReceiptScanSelection(input: {
  scanId: string;
  selected: Array<{
    tempId: string;
    category?: FridgeCategory;
    quantity?: string;
    expiresAt?: string;
  }>;
}): FridgeItem[] | null {
  const store = getStore();
  const session = store.receiptScans[input.scanId];
  if (!session) return null;

  const selectedMap = new Map(input.selected.map((item) => [item.tempId, item]));

  const createdItems: FridgeItem[] = [];
  for (const candidate of session.candidates) {
    const picked = selectedMap.get(candidate.tempId);
    if (!picked) continue;

    createdItems.push(
      addFridgeItem({
        name: candidate.name,
        category: picked.category ?? candidate.category,
        quantity: picked.quantity,
        expiresAt: picked.expiresAt,
        source: "receipt",
      })
    );
  }

  delete store.receiptScans[input.scanId];
  return createdItems;
}

export function getProfile(): UserProfile {
  return getStore().profile;
}

export function updateProfile(
  patch: Partial<Pick<UserProfile, "name" | "babyName" | "babyMonthsOld" | "email">>
): UserProfile {
  const store = getStore();
  store.profile = { ...store.profile, ...patch };
  return store.profile;
}

export function listFamilyMembers(): FamilyMember[] {
  return getStore().familyMembers;
}

export function addFamilyMember(input: {
  name: string;
  role: FamilyMember["role"];
}): FamilyMember {
  const store = getStore();
  const member: FamilyMember = {
    id: randomUUID(),
    name: input.name,
    role: input.role,
    status: "pending",
    invitedAt: nowIso(),
  };
  store.familyMembers.push(member);
  return member;
}

export function removeFamilyMember(id: string): boolean {
  const store = getStore();
  const before = store.familyMembers.length;
  store.familyMembers = store.familyMembers.filter((member) => member.id !== id);
  return before !== store.familyMembers.length;
}

function collectRecentMealNames(days = 7): string[] {
  const meals = getStore().meals;
  const keys = Object.keys(meals).sort((a, b) => (a < b ? 1 : -1)).slice(0, days);

  const names: string[] = [];
  for (const key of keys) {
    const day = meals[key];
    for (const type of ["breakfast", "lunch", "dinner", "snack"] as MealType[]) {
      names.push(...day[type].map((entry) => entry.menuName));
    }
  }
  return names;
}

function getNutritionGap(): "carb" | "protein" | "fat" {
  const recent = collectRecentMealNames(3);
  const buckets = { carb: 0, protein: 0, fat: 0 };

  for (const name of recent) {
    const bucket = classifyNutritionBucket(name);
    if (bucket !== "other") {
      buckets[bucket] += 1;
    }
  }

  if (buckets.protein <= buckets.carb && buckets.protein <= buckets.fat) {
    return "protein";
  }
  if (buckets.carb <= buckets.protein && buckets.carb <= buckets.fat) {
    return "carb";
  }
  return "fat";
}

export function getRecipeRecommendations(limit = 5): RecipeRecommendation[] {
  const fridgeItems = getStore().fridgeItems;
  const fridgeNames = fridgeItems.map((item) => item.name);
  const recentMeals = collectRecentMealNames(7);
  const nutritionGap = getNutritionGap();

  const scored = SAMPLE_RECIPES.map((recipe) => {
    const fridgeMatchCount = recipe.ingredients.filter((ing) =>
      fridgeNames.some((name) => ing.includes(name) || name.includes(ing))
    ).length;

    const recentlyEatenCount = recentMeals.filter((name) =>
      recipe.ingredients.some((ing) => name.includes(ing) || ing.includes(name))
    ).length;

    let score = fridgeMatchCount * 2 - recentlyEatenCount * 0.4;
    if (recipe.focus === nutritionGap) {
      score += 1.5;
    }

    return { recipe, fridgeMatchCount, recentlyEatenCount, score };
  })
    .filter((item) => item.fridgeMatchCount > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => {
      const reasons = [
        `냉장고 재료 ${item.fridgeMatchCount}개를 활용할 수 있어요.`,
        `최근 식단 기준 ${nutritionGap} 보강에 맞춘 추천이에요.`,
      ];
      if (item.recentlyEatenCount > 0) {
        reasons.push("최근 자주 먹은 메뉴와 겹치지 않도록 조정했어요.");
      }

      return {
        id: item.recipe.id,
        title: item.recipe.title,
        description: item.recipe.description,
        ingredients: item.recipe.ingredients,
        mealType: item.recipe.mealType,
        reasons,
        nutrition: item.recipe.nutrition,
        fridgeMatchCount: item.fridgeMatchCount,
      };
    });

  if (scored.length > 0) {
    return scored;
  }

  return SAMPLE_RECIPES.slice(0, limit).map((recipe) => ({
    ...recipe,
    reasons: [
      "냉장고 재료 매칭이 적어 기본 추천 레시피를 표시했어요.",
      "식단 기록이 쌓이면 개인화 추천 정확도가 올라갑니다.",
    ],
    fridgeMatchCount: 0,
  }));
}

export function getHomeSummary() {
  const today = todayKey();
  const todayMeals = getMealsByDate(today) ?? createEmptyDay(today);

  return {
    date: today,
    todayMeals,
    fridgeItemCount: getStore().fridgeItems.length,
    familyMemberCount: getStore().familyMembers.length + 1,
  };
}

export function isFridgeCategory(value: unknown): value is FridgeCategory {
  return typeof value === "string" && FRIDGE_CATEGORIES.includes(value as FridgeCategory);
}
