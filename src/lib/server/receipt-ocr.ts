import OpenAI from "openai";

interface ReceiptOcrInput {
  imageDataUrl: string;
  fileName?: string;
}

function extractJsonArray(text: string): string[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { items?: unknown[] }).items)
    ) {
      return (parsed as { items: unknown[] }).items.filter(
        (v): v is string => typeof v === "string"
      );
    }
  } catch {
    // ignore parse errors and fallback below
  }

  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

export async function extractReceiptItemsWithOpenAI(
  input: ReceiptOcrInput
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "영수증 이미지에서 식재료/식품 품목명만 추출하세요.",
              "가격, 매장명, 날짜, 카드번호, 포인트 정보는 제외하세요.",
              "반환 형식은 JSON 객체로만: {\"items\":[\"품목1\",\"품목2\"]}",
              "중복 품목은 하나로 합치세요.",
            ].join(" "),
          },
          {
            type: "input_image",
            image_url: input.imageDataUrl,
            detail: "auto",
          },
        ],
      },
    ],
    max_output_tokens: 300,
  });

  const outputText = response.output_text?.trim() ?? "";
  const items = extractJsonArray(outputText)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const unique = Array.from(new Set(items));
  if (unique.length === 0) {
    throw new Error(
      input.fileName
        ? `영수증에서 품목을 인식하지 못했습니다: ${input.fileName}`
        : "영수증에서 품목을 인식하지 못했습니다."
    );
  }

  return unique.slice(0, 40);
}
