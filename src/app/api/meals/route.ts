import { NextResponse } from "next/server";
import type { DayMeals, MealType } from "@/lib/types";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getFamilyDataScope } from "@/lib/server/family-access";
import { resolveChildIdForUser } from "@/lib/server/supabase-children";
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

type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMealType(value: JsonValue | undefined): value is MealType {
  return typeof value === "string" && MEAL_TYPES.includes(value as MealType);
}

function isDateFormat(value: JsonValue | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidDayMealsPayload(value: object | null | undefined): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, object[]>;
  for (const type of MEAL_TYPES) {
    if (!Array.isArray(obj[type])) return false;
    for (const item of obj[type]) {
      if (!item || typeof item !== "object") return false;
      const entry = item as { menuName?: string };
      if (typeof entry.menuName !== "string" || entry.menuName.trim().length === 0) {
        return false;
      }
    }
  }
  return true;
}

async function resolveScopedChildId(input: {
  ownerUserId: string;
  requestedChildId?: string;
}) {
  return resolveChildIdForUser(input.ownerUserId, input.requestedChildId);
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const requestedChildId = searchParams.get("childId");
    const scope = await getFamilyDataScope({
      userId: user.id,
      requestedChildId: requestedChildId ?? undefined,
    });
    const childId = await resolveScopedChildId({
      ownerUserId: scope.ownerUserId,
      requestedChildId: scope.childId,
    });

    if (!date) {
      return NextResponse.json({
        meals: await getAllMealsFromDb(scope.ownerUserId, childId),
        childId,
      });
    }

    if (!isDateFormat(date)) {
      return NextResponse.json(
        { message: "date must be YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const dayMeals = await getMealsByDateFromDb(scope.ownerUserId, date, childId);
    return NextResponse.json({
      childId,
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
    if (message === "child not found") {
      return NextResponse.json({ message }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const rawBody = (await request.json()) as JsonValue;
  if (!isJsonObject(rawBody)) {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
  const body = rawBody as {
    date?: string;
    childId?: string;
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
    const scope = await getFamilyDataScope({
      userId: user.id,
      requestedChildId: body.childId,
    });
    const childId = await resolveScopedChildId({
      ownerUserId: scope.ownerUserId,
      requestedChildId: scope.childId,
    });
    const updated = await addMealItemsToDb(
      scope.ownerUserId,
      body.date,
      body.mealType,
      cleanedItems,
      childId
    );
    return NextResponse.json({ meals: updated, childId }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to add meals";
    if (message === "child not found") {
      return NextResponse.json({ message }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const rawBody = (await request.json()) as JsonValue;
  if (!isJsonObject(rawBody)) {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
  const body = rawBody as {
    date?: string;
    childId?: string;
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

  try {
    const scope = await getFamilyDataScope({
      userId: user.id,
      requestedChildId: body.childId,
    });
    const childId = await resolveScopedChildId({
      ownerUserId: scope.ownerUserId,
      requestedChildId: scope.childId,
    });
    const updated = await updateMealEntryInDb(
      scope.ownerUserId,
      body.date,
      body.mealType,
      body.entryId,
      patch,
      childId
    );
    if (!updated) {
      return NextResponse.json({ message: "meal data not found" }, { status: 404 });
    }
    return NextResponse.json({ meals: updated, childId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to update meal";
    if (message === "child not found") {
      return NextResponse.json({ message }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const rawBody = (await request.json()) as JsonValue;
  if (!isJsonObject(rawBody)) {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
  const body = rawBody as {
    date?: string;
    childId?: string;
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

  try {
    const scope = await getFamilyDataScope({
      userId: user.id,
      requestedChildId: body.childId,
    });
    const childId = await resolveScopedChildId({
      ownerUserId: scope.ownerUserId,
      requestedChildId: scope.childId,
    });
    const updated = await removeMealEntryInDb(
      scope.ownerUserId,
      body.date,
      body.mealType,
      body.entryId,
      childId
    );
    if (!updated) {
      return NextResponse.json({ message: "meal data not found" }, { status: 404 });
    }
    return NextResponse.json({ meals: updated, childId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to remove meal";
    if (message === "child not found") {
      return NextResponse.json({ message }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const rawBody = (await request.json()) as JsonValue;
  if (!isJsonObject(rawBody)) {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
  const body = rawBody as {
    date?: string;
    childId?: string;
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
  const mealsPayload = body.meals as Pick<
    DayMeals,
    "breakfast" | "lunch" | "dinner" | "snack"
  >;

  try {
    const scope = await getFamilyDataScope({
      userId: user.id,
      requestedChildId: body.childId,
    });
    const childId = await resolveScopedChildId({
      ownerUserId: scope.ownerUserId,
      requestedChildId: scope.childId,
    });
    const updated = await replaceMealsByDateInDb(
      scope.ownerUserId,
      body.date,
      mealsPayload,
      childId
    );
    return NextResponse.json({ meals: updated, childId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to replace meals";
    if (message === "child not found") {
      return NextResponse.json({ message }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
