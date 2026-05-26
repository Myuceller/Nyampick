import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeIngredientList } from "../src/lib/ai/ingredient-normalize.ts";
import { evaluateRecipeQuality } from "../src/lib/server/recipe-ai.ts";

const root = process.cwd();
const casesPath = path.join(root, "docs", "ai-recipe-eval-cases.json");
const historyPath = path.join(root, "docs", "ai-recipe-quality-history.json");
const reportPath = path.join(root, "docs", "ai-recipe-quality-report.md");

const validTastes = new Set(["좋아해요", "보통이에요", "싫어해요"]);
const knownRejectReasons = [
  "title_too_long",
  "subtitle_too_long",
  "too_few_ingredients",
  "too_few_steps",
  "missing_source",
  "awkward_pair",
  "missing_allergy_caution",
  "not_enough_input_match",
];

function formatRate(value) {
  if (typeof value !== "number") return "TBD";
  return `${Math.round(value * 100)}%`;
}

function average(values) {
  const nums = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
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

function containsIngredient(text, ingredient) {
  return text.replaceAll(/\s+/g, "").includes(String(ingredient).replaceAll(/\s+/g, ""));
}

function includesAny(text, terms) {
  const normalized = text.replaceAll(/\s+/g, "");
  return terms.some((term) => normalized.includes(String(term).replaceAll(/\s+/g, "")));
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
    validTastes.has(recipe?.taste) &&
    ingredients.filter((value) => typeof value === "string" && value.trim().length > 0).length >= 3 &&
    steps.filter((value) => typeof value === "string" && value.trim().length > 0).length >= 3 &&
    (!requireSource || isValidHttpUrl(sourceUrl))
  );
}

function normalizeHistoryRecipe(recipe) {
  const sourceName = recipe?.sourceName ?? recipe?.source_name;
  const sourceUrl = recipe?.sourceUrl ?? recipe?.source_url;
  return {
    title: typeof recipe?.title === "string" ? recipe.title : "",
    subtitle: typeof recipe?.subtitle === "string" ? recipe.subtitle : "",
    taste: validTastes.has(recipe?.taste) ? recipe.taste : "보통이에요",
    ingredients: Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.filter((value) => typeof value === "string")
      : [],
    steps: Array.isArray(recipe?.steps)
      ? recipe.steps.filter((value) => typeof value === "string")
      : [],
    sourceName: typeof sourceName === "string" ? sourceName : undefined,
    sourceUrl: typeof sourceUrl === "string" ? sourceUrl : undefined,
  };
}

function countRejectReasons(recommendations, evalCase, limit) {
  const counts = Object.fromEntries(knownRejectReasons.map((reason) => [reason, 0]));
  let readyCount = 0;
  let rejectedCount = 0;

  for (const recipe of recommendations) {
    const result = evaluateRecipeQuality(normalizeHistoryRecipe(recipe), {
      ingredients: evalCase?.ingredients ?? [],
      limit,
    });
    if (result.ready) {
      readyCount += 1;
      continue;
    }
    rejectedCount += 1;
    for (const reason of result.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }

  return { counts, readyCount, rejectedCount };
}

function formatTopReasons(counts, limit = 3) {
  const reasons = Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit)
    .map(([reason, count]) => `${reason} ${count}`);
  return reasons.length > 0 ? reasons.join(", ") : "-";
}

