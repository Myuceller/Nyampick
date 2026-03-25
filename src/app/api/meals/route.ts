import { NextResponse } from "next/server";
import type { DayMeals, MealType } from "@/lib/types";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  addMealItemsToDb,
  getAllMealsFromDb,
  getMealsByDateFromDb,
  replaceMealsByDateInDb,
  removeMealEntryInDb,
  updateMealEntryInDb,
} from "@/lib/server/supabase-meals";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const REACTIONS = ["loved", "okay", "disliked", null, undefined] as const;

function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPES.includes(value as MealType);
}

function isDateFormat(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidDayMealsPayload(value: unknown): value is Pick<
  DayMeals,
  "breakfast" | "lunch" | "dinner" | "snack"
> {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  for (const type of MEAL_TYPES) {
    if (!Array.isArray(obj[type])) return false;
    for (const item of obj[type] as unknown[]) {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;
      if (typeof entry.menuName !== "string" || entry.menuName.trim().length === 0) {
        return false;
      }
    }
  }
  return true;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ meals: await getAllMealsFromDb(user.id) });
    }

    if (!isDateFormat(date)) {
      return NextResponse.json(
        { message: "date must be YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const dayMeals = await getMealsByDateFromDb(user.id, date);
    return NextResponse.json({
      meals:
        dayMeals ??
        {
          date,
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: [],
        },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch meals";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: string;
    mealType?: MealType;
    items?: string[];
  };

  if (!isDateFormat(body.date)) {
    return NextResponse.json(
      { message: "date must be YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (!isMealType(body.mealType)) {
    return NextResponse.json({ message: "invalid mealType" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { message: "items must be a non-empty string array" },
      { status: 400 }
    );
  }

  const cleanedItems = body.items
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (cleanedItems.length === 0) {
    return NextResponse.json(
      { message: "items must contain non-empty strings" },
      { status: 400 }
    );
  }

  try {
    const updated = await addMealItemsToDb(
      user.id,
      body.date,
      body.mealType,
      cleanedItems
    );
    return NextResponse.json({ meals: updated }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to add meals";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: string;
    mealType?: MealType;
    entryId?: string;
    menuName?: string;
    quantity?: string;
    memo?: string;
    reaction?: "loved" | "okay" | "disliked" | null;
  };

  if (!isDateFormat(body.date)) {
    return NextResponse.json(
      { message: "date must be YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (!isMealType(body.mealType)) {
    return NextResponse.json({ message: "invalid mealType" }, { status: 400 });
  }

  if (typeof body.entryId !== "string" || body.entryId.length === 0) {
    return NextResponse.json({ message: "entryId is required" }, { status: 400 });
  }

  if (!REACTIONS.includes(body.reaction)) {
    return NextResponse.json({ message: "invalid reaction" }, { status: 400 });
  }

  const patch = {
    menuName: body.menuName,
    quantity: body.quantity,
    memo: body.memo,
    reaction: body.reaction ?? undefined,
  };

  if (
    patch.menuName === undefined &&
    patch.quantity === undefined &&
    patch.memo === undefined &&
    body.reaction === undefined
  ) {
    return NextResponse.json(
      { message: "at least one field to update is required" },
      { status: 400 }
    );
  }

  let updated = null;
  try {
    updated = await updateMealEntryInDb(
      user.id,
      body.date,
      body.mealType,
      body.entryId,
      patch
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to update meal";
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ message: "meal data not found" }, { status: 404 });
  }

  return NextResponse.json({ meals: updated });
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: string;
    mealType?: MealType;
    entryId?: string;
  };

  if (!isDateFormat(body.date)) {
    return NextResponse.json(
      { message: "date must be YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (!isMealType(body.mealType)) {
    return NextResponse.json({ message: "invalid mealType" }, { status: 400 });
  }

  if (typeof body.entryId !== "string" || body.entryId.length === 0) {
    return NextResponse.json({ message: "entryId is required" }, { status: 400 });
  }

  let updated = null;
  try {
    updated = await removeMealEntryInDb(
      user.id,
      body.date,
      body.mealType,
      body.entryId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to remove meal";
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ message: "meal data not found" }, { status: 404 });
  }

  return NextResponse.json({ meals: updated });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: string;
    meals?: Pick<DayMeals, "breakfast" | "lunch" | "dinner" | "snack">;
  };

  if (!isDateFormat(body.date)) {
    return NextResponse.json(
      { message: "date must be YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (!isValidDayMealsPayload(body.meals)) {
    return NextResponse.json(
      { message: "meals payload is invalid" },
      { status: 400 }
    );
  }

  try {
    const updated = await replaceMealsByDateInDb(user.id, body.date, body.meals);
    return NextResponse.json({ meals: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to replace meals";
    return NextResponse.json({ message }, { status: 500 });
  }
}
