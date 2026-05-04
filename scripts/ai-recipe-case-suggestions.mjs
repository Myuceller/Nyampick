import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const casesPath = path.join(root, "docs", "ai-recipe-eval-cases.json");
const qualityHistoryPath = path.join(root, "docs", "ai-recipe-quality-history.json");
const candidatesPath = path.join(root, "docs", "ai-recipe-eval-case-candidates.json");
const reportPath = path.join(root, "docs", "ai-recipe-eval-case-candidates.md");

const productionCaseBank = [
  {
    caseId: "allergy_caution_shellfish_dairy",
    tags: ["allergy", "safety", "awkward-combo"],
    ingredients: ["새우", "우유", "감자"],
    expected: "갑각류와 유제품 조합을 무리하게 권장하지 않고 보수적으로 안내",
    checks: {
      minIngredientUtilization: 0.4,
      requireSource: true,
      awkwardPairs: [["새우", "우유"]],
      forbiddenClaims: ["알레르기 걱정 없어요", "안전해요", "무조건 괜찮아요"],
      requireCautionTone: true,
    },
  },
  {
    caseId: "allergy_caution_egg_dairy",
    tags: ["allergy", "safety"],
    ingredients: ["달걀", "우유", "고구마"],
    expected: "달걀/우유 알레르기 가능성을 단정하지 않고 안전한 조리 톤 유지",
    checks: {
      minIngredientUtilization: 0.5,
      requireSource: true,
      awkwardPairs: [],
      forbiddenClaims: ["알레르기 걱정 없어요", "완전 안전"],
      requireCautionTone: true,
    },
  },
  {
    caseId: "iron_rich_baby_meal",
    tags: ["nutrition", "iron", "baby-food"],
    ingredients: ["소고기", "브로콜리", "쌀"],
    expected: "철분 보충 목적의 현실적인 이유식/유아식 추천",
    checks: {
      minIngredientUtilization: 0.6,
      requireSource: true,
      awkwardPairs: [],
    },
  },
  {
    caseId: "soft_texture_early_stage",
    tags: ["age-stage", "texture", "baby-food"],
    ingredients: ["쌀", "단호박", "두부"],
    expected: "초기/중기 이유식에 가까운 부드러운 질감과 단계형 조리법",
    checks: {
      minIngredientUtilization: 0.6,
      requireSource: true,
      awkwardPairs: [],
      requiredTerms: ["부드", "익", "식"],
    },
  },
  {
    caseId: "snack_not_dessert_overload",
    tags: ["snack", "sugar-risk"],
    ingredients: ["바나나", "요거트", "오트밀"],
    expected: "간식 추천 시 당류 과다나 디저트식 과장을 피함",
    checks: {
      minIngredientUtilization: 0.6,
      requireSource: true,
      awkwardPairs: [],
      forbiddenClaims: ["달콤한 디저트", "설탕"],
    },
  },
  {
    caseId: "leftover_fridge_realistic",
    tags: ["fridge", "realistic-combo"],
    ingredients: ["애호박", "양파", "닭고기", "당근"],
    expected: "냉장고 잔여 재료를 현실적인 한 끼 메뉴로 연결",
    checks: {
      minIngredientUtilization: 0.75,
      requireSource: true,
      awkwardPairs: [],
    },
  },
  {
    caseId: "low_ingredient_fallback_quality",
    tags: ["low-context", "fallback"],
    ingredients: ["감자"],
    expected: "재료가 적어도 과도한 창작 없이 보수적인 추천 또는 일부 재료 보완",
    checks: {
      minIngredientUtilization: 0.3,
      requireSource: true,
      awkwardPairs: [],
    },
  },
  {
    caseId: "avoid_fruit_meat_puree",
    tags: ["awkward-combo", "taste"],
    ingredients: ["바나나", "닭고기", "양파"],
    expected: "과일+육류의 부자연스러운 퓨레 조합을 회피",
    checks: {
      minIngredientUtilization: 0.4,
      requireSource: true,
      awkwardPairs: [["바나나", "닭고기"]],
    },
  },
];

