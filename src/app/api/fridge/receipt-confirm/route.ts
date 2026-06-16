import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getFamilyDataScope } from "@/lib/server/family-access";
import {
  getReceiptScanSession,
  isFridgeCategory,
} from "@/lib/server/meal-api-store";
import { addFridgeItemToDb } from "@/lib/server/supabase-app-data";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    scanId?: string;
    selected?: Array<{
      tempId: string;
      name?: string;
      category?: string;
      quantity?: string;
      expiresAt?: string;
    }>;
  };

  if (typeof body.scanId !== "string" || body.scanId.length === 0) {
    return NextResponse.json({ message: "scanId is required" }, { status: 400 });
  }

  if (!Array.isArray(body.selected) || body.selected.length === 0) {
    return NextResponse.json(
      { message: "selected must be a non-empty array" },
      { status: 400 }
    );
  }

  for (const item of body.selected) {
    if (item.category && !isFridgeCategory(item.category)) {
      return NextResponse.json(
        { message: `invalid category: ${item.category}` },
        { status: 400 }
      );
    }
    if (typeof item.name === "string" && item.name.trim().length === 0) {
      return NextResponse.json(
        { message: "name must not be empty" },
        { status: 400 }
      );
    }
  }

  const session = getReceiptScanSession(body.scanId);
  if (!session) {
    return NextResponse.json({ message: "scan session not found" }, { status: 404 });
  }

  const selectedMap = new Map(body.selected.map((item) => [item.tempId, item]));
  const selectedCandidates = session.candidates.filter((candidate) =>
    selectedMap.has(candidate.tempId)
  );

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const created = await Promise.all(
      selectedCandidates.map((candidate) => {
        const picked = selectedMap.get(candidate.tempId)!;
        return addFridgeItemToDb({
          userId: scope.ownerUserId,
          name:
            typeof picked.name === "string" && picked.name.trim().length > 0
              ? picked.name.trim()
              : candidate.name,
          category:
            picked.category && isFridgeCategory(picked.category)
              ? picked.category
              : candidate.category,
          quantity: picked.quantity,
          expiresAt: picked.expiresAt,
          source: "receipt",
        });
      })
    );

    return NextResponse.json({
      addedCount: created.length,
      items: created,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to confirm receipt scan";
    return NextResponse.json({ message }, { status: 500 });
  }
}
