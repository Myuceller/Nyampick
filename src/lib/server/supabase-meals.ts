import { randomUUID } from "crypto";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type MealRow = {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  menu_name: string;
  quantity: string | null;
  memo: string | null;
  reaction: "loved" | "okay" | "disliked" | null;
};

function createEmptyDay(date: string): DayMeals {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function rowToEntry(row: MealRow): MealEntry {
  return {
    id: row.id,
    menuName: row.menu_name,
    quantity: row.quantity ?? undefined,
    memo: row.memo ?? undefined,
    reaction: row.reaction ?? undefined,
  };
}

function rowsToMealsMap(rows: MealRow[]): Record<string, DayMeals> {
  const map: Record<string, DayMeals> = {};
  for (const row of rows) {
    if (!map[row.date]) {
      map[row.date] = createEmptyDay(row.date);
    }
    map[row.date][row.meal_type].push(rowToEntry(row));
  }
  return map;
}

export async function ensureMealSeedData(userId: string) {
  // New users start with empty meal data by design.
  void userId;
}

export async function getAllMealsFromDb(userId: string): Promise<Record<string, DayMeals>> {
  await ensureMealSeedData(userId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meal_entries")
    .select("id,user_id,date,meal_type,menu_name,quantity,memo,reaction")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;
  return rowsToMealsMap((data ?? []) as MealRow[]);
}

export async function getMealsByDateFromDb(
  userId: string,
  date: string
): Promise<DayMeals | null> {
  await ensureMealSeedData(userId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meal_entries")
    .select("id,user_id,date,meal_type,menu_name,quantity,memo,reaction")
    .eq("user_id", userId)
    .eq("date", date);

  if (error) throw error;
  const rows = (data ?? []) as MealRow[];
  if (rows.length === 0) return null;
  return rowsToMealsMap(rows)[date] ?? null;
}

export async function addMealItemsToDb(
  userId: string,
  date: string,
  mealType: MealType,
  items: string[]
): Promise<DayMeals> {
  const supabase = getSupabaseAdmin();
  const rows: MealRow[] = items.map((menuName) => ({
    id: randomUUID(),
    user_id: userId,
    date,
    meal_type: mealType,
    menu_name: menuName,
    quantity: null,
    memo: null,
    reaction: null,
  }));

  const { error } = await supabase.from("meal_entries").insert(rows);
  if (error) throw error;

  const day = await getMealsByDateFromDb(userId, date);
  return day ?? createEmptyDay(date);
}

export async function updateMealEntryInDb(
  userId: string,
  date: string,
  mealType: MealType,
  entryId: string,
  patch: Partial<Pick<MealEntry, "menuName" | "quantity" | "memo" | "reaction">>
): Promise<DayMeals | null> {
  const supabase = getSupabaseAdmin();
  const updatePatch: Partial<MealRow> = {};

  if (patch.menuName !== undefined) updatePatch.menu_name = patch.menuName;
  if (patch.quantity !== undefined) updatePatch.quantity = patch.quantity ?? null;
  if (patch.memo !== undefined) updatePatch.memo = patch.memo ?? null;
  if (patch.reaction !== undefined) updatePatch.reaction = patch.reaction ?? null;

  const { error } = await supabase
    .from("meal_entries")
    .update(updatePatch)
    .eq("user_id", userId)
    .eq("id", entryId)
    .eq("date", date)
    .eq("meal_type", mealType);

  if (error) throw error;
  return getMealsByDateFromDb(userId, date);
}

export async function removeMealEntryInDb(
  userId: string,
  date: string,
  mealType: MealType,
  entryId: string
): Promise<DayMeals | null> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", entryId)
    .eq("date", date)
    .eq("meal_type", mealType);

  if (error) throw error;
  return getMealsByDateFromDb(userId, date);
}

export async function replaceMealsByDateInDb(
  userId: string,
  date: string,
  meals: Pick<DayMeals, "breakfast" | "lunch" | "dinner" | "snack">
): Promise<DayMeals> {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("meal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
  if (deleteError) throw deleteError;

  const rows: MealRow[] = [];
  for (const mealType of MEAL_TYPES) {
    for (const entry of meals[mealType]) {
      rows.push({
        id: entry.id || randomUUID(),
        user_id: userId,
        date,
        meal_type: mealType,
        menu_name: entry.menuName,
        quantity: entry.quantity ?? null,
        memo: entry.memo ?? null,
        reaction: entry.reaction ?? null,
      });
    }
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("meal_entries").insert(rows);
    if (insertError) throw insertError;
  }

  return (
    (await getMealsByDateFromDb(userId, date)) ?? {
      date,
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
  );
}