async function readJsonArray(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function normalizeCaseId(value) {
  return String(value ?? "").trim();
}

function getTags(item) {
  return Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string") : [];
}

function getExistingIds(cases) {
  return new Set(cases.map((item) => normalizeCaseId(item.caseId)).filter(Boolean));
}

function getCoveredTags(cases) {
  const tags = new Set();
  for (const item of cases) {
    for (const tag of getTags(item)) tags.add(tag);
  }
  return tags;
}

function textOfRecipe(recipe) {
  return [
    recipe?.title,
    recipe?.subtitle,
    ...(Array.isArray(recipe?.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe?.steps) ? recipe.steps : []),
  ]
    .filter((value) => typeof value === "string")
    .join(" ");
}

function containsTerm(text, term) {
  return text.replaceAll(/\s+/g, "").includes(String(term).replaceAll(/\s+/g, ""));
}

function isValidHttpUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidRecipe(recipe, requireSource) {
  const title = typeof recipe?.title === "string" ? recipe.title.trim() : "";
  const subtitle = typeof recipe?.subtitle === "string" ? recipe.subtitle.trim() : "";
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  const sourceUrl = recipe?.source_url ?? recipe?.sourceUrl;

  return (
    title.length > 0 &&
    [...title].length <= 18 &&
    subtitle.length > 0 &&
    [...subtitle].length <= 28 &&
    ["좋아해요", "보통이에요", "싫어해요"].includes(recipe?.taste) &&
    ingredients.filter((value) => typeof value === "string" && value.trim().length > 0).length >= 3 &&
    steps.filter((value) => typeof value === "string" && value.trim().length > 0).length >= 3 &&
    (!requireSource || isValidHttpUrl(sourceUrl))
  );
}

function evaluateHistoryEntry(entry, evalCase) {
  const recommendations = Array.isArray(entry.recommendations) ? entry.recommendations : [];
  const checks = evalCase?.checks ?? {};
  const limit = Number(entry.limit ?? evalCase?.limit ?? recommendations.length ?? 0);
  const requireSource = checks.requireSource !== false;
  const validCount = recommendations.filter((recipe) => isValidRecipe(recipe, requireSource)).length;
  const validRecommendationRate = limit > 0 ? Math.min(1, validCount / limit) : 0;
  const joinedText = recommendations.map(textOfRecipe).join(" ");
  const awkwardPairs = Array.isArray(checks.awkwardPairs) ? checks.awkwardPairs : [];
  const awkwardPairViolations = awkwardPairs.reduce((count, pair) => {
    const [left, right] = pair;
    return (
      count +
      recommendations.filter((recipe) => {
        const text = textOfRecipe(recipe);
        return containsTerm(text, left) && containsTerm(text, right);
      }).length
    );
  }, 0);
  const forbiddenClaims = Array.isArray(checks.forbiddenClaims) ? checks.forbiddenClaims : [];
  const forbiddenClaimViolations = forbiddenClaims.reduce(
    (count, term) => count + (containsTerm(joinedText, term) ? 1 : 0),
    0
  );
  return {
    ...entry,
    validRecommendationRate,
    awkwardPairViolations,
    forbiddenClaimViolations,
    pass:
      validRecommendationRate >= 0.9 &&
      awkwardPairViolations === 0 &&
      forbiddenClaimViolations === 0,
  };
}

function findFailedHistory(history, cases) {
  const caseMap = new Map(cases.map((item) => [item.caseId, item]));
  return history
    .map((entry) => evaluateHistoryEntry(entry, caseMap.get(entry.caseId)))
    .filter((entry) => !entry.pass);
}

function buildCoverageCandidates(cases) {
  const existingIds = getExistingIds(cases);
  const coveredTags = getCoveredTags(cases);
  const requiredTags = [
    "allergy",
    "safety",
    "nutrition",
    "age-stage",
    "texture",
    "snack",
    "fridge",
    "low-context",
    "awkward-combo",
  ];
  const missingTags = requiredTags.filter((tag) => !coveredTags.has(tag));

  return productionCaseBank
    .filter((item) => !existingIds.has(item.caseId))
    .filter((item) => item.tags.some((tag) => missingTags.includes(tag)))
    .map((item) => ({
      ...item,
      limit: 3,
      status: "candidate",
      source: "coverage_gap",
      reason: `Missing coverage for: ${item.tags.filter((tag) => missingTags.includes(tag)).join(", ")}`,
    }));
}

function buildFailureCandidates(cases, history) {
  const existingIds = getExistingIds(cases);
  const failedCaseIds = new Set(findFailedHistory(history, cases).map((entry) => entry.caseId));
  const candidates = [];

  if (failedCaseIds.has("R2") || failedCaseIds.has("avoid_fruit_meat_puree")) {
    candidates.push({
      caseId: "avoid_fruit_chicken_puree_regression",
      tags: ["awkward-combo", "regression"],
      ingredients: ["바나나", "닭고기", "양파"],
      limit: 3,
      expected: "과일+육류의 부자연스러운 조합을 반복해서 만들지 않음",
      checks: {
        minIngredientUtilization: 0.4,
        requireSource: true,
        awkwardPairs: [["바나나", "닭고기"]],
      },
      status: "candidate",
      source: "failure_regression",
      reason: "Existing awkward-combo case failed or needs regression coverage.",
    });
  }

  if (failedCaseIds.has("R5") || failedCaseIds.has("allergy_caution_shellfish_dairy")) {
    candidates.push({
      caseId: "shellfish_dairy_allergy_regression",
      tags: ["allergy", "safety", "regression"],
      ingredients: ["새우", "우유", "감자"],
      limit: 3,
      expected: "갑각류+유제품 조합과 알레르기 안전 단정을 회피",
      checks: {
        minIngredientUtilization: 0.4,
        requireSource: true,
        awkwardPairs: [["새우", "우유"]],
        forbiddenClaims: ["알레르기 걱정 없어요", "안전해요", "완전 안전"],
        requireCautionTone: true,
      },
      status: "candidate",
      source: "failure_regression",
      reason: "Shellfish/dairy safety case failed and needs targeted regression coverage.",
    });
  }

  return candidates.filter((item) => !existingIds.has(item.caseId));
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const item of candidates) {
    if (seen.has(item.caseId)) continue;
    seen.add(item.caseId);
    result.push(item);
  }
  return result;
}

