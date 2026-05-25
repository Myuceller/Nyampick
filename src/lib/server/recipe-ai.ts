import OpenAI from "openai";
import { normalizeIngredientList } from "../ai/ingredient-normalize.ts";
import { normalizeRecipeRecommendation } from "../ai/recipe-normalize.ts";

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
  fallbackUsed: boolean;
}

export type RecipeRejectReason =
  | "title_too_long"
  | "subtitle_too_long"
  | "too_few_ingredients"
  | "too_few_steps"
  | "missing_source"
  | "awkward_pair"
  | "missing_allergy_caution"
  | "not_enough_input_match";

export interface RecipeQualityResult {
  ready: boolean;
  reasons: RecipeRejectReason[];
  recipe: AiRecipeRecommendation;
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

const awkwardIngredientPairs: [string, string][] = [
  ["바나나", "소고기"],
  ["바나나", "닭고기"],
  ["바나나", "양파"],
  ["새우", "우유"],
  ["새우", "치즈"],
];

const allergyIngredients = ["계란", "달걀", "두부", "우유", "치즈", "새우"];
const neutralSupplementalIngredients = ["쌀", "물", "육수"];

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

function includesTerm(text: string, term: string) {
  return text.replaceAll(/\s+/g, "").includes(term.replaceAll(/\s+/g, ""));
}

function recipeText(recipe: AiRecipeRecommendation) {
  return [
    recipe.title,
    recipe.subtitle,
    ...recipe.ingredients,
    ...recipe.steps,
  ].join(" ");
}

function hasAwkwardPair(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  return awkwardIngredientPairs.some(([left, right]) => {
    return includesTerm(text, left) && includesTerm(text, right);
  });
}

function inputHasAwkwardPair(input: GenerateRecipeInput) {
  const selected = input.ingredients.join(" ");
  return awkwardIngredientPairs.some(([left, right]) => {
    return includesTerm(selected, left) && includesTerm(selected, right);
  });
}

function hasAllergyIngredient(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  return allergyIngredients.some((ingredient) => includesTerm(text, ingredient));
}

function hasAllergyCaution(recipe: AiRecipeRecommendation) {
  const text = recipe.steps.join(" ");
  return ["알레르", "주의", "소량", "반응", "확인", "전문가", "의사"].some((term) =>
    includesTerm(text, term)
  );
}

function replaceAllTerms(text: string, terms: string[], replacement: string) {
  return terms.reduce((current, term) => current.replaceAll(term, replacement), text);
}

function getAwkwardTermsToRemove(recipe: AiRecipeRecommendation) {
  const text = recipeText(recipe);
  const terms = new Set<string>();
  for (const [left, right] of awkwardIngredientPairs) {
    if (!includesTerm(text, left) || !includesTerm(text, right)) continue;
    if (left === "바나나") {
      terms.add(left);
    } else if (right === "우유" || right === "치즈") {
      terms.add(right);
    } else {
      terms.add(right);
    }
  }
  return [...terms];
}

function normalizeRecipeQuality(recipe: AiRecipeRecommendation): AiRecipeRecommendation {
  const recipeBase = normalizeRecipeRecommendation(recipe);
  const awkwardTerms = getAwkwardTermsToRemove(recipeBase);
  const replacement = "물";
  const ingredients = recipeBase.ingredients
    .filter((ingredient) => !awkwardTerms.some((term) => includesTerm(ingredient, term)))
    .map((ingredient) => replaceAllTerms(ingredient, awkwardTerms, replacement))
    .filter((ingredient, index, items) => ingredient.trim().length > 0 && items.indexOf(ingredient) === index);

  for (const ingredient of neutralSupplementalIngredients) {
    if (ingredients.length >= 3) break;
    if (!ingredients.includes(ingredient)) ingredients.push(ingredient);
  }

  const normalized: AiRecipeRecommendation = {
    ...recipeBase,
    title: replaceAllTerms(recipeBase.title, awkwardTerms, "").replaceAll(/\s+/g, " ").trim(),
    subtitle: replaceAllTerms(recipeBase.subtitle, awkwardTerms, "").replaceAll(/\s+/g, " ").trim(),
    ingredients,
    steps: recipeBase.steps.map((step) => replaceAllTerms(step, awkwardTerms, replacement)),
  };

  if (hasAllergyIngredient(normalized) && !hasAllergyCaution(normalized)) {
    normalized.steps = [
      ...normalized.steps,
      "알레르기 반응을 소량부터 확인한다.",
    ].slice(0, 5);
  }

  return normalized;
}

function titleLength(value: string) {
  return [...value].length;
}

function countInputIngredients(recipe: AiRecipeRecommendation, input: GenerateRecipeInput) {
  const text = recipeText(recipe);
  return input.ingredients.filter((ingredient) => includesTerm(text, ingredient)).length;
}

export function evaluateRecipeQuality(
  recipe: AiRecipeRecommendation,
  input: GenerateRecipeInput
): RecipeQualityResult {
  const normalizedRecipe = normalizeRecipeRecommendation(recipe);
  const normalizedInput = {
    ...input,
    ingredients: normalizeIngredientList(input.ingredients),
  };
  const reasons: RecipeRejectReason[] = [];

  if (titleLength(normalizedRecipe.title) > 18) reasons.push("title_too_long");
  if (titleLength(normalizedRecipe.subtitle) > 28) reasons.push("subtitle_too_long");
  if (normalizedRecipe.ingredients.length < 3) reasons.push("too_few_ingredients");
  if (normalizedRecipe.steps.length < 3) reasons.push("too_few_steps");
  if (!normalizedRecipe.sourceName || !normalizedRecipe.sourceUrl) reasons.push("missing_source");
  if (hasAwkwardPair(normalizedRecipe)) reasons.push("awkward_pair");
  if (hasAllergyIngredient(normalizedRecipe) && !hasAllergyCaution(normalizedRecipe)) {
    reasons.push("missing_allergy_caution");
  }
  const minimumInputMatches = inputHasAwkwardPair(normalizedInput)
    ? 1
    : Math.min(2, normalizedInput.ingredients.length);
  if (countInputIngredients(normalizedRecipe, normalizedInput) < minimumInputMatches) {
    reasons.push("not_enough_input_match");
  }

  return {
    ready: reasons.length === 0,
    reasons,
    recipe: normalizedRecipe,
  };
}

export function isProductionReadyRecipe(recipe: AiRecipeRecommendation, input: GenerateRecipeInput) {
  return evaluateRecipeQuality(recipe, input).ready;
}

export function selectProductionReadyRecommendations(
  recommendations: AiRecipeRecommendation[],
  input: GenerateRecipeInput
) {
  const ready = recommendations
    .map(normalizeRecipeRecommendation)
    .filter((recipe) => evaluateRecipeQuality(recipe, input).ready);
  return ready.slice(0, input.limit);
}

function hasEnoughReadyRecommendations(
  recommendations: AiRecipeRecommendation[],
  input: GenerateRecipeInput
) {
  return recommendations.filter((recipe) => evaluateRecipeQuality(recipe, input).ready).length >= input.limit;
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

      return normalizeRecipeQuality({
        title,
        subtitle,
        taste,
        ingredients: ingredients.length >= 3 ? ingredients : [...ingredients, "쌀", "물"].slice(0, 3),
        steps,
        sourceName: hasValidSource ? sourceName : undefined,
        sourceUrl: hasValidSource ? sourceUrl : undefined,
      });
    })
    .filter(
      (item) =>
        item.title.length > 0 &&
        item.subtitle.length > 0 &&
        item.ingredients.length >= 3 &&
        item.steps.length > 0 &&
        (!requireSource || Boolean(item.sourceName && item.sourceUrl))
    );
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
        "서로 충돌하는 재료 조합은 같은 레시피에 넣지 않는다.",
        "금지 조합: 바나나+소고기, 바나나+닭고기, 바나나+양파, 새우+우유, 새우+치즈.",
        "선택 재료 안에 금지 조합이 있으면 한 레시피에 모두 쓰지 말고, 안전한 재료끼리 나누어 추천한다.",
        "입력 재료를 모두 한 레시피에 넣는 것보다 유아식 안전성과 자연스러운 조합을 우선한다.",
        "계란/달걀/두부/우유/치즈/새우가 들어가면 steps에 '알레르기 반응 확인' 또는 '소량부터 확인' 문구를 넣는다.",
        '반환 형식: {"recipes":[{"title":"...","subtitle":"...","taste":"좋아해요|보통이에요|싫어해요","ingredients":["..."],"steps":["..."],"source_name":"...","source_url":"https://..."}]}',
        "title은 18자 이내의 한국어 레시피명으로 작성한다.",
        "subtitle은 28자 이내의 한국어 설명으로 작성한다.",
        "ingredients는 반드시 3~6개 한국어 재료명 배열로 작성하고, 3개 미만이면 쌀/물/육수 같은 보조 재료를 추가한다.",
        "steps는 3~4개 한국어 조리 순서 배열로 작성한다.",
        "source_name은 출처명, source_url은 실제 접속 가능한 링크를 넣는다.",
        "source_name/source_url을 채울 수 없으면 해당 레시피는 제외한다.",
        "입력된 재료를 최대한 활용하고, 이유식/유아식 톤을 유지한다.",
      ].join(" ")
    : [
        "너는 영유아 식단 레시피 추천 전문가다.",
        "반드시 JSON만 출력하고 설명 문장은 출력하지 않는다.",
        "자유로운 기괴 조합은 금지하고, 한국에서 일반적으로 먹는 유아식 조합만 사용한다.",
        "서로 충돌하는 재료 조합은 같은 레시피에 넣지 않는다.",
        "금지 조합: 바나나+소고기, 바나나+닭고기, 바나나+양파, 새우+우유, 새우+치즈.",
        "선택 재료 안에 금지 조합이 있으면 한 레시피에 모두 쓰지 말고, 안전한 재료끼리 나누어 추천한다.",
        "입력 재료를 모두 한 레시피에 넣는 것보다 유아식 안전성과 자연스러운 조합을 우선한다.",
        "계란/달걀/두부/우유/치즈/새우가 들어가면 steps에 '알레르기 반응 확인' 또는 '소량부터 확인' 문구를 넣는다.",
        "입력 재료로 만들기 어려우면 일부만 사용해도 된다.",
        '반환 형식: {"recipes":[{"title":"...","subtitle":"...","taste":"좋아해요|보통이에요|싫어해요","ingredients":["..."],"steps":["..."],"source_name":"...","source_url":"https://..."}]}',
        "title은 18자 이내의 한국어 레시피명으로 작성한다.",
        "subtitle은 28자 이내의 한국어 설명으로 작성한다.",
        "ingredients는 반드시 3~6개 한국어 재료명 배열로 작성하고, 3개 미만이면 쌀/물/육수 같은 보조 재료를 추가한다.",
        "steps는 3~4개 한국어 조리 순서 배열로 작성한다.",
        "source_name/source_url은 알고 있는 경우에만 넣고, 모르면 빈 문자열로 둔다.",
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
            text: `선택 재료: ${input.ingredients.join(", ")}\n추천 개수: ${input.limit}`,
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
  const normalizedInput: GenerateRecipeInput = {
    ...input,
    ingredients: normalizeIngredientList(input.ingredients, { limit: 20 }),
  };
  if (normalizedInput.ingredients.length === 0) {
    throw new Error("추천에 사용할 재료가 없습니다.");
  }

  const strict = await generateOnce(client, model, normalizedInput, true);
  if (hasEnoughReadyRecommendations(strict.recommendations, normalizedInput)) {
    return {
      recommendations: selectProductionReadyRecommendations(strict.recommendations, normalizedInput),
      usage: strict.usage,
      fallbackUsed: false,
    };
  }

  const fallback = await generateOnce(client, model, normalizedInput, false);
  const selected = selectProductionReadyRecommendations(
    [...strict.recommendations, ...fallback.recommendations],
    normalizedInput
  );
  if (selected.length < input.limit) {
    throw new Error("AI가 레시피를 생성하지 못했습니다.");
  }

  return {
    recommendations: selected,
    usage: {
      inputTokens: strict.usage.inputTokens + fallback.usage.inputTokens,
      outputTokens: strict.usage.outputTokens + fallback.usage.outputTokens,
      totalTokens: strict.usage.totalTokens + fallback.usage.totalTokens,
    },
    fallbackUsed: true,
  };
}
