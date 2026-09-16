import { z } from "zod";
import { normalizeRecipeQuality } from "./recipe-quality-gate.ts";
import type { AiRecipeRecommendation } from "./recipe-types.ts";

type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const generatedRecipeSchema = z
  .object({
    title: z.string(),
    subtitle: z.string(),
    taste: z.enum(["좋아해요", "보통이에요", "싫어해요"]),
    ingredients: z.array(z.string()),
    steps: z.array(z.string()),
  })
  .strict();

/**
 * Schema sent to the model. Source fields are intentionally absent because a
 * model-generated URL is not a verified citation and must not be shown as one.
 */
export const aiGeneratedRecipeResponseSchema = z
  .object({
    recipes: z.array(generatedRecipeSchema),
  })
  .strict();

const legacyAiRecipeResponseSchema = z.object({
  recipes: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string(),
      taste: z.enum(["좋아해요", "보통이에요", "싫어해요"]).catch("보통이에요"),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
      source_name: z.string().optional().default(""),
      source_url: z.string().optional().default(""),
    })
  ),
});

type LegacyRecipe = z.infer<typeof legacyAiRecipeResponseSchema>["recipes"][number];
type GeneratedRecipe = z.infer<typeof aiGeneratedRecipeResponseSchema>["recipes"][number];

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

export function parseRecommendations(
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

  const result = legacyAiRecipeResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI 응답 스키마가 올바르지 않습니다.");
  }

  return normalizeRecommendationItems(result.data.recipes, { requireSource });
}

function normalizeRecommendationItems(
  recipes: Array<LegacyRecipe | GeneratedRecipe>,
  options: { requireSource: boolean }
) {
  return recipes
    .map((item) => {
      const title = item.title.trim();
      const subtitle = item.subtitle.trim();
      const ingredients = item.ingredients
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .slice(0, 8);
      const steps = item.steps
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .slice(0, 5);
      const sourceName = "source_name" in item ? item.source_name.trim() : "";
      const sourceUrl = "source_url" in item ? item.source_url.trim() : "";
      const hasValidSource = sourceName.length > 0 && isValidHttpUrl(sourceUrl);

      return normalizeRecipeQuality({
        title,
        subtitle,
        taste: item.taste,
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
        (!options.requireSource || Boolean(item.sourceName && item.sourceUrl))
    );
}

export function parseGeneratedRecommendations(value: unknown): AiRecipeRecommendation[] {
  const result = aiGeneratedRecipeResponseSchema.safeParse(value);
  if (!result.success) {
    throw new Error("AI 응답 스키마가 올바르지 않습니다.");
  }

  return normalizeRecommendationItems(result.data.recipes, { requireSource: false });
}
