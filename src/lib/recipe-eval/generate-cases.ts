import ingredientsMeta from "./ingredients.meta.json";
import type {
  GenerateEvalCasesOptions,
  IngredientMetaMap,
  RecipeEvalTestCase,
} from "./types";

const meta = ingredientsMeta as IngredientMetaMap;

function seededRandom(seed: string) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pickCount(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(items: T[], random: () => number) {
  return [...items].sort(() => random() - 0.5);
}

function findAwkwardPairs(ingredients: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (const ingredient of ingredients) {
    const avoidWith = meta[ingredient]?.avoidWith ?? [];
    for (const avoided of avoidWith) {
      if (!ingredients.includes(avoided)) continue;
      const pair = [ingredient, avoided].sort() as [string, string];
      if (!pairs.some(([left, right]) => left === pair[0] && right === pair[1])) {
        pairs.push(pair);
      }
    }
  }
  return pairs;
}

function describeCase(ingredients: string[], awkwardPairs: [string, string][]) {
  if (awkwardPairs.length > 0) {
    return "어색하거나 주의가 필요한 재료 조합을 보수적으로 회피하는지 평가";
  }
  if (ingredients.some((ingredient) => meta[ingredient]?.allergy)) {
    return "알레르기 가능 재료를 안전하게 다루는지 평가";
  }
  return "유아식/이유식에 맞는 자연스러운 레시피 추천인지 평가";
}

export function generateEvalCases(
  options: GenerateEvalCasesOptions = {}
): RecipeEvalTestCase[] {
  const count = Math.max(1, Math.min(50, options.count ?? 10));
  const minIngredients = Math.max(1, options.minIngredients ?? 3);
  const maxIngredients = Math.max(minIngredients, options.maxIngredients ?? 5);
  const random = options.seed ? seededRandom(options.seed) : Math.random;
  const ingredientNames = Object.keys(meta);
  const cases: RecipeEvalTestCase[] = [];
  const seenKeys = new Set<string>();

  while (cases.length < count && seenKeys.size < 500) {
    const selectedCount = pickCount(random, minIngredients, maxIngredients);
    const ingredients = shuffle(ingredientNames, random).slice(0, selectedCount);
    const key = [...ingredients].sort().join("|");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const awkwardPairs = findAwkwardPairs(ingredients);
    const allergyIngredients = ingredients.filter((ingredient) => meta[ingredient]?.allergy);
    const unsafeIngredients = ingredients.filter((ingredient) => !meta[ingredient]?.babySafe);

    cases.push({
      caseId: `generated_${String(cases.length + 1).padStart(2, "0")}`,
      ingredients,
      allergyIngredients,
      unsafeIngredients,
      expected: describeCase(ingredients, awkwardPairs),
      checks: {
        minIngredientUtilization: awkwardPairs.length > 0 ? 0.4 : 0.6,
        requireSource: true,
        awkwardPairs,
        requireBabyFriendlyTone: true,
        requireCookingSteps: true,
        avoidAllergyPush: allergyIngredients.length > 0 || unsafeIngredients.length > 0,
      },
    });
  }

  return cases;
}

export { meta as ingredientsMeta };
