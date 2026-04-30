import { randomUUID } from "crypto";
import type { MealType } from "@/lib/types";
import { getAllMealsFromDb, getMealsByDateFromDb } from "@/lib/server/supabase-meals";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { listChildrenFromDb } from "@/lib/server/supabase-children";

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

export interface SavedRecipe {
  id: string;
  title: string;
  subtitle?: string;
  taste?: "좋아해요" | "보통이에요" | "싫어해요";
  source: "ai" | "manual";
  favorite: boolean;
  link?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  babyName: string;
  babyMonthsOld: number;
  email?: string;
  profileImageUrl?: string;
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42703" || error?.message?.includes("column");
}

function mapProfileRow(data: {
  id: string;
  name: string;
  baby_name: string;
  baby_months_old: number;
  email?: string | null;
  profile_image_url?: string | null;
}): UserProfile {
  return {
    id: data.id,
    name: data.name,
    babyName: data.baby_name,
    babyMonthsOld: data.baby_months_old,
    email: data.email ?? undefined,
    profileImageUrl: data.profile_image_url ?? undefined,
  };
}

export class DuplicateEmailAccountError extends Error {
  readonly email: string;
  readonly existingUserId: string;

  constructor(email: string, existingUserId: string) {
    super("이미 같은 이메일로 가입된 계정이 있습니다. 기존 로그인 방식으로 로그인해주세요.");
    this.name = "DuplicateEmailAccountError";
    this.email = email;
    this.existingUserId = existingUserId;
  }
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

function isCubeItemName(name: string): boolean {
  return name.includes("큐브");
}

export function isFridgeCategory(
  value: string | null | undefined
): value is FridgeCategory {
  return typeof value === "string" && FRIDGE_CATEGORIES.includes(value as FridgeCategory);
}

export async function ensureAppSeedData(
  userId: string,
  userEmail?: string,
  userNameHint?: string
) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = userEmail?.trim().toLowerCase() || undefined;

  const { data: existing, error: profileErr } = await supabase
    .from("user_profile")
    .select("id,name,email")
    .eq("id", userId);

  if (profileErr) throw profileErr;

  const guessedName = userNameHint?.trim() || userEmail?.split("@")[0] || "사용자";
  const current = existing?.[0];

  if (normalizedEmail) {
    const { data: duplicateRows, error: duplicateErr } = await supabase
      .from("user_profile")
      .select("id,email")
      .neq("id", userId)
      .ilike("email", normalizedEmail)
      .limit(1);
    if (duplicateErr) throw duplicateErr;
    const duplicated = duplicateRows?.[0];
    if (duplicated?.id) {
      throw new DuplicateEmailAccountError(normalizedEmail, duplicated.id);
    }
  }

  if (!current) {
    const { error: profileInsertError } = await supabase.from("user_profile").insert({
      id: userId,
      name: guessedName,
      baby_name: "아기",
      baby_months_old: 0,
      email: userEmail ?? null,
    });
    if (profileInsertError) throw profileInsertError;
    return;
  }

  const nextPatch: {
    name?: string;
    email?: string | null;
  } = {};

  if (
    guessedName &&
    (current.name === "냠픽 사용자" ||
      current.name === "사용자" ||
      current.name.trim().length === 0)
  ) {
    nextPatch.name = guessedName;
  }
  if (userEmail && !current.email) {
    nextPatch.email = userEmail;
  }

  if (Object.keys(nextPatch).length > 0) {
    const { error: profileUpdateError } = await supabase
      .from("user_profile")
      .update(nextPatch)
      .eq("id", userId);
    if (profileUpdateError) throw profileUpdateError;
  }
}