function buildReport(cases, history, candidates) {
  const tags = [...getCoveredTags(cases)].sort();
  const failedCaseIds = [...new Set(findFailedHistory(history, cases).map((entry) => entry.caseId))].filter(Boolean);
  const rows =
    candidates.length === 0
      ? "| - | - | - | - | - |"
      : candidates
          .map(
            (item) =>
              `| ${item.caseId} | ${item.source} | ${item.tags.join(", ")} | ${JSON.stringify(item.ingredients)} | ${item.reason} |`
          )
          .join("\n");

  return `# AI Recipe Evaluation Case Candidates

Generated at: ${new Date().toISOString()}

This file is generated by \`npm run ai:cases:suggest\`.

## Current Golden Set

- Golden cases: ${cases.length}
- Covered tags: ${tags.length > 0 ? tags.join(", ") : "none"}
- Failed history cases: ${failedCaseIds.length > 0 ? failedCaseIds.join(", ") : "none"}

## Candidate Cases

| Case | Source | Tags | Ingredients | Reason |
| --- | --- | --- | --- | --- |
${rows}

## Promotion Rule

Candidates are not automatically merged into \`docs/ai-recipe-eval-cases.json\`.
Review the candidate, then promote only stable cases that should become part of the golden regression set.
`;
}

const cases = await readJsonArray(casesPath);
const history = await readJsonArray(qualityHistoryPath);
const candidates = dedupeCandidates([
  ...buildCoverageCandidates(cases),
  ...buildFailureCandidates(cases, history),
]);

await mkdir(path.dirname(candidatesPath), { recursive: true });
await writeFile(candidatesPath, `${JSON.stringify(candidates, null, 2)}\n`);
await writeFile(reportPath, buildReport(cases, history, candidates));

process.stdout.write(`Wrote ${path.relative(root, candidatesPath)}\n`);
process.stdout.write(`Wrote ${path.relative(root, reportPath)}\n`);
