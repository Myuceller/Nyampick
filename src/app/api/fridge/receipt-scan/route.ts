import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { extractReceiptItemsWithOpenAI } from "@/lib/server/receipt-ocr";
import {
  createReceiptScanSession,
  getReceiptScanSession,
} from "@/lib/server/meal-api-store";

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

  let sourceText = body.rawText;
  if (!sourceText && body.imageDataUrl) {
    try {
      const items = await extractReceiptItemsWithOpenAI({
        imageDataUrl: body.imageDataUrl,
        fileName: body.fileName,
      });
      sourceText = items.join("\n");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "영수증 OCR 처리에 실패했습니다.";
      return NextResponse.json({ message }, { status: 500 });
    }
  }

  const session = createReceiptScanSession(sourceText);

  return NextResponse.json(
    {
      scanId: session.id,
      createdAt: session.createdAt,
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

  const session = getReceiptScanSession(scanId);
  if (!session) {
    return NextResponse.json({ message: "scan session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
