import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getFamilyDataScope, getFamilyLinkStatus } from "@/lib/server/family-access";
import {
  addChildToDb,
  deleteChildInDb,
  ensureDefaultChildFromDb,
  listChildrenFromDb,
  updateChildInDb,
} from "@/lib/server/supabase-children";

function isValidImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(value) && value.length <= 1_500_000;
}

function normalizeAllergies(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
  if (normalized.length > 20) return null;
  if (normalized.some((item) => item.length > 30)) return null;
  return normalized;
}

function normalizeDateInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const normalized = date.toISOString().slice(0, 10);
  return normalized === value ? normalized : undefined;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    await ensureDefaultChildFromDb(scope.ownerUserId);
    const children = await listChildrenFromDb(scope.ownerUserId);
    const activeChild = children.find((child) => child.isPrimary) ?? children[0] ?? null;
    const link = await getFamilyLinkStatus(user.id);
    return NextResponse.json({
      children,
      activeChildId: activeChild?.id ?? null,
      linkedMode: scope.isLinked,
      viewer: {
        id: user.id,
        email: user.email ?? null,
      },
      linkedInfo: link,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch children";
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
    monthsOld?: number;
    isPrimary?: boolean;
  };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }
  if (!Number.isInteger(body.monthsOld) || (body.monthsOld ?? -1) < 0) {
    return NextResponse.json(
      { message: "monthsOld must be a non-negative integer" },
      { status: 400 }
    );
  }
  const monthsOld = body.monthsOld as number;

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    if (scope.isLinked) {
      return NextResponse.json(
        { message: "linked member cannot add child" },
        { status: 403 }
      );
    }
    const child = await addChildToDb({
      userId: scope.ownerUserId,
      name: body.name.trim(),
      monthsOld,
      isPrimary: body.isPrimary,
    });
    return NextResponse.json({ child }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to add child";
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
    monthsOld?: number;
    isPrimary?: boolean;
    photoUrl?: string | null;
    allergies?: unknown;
    babyFoodStartedOn?: unknown;
  };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }
  if (body.monthsOld !== undefined && (!Number.isInteger(body.monthsOld) || body.monthsOld < 0)) {
    return NextResponse.json(
      { message: "monthsOld must be a non-negative integer" },
      { status: 400 }
    );
  }
  if (
    body.photoUrl !== undefined &&
    body.photoUrl !== null &&
    !isValidImageDataUrl(body.photoUrl)
  ) {
    return NextResponse.json({ message: "invalid photoUrl" }, { status: 400 });
  }
  const normalizedAllergies =
    body.allergies === undefined ? undefined : normalizeAllergies(body.allergies);
  if (body.allergies !== undefined && normalizedAllergies === null) {
    return NextResponse.json({ message: "invalid allergies" }, { status: 400 });
  }
  const allergies = normalizedAllergies ?? undefined;
  const babyFoodStartedOn = normalizeDateInput(body.babyFoodStartedOn);
  if (body.babyFoodStartedOn !== undefined && babyFoodStartedOn === undefined) {
    return NextResponse.json({ message: "invalid babyFoodStartedOn" }, { status: 400 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    if (scope.isLinked) {
      return NextResponse.json(
        { message: "linked member cannot edit child" },
        { status: 403 }
      );
    }
    const child = await updateChildInDb(scope.ownerUserId, body.id, {
      name: body.name?.trim(),
      monthsOld: body.monthsOld,
      isPrimary: body.isPrimary,
      photoUrl: body.photoUrl === null ? null : body.photoUrl,
      allergies,
      babyFoodStartedOn,
    });
    if (!child) {
      return NextResponse.json({ message: "child not found" }, { status: 404 });
    }
    return NextResponse.json({ child });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to update child";
    return NextResponse.json({ message }, { status: 500 });
  }
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

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    if (scope.isLinked) {
      return NextResponse.json(
        { message: "linked member cannot delete child" },
        { status: 403 }
      );
    }
    const removed = await deleteChildInDb(scope.ownerUserId, body.id);
    if (!removed) {
      return NextResponse.json({ message: "child not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to delete child";
    const status = message === "at least one child is required" ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