function evaluateEntry(entry, evalCase) {
  const recommendations = Array.isArray(entry.recommendations) ? entry.recommendations : [];
  const checks = evalCase?.checks ?? {};
  const requireSource = checks.requireSource !== false;
  const limit = Number(entry.limit ?? evalCase?.limit ?? recommendations.length ?? 0);
  const rejectReasons = countRejectReasons(recommendations, evalCase, limit);
  const validCount = recommendations.filter((recipe) => isValidRecipe(recipe, requireSource)).length;
  const validRecommendationRate = limit > 0 ? Math.min(1, validCount / limit) : null;

  const joinedText = recommendations.map(textOfRecipe).join(" ");
  const normalizedCaseIngredients = normalizeIngredientList(evalCase?.ingredients ?? []);
  const usedIngredients = normalizedCaseIngredients.filter((ingredient) =>
    containsIngredient(joinedText, ingredient),
  );
  const ingredientUtilization =
    normalizedCaseIngredients.length > 0 ? usedIngredients.length / normalizedCaseIngredients.length : null;

  const sourceUrls = recommendations
    .map((recipe) => recipe?.source_url ?? recipe?.sourceUrl)
    .filter((value) => typeof value === "string" && value.trim().length > 0);
  const sourceValidityRate =
    recommendations.length > 0 ? sourceUrls.filter(isValidHttpUrl).length / recommendations.length : null;

  const awkwardPairs = Array.isArray(checks.awkwardPairs) ? checks.awkwardPairs : [];
  const forbiddenClaims = Array.isArray(checks.forbiddenClaims) ? checks.forbiddenClaims : [];
  const requiredTerms = Array.isArray(checks.requiredTerms) ? checks.requiredTerms : [];
  const cautionTerms = ["알레르", "주의", "소량", "확인", "전문", "의사", "반응"];
  const awkwardPairViolations = awkwardPairs.reduce((count, pair) => {
    const [left, right] = pair;
    return (
      count +
      recommendations.filter((recipe) => {
        const text = textOfRecipe(recipe);
        return containsIngredient(text, left) && containsIngredient(text, right);
      }).length
    );
  }, 0);
  const forbiddenClaimViolations = forbiddenClaims.reduce((count, term) => {
    return count + (containsIngredient(joinedText, term) ? 1 : 0);
  }, 0);
  const requiredTermRate =
    requiredTerms.length > 0
      ? requiredTerms.filter((term) => containsIngredient(joinedText, term)).length / requiredTerms.length
      : 1;
  const cautionTonePass = checks.requireCautionTone ? includesAny(joinedText, cautionTerms) : true;
  const safetyRate =
    awkwardPairViolations === 0 && forbiddenClaimViolations === 0 && cautionTonePass ? 1 : 0;

  const qualityScore =
    (validRecommendationRate ?? 0) * 0.35 +
    (ingredientUtilization ?? 0) * 0.2 +
    (sourceValidityRate ?? 0) * 0.2 +
    safetyRate * 0.15 +
    requiredTermRate * 0.1;

  return {
    ...entry,
    expected: evalCase?.expected ?? "",
    validRecommendationRate,
    ingredientUtilization,
    sourceValidityRate,
    awkwardPairViolations,
    forbiddenClaimViolations,
    cautionTonePass,
    requiredTermRate,
    rejectReasonCounts: rejectReasons.counts,
    readyCount: rejectReasons.readyCount,
    rejectedCount: rejectReasons.rejectedCount,
    qualityScore,
    pass:
      (validRecommendationRate ?? 0) >= 0.9 &&
      (ingredientUtilization ?? 0) >= (checks.minIngredientUtilization ?? 0.6) &&
      (sourceValidityRate ?? 0) >= 0.9 &&
      awkwardPairViolations === 0 &&
      forbiddenClaimViolations === 0 &&
      cautionTonePass &&
      requiredTermRate >= 1,
  };
}

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

function summarize(rows) {
  const total = rows.length;
  const passCount = rows.filter((row) => row.pass).length;
  return {
    total,
    passRate: total > 0 ? passCount / total : null,
    qualityScore: average(rows.map((row) => row.qualityScore)),
    validRecommendationRate: average(rows.map((row) => row.validRecommendationRate)),
    ingredientUtilization: average(rows.map((row) => row.ingredientUtilization)),
    sourceValidityRate: average(rows.map((row) => row.sourceValidityRate)),
    awkwardPairViolations: rows.reduce((sum, row) => sum + (row.awkwardPairViolations ?? 0), 0),
    forbiddenClaimViolations: rows.reduce((sum, row) => sum + (row.forbiddenClaimViolations ?? 0), 0),
    readyCount: rows.reduce((sum, row) => sum + (row.readyCount ?? 0), 0),
    rejectedCount: rows.reduce((sum, row) => sum + (row.rejectedCount ?? 0), 0),
  };
}

function summarizeRejectReasons(rows) {
  const counts = Object.fromEntries(knownRejectReasons.map((reason) => [reason, 0]));
  for (const row of rows) {
    for (const reason of knownRejectReasons) {
      counts[reason] += row.rejectReasonCounts?.[reason] ?? 0;
    }
  }
  return counts;
}

