import OpenAI from "openai";
import { expandAllergyTerms, includesAllergyTerm } from "@/lib/allergy-utils";

export type AiTaste = "좋아해요" | "보통이에요" | "싫어해요";

export interface AiRecipeRecommendation {
  title: string;
  subtitle: string;
  taste: AiTaste;
  ingredients: string[];
  steps: string[];
  sourceName?: string;
  sourceUrl?: string;
}

interface GenerateRecipeInput {
  ingredients: string[];
  excludedIngredients?: string[];
  limit: number;
}

export interface AiUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiRecipeGenerationResult {
  recommendations: AiRecipeRecommendation[];
  usage: AiUsageSummary;
}

type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

interface RecipeCandidate {
  title?: JsonValue;
  subtitle?: JsonValue;
  taste?: JsonValue;
  ingredients?: JsonValue;
  steps?: JsonValue;
  source_name?: JsonValue;
  source_url?: JsonValue;
}

function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseRecommendations(
  text: string,
  options?: { requireSource?: boolean }
): AiRecipeRecommendation[] {
  const requireSource = options?.requireSource ?? true;
  const cleaned = stripCodeFence(text);

  let parsed: JsonValue;
  try {
    parsed = JSON.parse(cleaned) as JsonValue;
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const recipes = (parsed as { recipes?: JsonValue }).recipes;
  if (!Array.isArray(recipes)) {
    throw new Error("AI 응답에 recipes 배열이 없습니다.");
  }

  const validTaste: AiTaste[] = ["좋아해요", "보통이에요", "싫어해요"];

  return recipes
    .filter((item) => !!item && typeof item === "object")
    .map((itemRaw) => {
      const item = itemRaw as RecipeCandidate;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const subtitle =
        typeof item.subtitle === "string" ? item.subtitle.trim() : "";
      const taste = validTaste.includes(item.taste as AiTaste)
        ? (item.taste as AiTaste)
        : "보통이에요";
      const ingredients = Array.isArray(item.ingredients)
        ? item.ingredients
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
            .slice(0, 8)
        : [];
      const steps = Array.isArray(item.steps)
        ? item.steps
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
            .slice(0, 5)
        : [];
      const sourceName =
        typeof item.source_name === "string" ? item.source_name.trim() : "";
      const sourceUrl =
        typeof item.source_url === "string" ? item.source_url.trim() : "";
      const hasValidSource = sourceName.length > 0 && isValidHttpUrl(sourceUrl);

      return {
        title,
        subtitle,
        taste,
        ingredients,
        steps,
        sourceName: hasValidSource ? sourceName : undefined,
        sourceUrl: hasValidSource ? sourceUrl : undefined,
      };
    })
    .filter(
      (item) =>
        item.title.length > 0 &&
        item.subtitle.length > 0 &&
        item.ingredients.length > 0 &&
        item.steps.length > 0 &&
        (!requireSource || Boolean(item.sourceName && item.sourceUrl))
    );
}

function filterBlockedRecommendations(
  recipes: AiRecipeRecommendation[],
  blockedIngredients: string[]
) {
  if (blockedIngredients.length === 0) return recipes;

  return recipes.filter((recipe) => {
    const fields = [recipe.title, recipe.subtitle, ...recipe.ingredients];
    return !fields.some((field) => includesAllergyTerm(field, blockedIngredients));
  });
}

async function generateOnce(
  client: OpenAI,
  model: string,
  input: GenerateRecipeInput,
  requireSource: boolean
) {
  const systemText = requireSource
    ? [
        "너는 영유아 식단 레시피 추천 전문가다.",
        "반드시 JSON만 출력하고 설명 문장은 출력하지 않는다.",
        "절대 자유롭게 새 레시피를 창작하지 말고, 실제 공개 레시피를 근거로만 추천한다.",
        "출처를 확인할 수 없는 레시피는 절대 포함하지 않는다.",
        "유아식으로 부적절하거나 맛 조합이 어색한 조합은 제외한다.",
        "서로 충돌하는 재료 조합(예: 육류+과일 퓨레의 부자연 조합)은 피한다.",
        '반환 형식: {"recipes":[{"title":"...","subtitle":"...","taste":"좋아해요|보통이에요|싫어해요","ingredients":["..."],"steps":["..."],"source_name":"...","source_url":"https://..."}]}',
        "title은 18자 이내의 한국어 레시피명으로 작성한다.",
        "subtitle은 28자 이내의 한국어 설명으로 작성한다.",
        "ingredients는 3~6개 한국어 재료명 배열로 작성한다.",
        "steps는 3~4개 한국어 조리 순서 배열로 작성한다.",
        "source_name은 출처명, source_url은 실제 접속 가능한 링크를 넣는다.",
        "source_name/source_url을 채울 수 없으면 해당 레시피는 제외한다.",
        "입력된 재료를 최대한 활용하고, 이유식/유아식 톤을 유지한다.",
        input.excludedIngredients?.length
          ? `제외 재료: ${expandAllergyTerms(input.excludedIngredients).join(", ")}. 제외 재료 또는 그 재료가 들어간 가공식품/대체 표현은 절대 추천하지 않는다.`
          : "",
      ].join(" ")
    : [
        "너는 영유아 식단 레시피 추천 전문가다.",
        "반드시 JSON만 출력하고 설명 문장은 출력하지 않는다.",
        "자유로운 기괴 조합은 금지하고, 한국에서 일반적으로 먹는 유아식 조합만 사용한다.",
        "서로 충돌하는 재료 조합(예: 육류+과일 퓨레의 부자연 조합)은 피한다.",
        "입력 재료로 만들기 어려우면 일부만 사용해도 된다.",
        '반환 형식: {"recipes":[{"title":"...","subtitle":"...","taste":"좋아해요|보통이에요|싫어해요","ingredients":["..."],"steps":["..."],"source_name":"...","source_url":"https://..."}]}',
        "title은 18자 이내의 한국어 레시피명으로 작성한다.",
        "subtitle은 28자 이내의 한국어 설명으로 작성한다.",
        "ingredients는 3~6개 한국어 재료명 배열로 작성한다.",
        "steps는 3~4개 한국어 조리 순서 배열로 작성한다.",
        "source_name/source_url은 알고 있는 경우에만 넣고, 모르면 빈 문자열로 둔다.",
        input.excludedIngredients?.length
          ? `제외 재료: ${expandAllergyTerms(input.excludedIngredients).join(", ")}. 제외 재료 또는 그 재료가 들어간 가공식품/대체 표현은 절대 추천하지 않는다.`
          : "",
      ].join(" ");

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemText }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `선택 재료: ${input.ingredients.join(", ")}`,
              input.excludedIngredients?.length
                ? `알레르기 제외 재료: ${expandAllergyTerms(input.excludedIngredients).join(", ")}`
                : "알레르기 제외 재료: 없음",
              `추천 개수: ${input.limit}`,
            ].join("\n"),
          },
        ],
      },
    ],
    max_output_tokens: 900,
    temperature: 0.2,
  });

  const outputText = response.output_text?.trim() ?? "";
  const usage = response.usage;
  return {
    recommendations: parseRecommendations(outputText, { requireSource }),
    usage: {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}

export async function generateRecipeRecommendationsWithOpenAI(
  input: GenerateRecipeInput
): Promise<AiRecipeGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  const strict = await generateOnce(client, model, input, true);
  const strictRecommendations = filterBlockedRecommendations(
    strict.recommendations,
    input.excludedIngredients ?? []
  );
  if (strictRecommendations.length >= 1) {
    return {
      recommendations: strictRecommendations.slice(0, input.limit),
      usage: strict.usage,
    };
  }

  const fallback = await generateOnce(client, model, input, false);
  const fallbackRecommendations = filterBlockedRecommendations(
    fallback.recommendations,
    input.excludedIngredients ?? []
  );
  if (fallbackRecommendations.length === 0) {
    throw new Error("AI가 레시피를 생성하지 못했습니다.");
  }

  return {
    recommendations: fallbackRecommendations.slice(0, input.limit),
    usage: {
      inputTokens: strict.usage.inputTokens + fallback.usage.inputTokens,
      outputTokens: strict.usage.outputTokens + fallback.usage.outputTokens,
      totalTokens: strict.usage.totalTokens + fallback.usage.totalTokens,
    },
  };
}