export async function listFridgeItemsFromDb(
  userId: string,
  filters?: {
    category?: FridgeCategory;
    keyword?: string;
  }
): Promise<FridgeItem[]> {
  await ensureAppSeedData(userId);
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("fridge_items")
    .select("id,user_id,name,category,quantity,expires_at,added_at,source")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.keyword) query = query.ilike("name", `%${filters.keyword}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: isCubeItemName(row.name) ? row.quantity ?? undefined : undefined,
    expiresAt: row.expires_at ?? undefined,
    addedAt: row.added_at,
    source: row.source,
  })) as FridgeItem[];
}

export async function addFridgeItemToDb(input: {
  userId: string;
  name: string;
  category?: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  source?: "manual" | "receipt";
}): Promise<FridgeItem> {
  const supabase = getSupabaseAdmin();
  const payload = {
    id: randomUUID(),
    user_id: input.userId,
    name: input.name,
    category: input.category ?? guessFridgeCategory(input.name),
    quantity: isCubeItemName(input.name) ? input.quantity ?? null : null,
    expires_at: input.expiresAt ?? null,
    source: input.source ?? "manual",
  };
  const { data, error } = await supabase
    .from("fridge_items")
    .insert(payload)
    .select("id,user_id,name,category,quantity,expires_at,added_at,source")
    .single();
  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    quantity: isCubeItemName(data.name) ? data.quantity ?? undefined : undefined,
    expiresAt: data.expires_at ?? undefined,
    addedAt: data.added_at,
    source: data.source,
  } as FridgeItem;
}

export async function updateFridgeItemInDb(
  userId: string,
  id: string,
  patch: Partial<Pick<FridgeItem, "name" | "category" | "quantity" | "expiresAt">>
): Promise<FridgeItem | null> {
  const supabase = getSupabaseAdmin();
  const { data: currentItem, error: currentItemError } = await supabase
    .from("fridge_items")
    .select("id,name")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (currentItemError) throw currentItemError;
  if (!currentItem) return null;

  const nextName = patch.name ?? currentItem.name;
  const quantityForPatch = isCubeItemName(nextName) ? patch.quantity : null;

  const updatePatch: Record<string, string | null | undefined> = {
    name: patch.name,
    category: patch.category,
    quantity: quantityForPatch,
    expires_at: patch.expiresAt,
  };
  Object.keys(updatePatch).forEach((key) => {
    if (updatePatch[key] === undefined) delete updatePatch[key];
  });

  if (Object.keys(updatePatch).length === 0) {
    const { data, error } = await supabase
      .from("fridge_items")
      .select("id,user_id,name,category,quantity,expires_at,added_at,source")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      quantity: isCubeItemName(data.name) ? data.quantity ?? undefined : undefined,
      expiresAt: data.expires_at ?? undefined,
      addedAt: data.added_at,
      source: data.source,
    } as FridgeItem;
  }

  const { data, error } = await supabase
    .from("fridge_items")
    .update(updatePatch)
    .eq("user_id", userId)
    .eq("id", id)
    .select("id,user_id,name,category,quantity,expires_at,added_at,source")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    quantity: isCubeItemName(data.name) ? data.quantity ?? undefined : undefined,
    expiresAt: data.expires_at ?? undefined,
    addedAt: data.added_at,
    source: data.source,
  } as FridgeItem;
}

export async function deleteFridgeItemInDb(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fridge_items")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function listSavedRecipesFromDb(userId: string): Promise<SavedRecipe[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("saved_recipes")
    .select(
      "id,user_id,title,subtitle,taste,source,favorite,link,memo,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    taste: row.taste ?? undefined,
    source: row.source,
    favorite: Boolean(row.favorite),
    link: row.link ?? undefined,
    memo: row.memo ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as SavedRecipe[];
}

export async function addSavedRecipeToDb(input: {
  userId: string;
  title: string;
  subtitle?: string;
  taste?: "좋아해요" | "보통이에요" | "싫어해요";
  source: "ai" | "manual";
  favorite?: boolean;
  link?: string;
  memo?: string;
}): Promise<SavedRecipe> {
  const supabase = getSupabaseAdmin();

  const payload = {
    id: randomUUID(),
    user_id: input.userId,
    title: input.title,
    subtitle: input.subtitle ?? null,
    taste: input.taste ?? null,
    source: input.source,
    favorite: input.favorite ?? false,
    link: input.link ?? null,
    memo: input.memo ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("saved_recipes")
    .insert(payload)
    .select(
      "id,user_id,title,subtitle,taste,source,favorite,link,memo,created_at,updated_at"
    )
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle ?? undefined,
    taste: data.taste ?? undefined,
    source: data.source,
    favorite: Boolean(data.favorite),
    link: data.link ?? undefined,
    memo: data.memo ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as SavedRecipe;
}

export async function updateSavedRecipeInDb(
  userId: string,
  id: string,
  patch: Partial<
    Pick<SavedRecipe, "title" | "subtitle" | "taste" | "favorite" | "link" | "memo">
  >
): Promise<SavedRecipe | null> {
  const supabase = getSupabaseAdmin();

  const updatePatch: Record<
    string,
    string | boolean | null | undefined | "좋아해요" | "보통이에요" | "싫어해요"
  > = {
    title: patch.title,
    subtitle: patch.subtitle,
    taste: patch.taste,
    favorite: patch.favorite,
    link: patch.link,
    memo: patch.memo,
    updated_at: nowIso(),
  };
  Object.keys(updatePatch).forEach((key) => {
    if (updatePatch[key] === undefined) delete updatePatch[key];
  });

  const { data, error } = await supabase
    .from("saved_recipes")
    .update(updatePatch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(
      "id,user_id,title,subtitle,taste,source,favorite,link,memo,created_at,updated_at"
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle ?? undefined,
    taste: data.taste ?? undefined,
    source: data.source,
    favorite: Boolean(data.favorite),
    link: data.link ?? undefined,
    memo: data.memo ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as SavedRecipe;
}

export async function deleteSavedRecipeInDb(
  userId: string,
  id: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getProfileFromDb(
  userId: string,
  userEmail?: string,
  userNameHint?: string
): Promise<UserProfile> {
  await ensureAppSeedData(userId, userEmail, userNameHint);
  const supabase = getSupabaseAdmin();
  const query = supabase
    .from("user_profile")
    .select("id,name,baby_name,baby_months_old,email,profile_image_url")
    .eq("id", userId)
    .single();

  const { data, error } = await query;
  if (error && isMissingColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("user_profile")
      .select("id,name,baby_name,baby_months_old,email")
      .eq("id", userId)
      .single();
    if (fallbackError) throw fallbackError;
    return mapProfileRow(fallbackData);
  }
  if (error) throw error;
  return mapProfileRow(data);
}

export async function updateProfileInDb(
  userId: string,
  patch: Partial<Pick<UserProfile, "name" | "babyName" | "babyMonthsOld" | "email">> & {
    profileImageUrl?: string | null;
  }
): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  const updatePatch: Record<string, string | number | null | undefined> = {
    name: patch.name,
    baby_name: patch.babyName,
    baby_months_old: patch.babyMonthsOld,
    email: patch.email,
    profile_image_url: patch.profileImageUrl,
  };
  Object.keys(updatePatch).forEach((key) => {
    if (updatePatch[key] === undefined) delete updatePatch[key];
  });

  const { data, error } = await supabase
    .from("user_profile")
    .update(updatePatch)
    .eq("id", userId)
    .select("id,name,baby_name,baby_months_old,email,profile_image_url")
    .maybeSingle();
  if (error) {
    if (isMissingColumnError(error) && patch.profileImageUrl !== undefined) {
      throw new Error("profile_image_url column is missing. Run docs/supabase-meals.sql migration.");
    }
    throw error;
  }

  if (!data) {
    await ensureAppSeedData(userId, patch.email ?? undefined, patch.name ?? undefined);
    const { data: inserted, error: insertedError } = await supabase
      .from("user_profile")
      .update(updatePatch)
      .eq("id", userId)
      .select("id,name,baby_name,baby_months_old,email,profile_image_url")
      .single();
    if (insertedError) throw insertedError;
    return mapProfileRow(inserted);
  }

  return mapProfileRow(data);
}

function collectRecentMealNames(
  meals: Record<string, { breakfast: Array<{ menuName: string }>; lunch: Array<{ menuName: string }>; dinner: Array<{ menuName: string }>; snack: Array<{ menuName: string }> }>,
  days = 7
): string[] {
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

function getNutritionGap(recent: string[]): "carb" | "protein" | "fat" {
  const buckets = { carb: 0, protein: 0, fat: 0 };
  for (const name of recent) {
    const bucket = classifyNutritionBucket(name);
    if (bucket !== "other") buckets[bucket] += 1;
  }

  if (buckets.protein <= buckets.carb && buckets.protein <= buckets.fat) return "protein";
  if (buckets.carb <= buckets.protein && buckets.carb <= buckets.fat) return "carb";
  return "fat";
}

export async function getRecipeRecommendationsFromDb(
  userId: string,
  limit = 5
): Promise<RecipeRecommendation[]> {
  const [fridgeItems, meals] = await Promise.all([
    listFridgeItemsFromDb(userId),
    getAllMealsFromDb(userId),
  ]);
  const fridgeNames = fridgeItems.map((item) => item.name);
  const recentMeals = collectRecentMealNames(meals, 7);
  const nutritionGap = getNutritionGap(collectRecentMealNames(meals, 3));

  const scored = SAMPLE_RECIPES.map((recipe) => {
    const fridgeMatchCount = recipe.ingredients.filter((ing) =>
      fridgeNames.some((name) => ing.includes(name) || name.includes(ing))
    ).length;

    const recentlyEatenCount = recentMeals.filter((name) =>
      recipe.ingredients.some((ing) => name.includes(ing) || ing.includes(name))
    ).length;

    let score = fridgeMatchCount * 2 - recentlyEatenCount * 0.4;
    if (recipe.focus === nutritionGap) score += 1.5;

    return { recipe, fridgeMatchCount, recentlyEatenCount, score };
  })
    .filter((item) => item.fridgeMatchCount > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      id: item.recipe.id,
      title: item.recipe.title,
      description: item.recipe.description,
      ingredients: item.recipe.ingredients,
      mealType: item.recipe.mealType,
      reasons: [
        `냉장고 재료 ${item.fridgeMatchCount}개를 활용할 수 있어요.`,
        `최근 식단 기준 ${nutritionGap} 보강에 맞춘 추천이에요.`,
        ...(item.recentlyEatenCount > 0
          ? ["최근 자주 먹은 메뉴와 겹치지 않도록 조정했어요."]
          : []),
      ],
      nutrition: item.recipe.nutrition,
      fridgeMatchCount: item.fridgeMatchCount,
    }));

  if (scored.length > 0) return scored;

  return SAMPLE_RECIPES.slice(0, limit).map((recipe) => ({
    ...recipe,
    reasons: [
      "냉장고 재료 매칭이 적어 기본 추천 레시피를 표시했어요.",
      "식단 기록이 쌓이면 개인화 추천 정확도가 올라갑니다.",
    ],
    fridgeMatchCount: 0,
  }));
}

export async function getHomeSummaryFromDb(
  userId: string,
  options?: { familyMemberCount?: number }
) {
  const today = todayKey();
  const [todayMeals, allMeals, fridgeItems, children] = await Promise.all([
    getMealsByDateFromDb(userId, today),
    getAllMealsFromDb(userId),
    listFridgeItemsFromDb(userId),
    listChildrenFromDb(userId),
  ]);
  const primaryChild = children.find((child) => child.isPrimary) ?? children[0] ?? null;

  return {
    date: today,
    meals: allMeals,
    todayMeals:
      todayMeals ??
      {
        date: today,
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      },
    fridgeItemCount: fridgeItems.length,
    familyMemberCount: options?.familyMemberCount ?? 0,
    primaryChild: primaryChild
      ? {
          id: primaryChild.id,
          name: primaryChild.name,
          monthsOld: primaryChild.monthsOld,
          photoUrl: primaryChild.photoUrl,
        }
      : null,
  };
}