function latestRowsByCase(rows) {
  const latest = new Map();
  for (const row of rows) latest.set(row.caseId ?? "unknown", row);
  return [...latest.values()];
}

function buildMarkdown(cases, evaluatedRows) {
  const generatedAt = new Date().toISOString();
  const latestRows = latestRowsByCase(evaluatedRows);
  const measuredCaseIds = new Set(latestRows.map((row) => row.caseId));
  const pendingCases = cases.filter((item) => !measuredCaseIds.has(item.caseId));
  const summary = summarize(latestRows);
  const rejectReasonSummary = summarizeRejectReasons(latestRows);

  const caseRows = cases
    .map(
      (item) =>
        `| ${item.caseId} | ${JSON.stringify(item.ingredients)} | ${item.expected} | ${Math.round((item.checks?.minIngredientUtilization ?? 0.6) * 100)}% | ${item.checks?.requireSource === false ? "no" : "yes"} |`,
    )
    .join("\n");

  const resultRows =
    evaluatedRows.length === 0
      ? "| - | - | - | - | - | - | - | - | - |"
      : evaluatedRows
          .slice(-20)
          .reverse()
          .map(
            (row) =>
              `| ${row.createdAt ?? row.date ?? "TBD"} | ${row.caseId ?? "-"} | ${formatRate(row.qualityScore)} | ${formatRate(row.validRecommendationRate)} | ${formatRate(row.ingredientUtilization)} | ${formatRate(row.sourceValidityRate)} | ${row.awkwardPairViolations ?? 0} | ${row.forbiddenClaimViolations ?? 0} | ${formatTopReasons(row.rejectReasonCounts)} | ${row.pass ? "pass" : "fail"} |`,
          )
          .join("\n");

  const pendingRows =
    pendingCases.length === 0
      ? "| - | - | - |"
      : pendingCases
          .map((item) => `| ${item.caseId} | ${JSON.stringify(item.ingredients)} | ${item.expected} |`)
          .join("\n");

  return `# AI Recipe Quality Report

Generated at: ${generatedAt}

Sources:

- \`docs/ai-recipe-eval-cases.json\`
- \`docs/ai-recipe-quality-history.json\`

Summary is calculated from the latest measured run for each case.

## Summary

| Total cases | Measured cases | Pending cases | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward violations | Forbidden claims |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ${cases.length} | ${summary.total} | ${pendingCases.length} | ${formatRate(summary.passRate)} | ${formatRate(summary.qualityScore)} | ${formatRate(summary.validRecommendationRate)} | ${formatRate(summary.ingredientUtilization)} | ${formatRate(summary.sourceValidityRate)} | ${summary.awkwardPairViolations} | ${summary.forbiddenClaimViolations} |

## Quality Gate Reason Summary

Calculated with \`evaluateRecipeQuality\` from the latest measured run for each case.

| Ready recipes | Rejected recipes | Top reject reasons |
| ---: | ---: | --- |
| ${summary.readyCount} | ${summary.rejectedCount} | ${formatTopReasons(rejectReasonSummary, 8)} |

| Reason | Count |
| --- | ---: |
${knownRejectReasons.map((reason) => `| ${reason} | ${rejectReasonSummary[reason] ?? 0} |`).join("\n")}

## Evaluation Cases

| Case | Ingredients | Expected | Min ingredient use | Require source |
| --- | --- | --- | ---: | --- |
${caseRows}

## Pending Measurements

These cases are defined but do not have a recorded AI run yet.

| Case | Ingredients | Expected |
| --- | --- | --- |
${pendingRows}

## Latest Results

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward | Forbidden | Top reject reasons | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${resultRows}
`;
}

const cases = await readJsonArray(casesPath);
const caseMap = new Map(cases.map((item) => [item.caseId, item]));
const history = await readJsonArray(historyPath);
const evaluatedRows = history.map((entry) => evaluateEntry(entry, caseMap.get(entry.caseId)));

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, buildMarkdown(cases, evaluatedRows));
process.stdout.write(`Wrote ${path.relative(root, reportPath)}\n`);
