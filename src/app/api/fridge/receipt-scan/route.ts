import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { extractReceiptItemsWithOpenAI } from "@/lib/server/receipt-ocr";
import {
  createPersistentReceiptScanSession,
  getPersistentReceiptScanSession,
  ReceiptScanSessionStorageError,
} from "@/lib/server/receipt-scan-sessions";
import {
  consumeAiAttempt,
  getClientIp,
  registerAiFailure,
  registerAiSuccess,
} from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    rawText?: string;
    imageDataUrl?: string;
    fileName?: string;
  };

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  const imageDataUrl =
    typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
  const hasRawText = rawText.length > 0;
  const hasImage = imageDataUrl.length > 0;
  if (!hasRawText && !hasImage) {
    return NextResponse.json(
      { message: "rawText or imageDataUrl is required" },
      { status: 400 }
    );
  }

  // Prevent oversized payload abuse before AI call.
  if (hasImage && imageDataUrl.length > 7_000_000) {
    return NextResponse.json(
      { message: "imageDataUrl is too large" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const rateResult = consumeAiAttempt({
    userId: user.id,
    ip,
    action: "ocr",
  });
  if (!rateResult.allowed) {
    const response = NextResponse.json(
      {
        message:
          rateResult.message ?? "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 429 }
    );
    if (rateResult.retryAfterSeconds) {
      response.headers.set("Retry-After", String(rateResult.retryAfterSeconds));
    }
    return response;
  }

  let sourceText = hasRawText ? rawText : undefined;
  if (!sourceText && hasImage) {
    try {
      const items = await extractReceiptItemsWithOpenAI({
        imageDataUrl,
        fileName: body.fileName,
      });
      sourceText = items.join("\n");
      registerAiSuccess({ userId: user.id, action: "ocr" });
    } catch (error) {
      registerAiFailure({ userId: user.id, action: "ocr" });
      const message =
        error instanceof Error ? error.message : "영수증 OCR 처리에 실패했습니다.";
      return NextResponse.json({ message }, { status: 500 });
    }
  } else {
    registerAiSuccess({ userId: user.id, action: "ocr" });
  }

  let session;
  try {
    session = await createPersistentReceiptScanSession({
      userId: user.id,
      rawText: sourceText ?? "",
    });
  } catch (error) {
    const message =
      error instanceof ReceiptScanSessionStorageError
        ? error.message
        : "영수증 분석 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
    return NextResponse.json(
      { message },
      { status: error instanceof ReceiptScanSessionStorageError ? 503 : 500 }
    );
  }

  return NextResponse.json(
    {
      scanId: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      candidates: session.candidates,
      message:
        "영수증 스캔 후보를 반환했습니다. 선택한 항목만 /api/fridge/receipt-confirm 로 확정하세요.",
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get("scanId");

  if (!scanId) {
    return NextResponse.json({ message: "scanId is required" }, { status: 400 });
  }

  let result;
  try {
    result = await getPersistentReceiptScanSession({ scanId, userId: user.id });
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
  if (result.status !== "available") {
    const status = result.status === "already_confirmed" ? 409 : result.status === "expired" ? 410 : 404;
    return NextResponse.json({ message: `scan session ${result.status.replace("_", " ")}` }, { status });
  }

  return NextResponse.json(result.session);
}
