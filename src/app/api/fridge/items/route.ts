import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getFamilyDataScope } from "@/lib/server/family-access";
import {
  addFridgeItemToDb,
  deleteFridgeItemInDb,
  isFridgeCategory,
  listFridgeItemsFromDb,
  updateFridgeItemInDb,
} from "@/lib/server/supabase-app-data";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const keyword = searchParams.get("keyword") ?? undefined;

    if (categoryParam && !isFridgeCategory(categoryParam)) {
      return NextResponse.json({ message: "invalid category" }, { status: 400 });
    }
    const category = categoryParam && isFridgeCategory(categoryParam) ? categoryParam : undefined;

    return NextResponse.json({
      items: await listFridgeItemsFromDb(scope.ownerUserId, { category, keyword }),
    });
  } catch (error) {
    const message = getErrorMessage(error, "failed to fetch fridge items");
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    category?: string;
    quantity?: string;
    expiresAt?: string;
  };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  if (body.category && !isFridgeCategory(body.category)) {
    return NextResponse.json({ message: "invalid category" }, { status: 400 });
  }
  const category = body.category && isFridgeCategory(body.category) ? body.category : undefined;

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const item = await addFridgeItemToDb({
      userId: scope.ownerUserId,
      name: body.name.trim(),
      category,
      quantity: body.quantity,
      expiresAt: body.expiresAt,
      source: "manual",
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error, "failed to add fridge item");
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    category?: string;
    quantity?: string;
    expiresAt?: string;
  };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  if (body.category && !isFridgeCategory(body.category)) {
    return NextResponse.json({ message: "invalid category" }, { status: 400 });
  }
  const category = body.category && isFridgeCategory(body.category) ? body.category : undefined;

  let updated = null;
  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    updated = await updateFridgeItemInDb(scope.ownerUserId, body.id, {
      name: body.name,
      category,
      quantity: body.quantity,
      expiresAt: body.expiresAt,
    });
  } catch (error) {
    const message = getErrorMessage(error, "failed to update fridge item");
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ message: "item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  let removed = false;
  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    removed = await deleteFridgeItemInDb(scope.ownerUserId, body.id);
  } catch (error) {
    const message = getErrorMessage(error, "failed to delete fridge item");
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!removed) {
    return NextResponse.json({ message: "item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
