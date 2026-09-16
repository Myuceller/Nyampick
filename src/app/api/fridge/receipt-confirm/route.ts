import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getFamilyDataScope } from "@/lib/server/family-access";
import {
  confirmPersistentReceiptScanSession,
  getPersistentReceiptScanSession,
  ReceiptScanSessionStorageError,
} from "@/lib/server/receipt-scan-sessions";
import { isFridgeCategory } from "@/lib/server/supabase-app-data";

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

  let sessionResult;
  try {
    sessionResult = await getPersistentReceiptScanSession({ scanId: body.scanId, userId: user.id });
  } catch (error) {
    const message =
      error instanceof ReceiptScanSessionStorageError
        ? error.message
        : "영수증 분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
    return NextResponse.json(
      { message },
      { status: error instanceof ReceiptScanSessionStorageError ? 503 : 500 }
    );
  }
  if (sessionResult.status !== "available") {
    const status = sessionResult.status === "already_confirmed" ? 409 : sessionResult.status === "expired" ? 410 : 404;
    return NextResponse.json({ message: `scan session ${sessionResult.status.replace("_", " ")}` }, { status });
  }

  const selectedMap = new Map(body.selected.map((item) => [item.tempId, item]));
  const selectedCandidates = sessionResult.session.candidates.filter((candidate) =>
    selectedMap.has(candidate.tempId)
  );
  if (!selectedCandidates.length) {
    return NextResponse.json({ message: "selected candidates not found in scan session" }, { status: 400 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const result = await confirmPersistentReceiptScanSession({
      scanId: body.scanId,
      userId: user.id,
      storageUserId: scope.ownerUserId,
      selected: selectedCandidates.map((candidate) => {
        const picked = selectedMap.get(candidate.tempId)!;
        return {
          tempId: candidate.tempId,
          name:
            typeof picked.name === "string" && picked.name.trim().length > 0
              ? picked.name.trim()
              : candidate.name,
          category:
            picked.category && isFridgeCategory(picked.category)
              ? picked.category
              : candidate.category,
          quantity: picked.quantity ?? candidate.quantity,
          expiresAt: picked.expiresAt,
        };
      }),
    });

    if (result.status !== "confirmed") {
      const status = result.status === "already_confirmed" ? 409 : result.status === "expired" ? 410 : result.status === "invalid_selection" ? 400 : 404;
      return NextResponse.json({ message: `scan session ${result.status.replace("_", " ")}` }, { status });
    }

    return NextResponse.json({
      addedCount: result.items.length,
      items: result.items,
    });
  } catch (error) {
    const message =
      error instanceof ReceiptScanSessionStorageError
        ? error.message
        : error instanceof Error
          ? error.message
          : "failed to confirm receipt scan";
    return NextResponse.json(
      { message },
      { status: error instanceof ReceiptScanSessionStorageError ? 503 : 500 }
    );
  }
}
