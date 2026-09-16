import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeIngredientList } from "../src/lib/ai/ingredient-normalize.ts";
import { evaluateRecipeQuality } from "../src/lib/ai/recipe-quality-gate.ts";

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

function formatOptionalRate(value) {
  return typeof value === "number" ? formatRate(value) : "N/A";
}

function formatSourceRate(value, requireSource = true) {
  return requireSource ? formatRate(value) : "N/A";
}

function average(values) {
  const nums = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function sum(values) {
  return values.reduce(
    (total, value) => total + (typeof value === "number" && Number.isFinite(value) ? value : 0),
    0,
  );
}

function percentile(values, probability) {
  const nums = values
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (nums.length === 0) return null;
  return nums[Math.max(0, Math.ceil(nums.length * probability) - 1)];
}

function formatMilliseconds(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}ms` : "N/A";
}

function formatCountRate(count, total) {
  return `${count} (${formatRate(total > 0 ? count / total : null)})`;
}

function escapeMarkdownCell(value) {
  return String(value ?? "-").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
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

function getRequiredAnyTermGroups(checks) {
  if (!Array.isArray(checks.requiredAnyTerms)) return [];
  return checks.requiredAnyTerms.filter(
    (group) => Array.isArray(group) && group.some((term) => typeof term === "string" && term.trim().length > 0),
  );
}

function getRequiredTermRate(text, checks) {
  const requiredTerms = Array.isArray(checks.requiredTerms) ? checks.requiredTerms : [];
  const requiredAnyTermGroups = getRequiredAnyTermGroups(checks);
  const requiredCount = requiredTerms.length + requiredAnyTermGroups.length;
  if (requiredCount === 0) return 1;

  const exactMatches = requiredTerms.filter((term) => containsIngredient(text, term)).length;
  const groupMatches = requiredAnyTermGroups.filter((group) => includesAny(text, group)).length;
  return (exactMatches + groupMatches) / requiredCount;
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

function countRejectReasons(recommendations, evalCase, limit, requireSource) {
  const counts = Object.fromEntries(knownRejectReasons.map((reason) => [reason, 0]));
  let readyCount = 0;
  let rejectedCount = 0;

  for (const recipe of recommendations) {
    const result = evaluateRecipeQuality(
      normalizeHistoryRecipe(recipe),
      {
        ingredients: evalCase?.ingredients ?? [],
        limit,
      },
      { requireSource }
    );
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

function getEvalGaps(row) {
  const gaps = [];
  if ((row.validRecommendationRate ?? 0) < 0.9) gaps.push("invalid_recommendation");
  if ((row.ingredientUtilization ?? 0) < (row.minIngredientUtilization ?? 0.6)) {
    gaps.push("low_ingredient_use");
  }
  if (row.requireSource && (row.sourceValidityRate ?? 0) < 0.9) {
    gaps.push("invalid_source");
  }
  if ((row.awkwardPairViolations ?? 0) > 0) gaps.push("awkward_pair");
  if ((row.forbiddenClaimViolations ?? 0) > 0) gaps.push("forbidden_claim");
  if (row.cautionTonePass === false) gaps.push("missing_caution_tone");
  if ((row.requiredTermRate ?? 1) < 1) gaps.push("missing_required_terms");
  return gaps;
}

function formatEvalGaps(row) {
  const gaps = getEvalGaps(row);
  return gaps.length > 0 ? gaps.join(", ") : "-";
}

export function evaluateEntry(entry, evalCase) {
  const recommendations = Array.isArray(entry.recommendations) ? entry.recommendations : [];
  const checks = evalCase?.checks ?? {};
  const requireSource = checks.requireSource === true;
  const limit = Number(entry.limit ?? evalCase?.limit ?? recommendations.length ?? 0);
  const rejectReasons = countRejectReasons(recommendations, evalCase, limit, requireSource);
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
    requireSource && recommendations.length > 0
      ? sourceUrls.filter(isValidHttpUrl).length / recommendations.length
      : null;

  const awkwardPairs = Array.isArray(checks.awkwardPairs) ? checks.awkwardPairs : [];
  const forbiddenClaims = Array.isArray(checks.forbiddenClaims) ? checks.forbiddenClaims : [];
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
  const requiredTermRate = getRequiredTermRate(joinedText, checks);
  const cautionTonePass = checks.requireCautionTone ? includesAny(joinedText, cautionTerms) : true;
  const safetyPass =
    awkwardPairViolations === 0 && forbiddenClaimViolations === 0 && cautionTonePass;
  // No output is an availability/validity failure, not evidence of safe content.
  // Keep the displayed safety dimension N/A while quality scoring still receives 0.
  const safetyRate = recommendations.length > 0 ? (safetyPass ? 1 : 0) : null;

  const qualityComponents = [
    { value: validRecommendationRate ?? 0, weight: 0.35 },
    { value: ingredientUtilization ?? 0, weight: 0.2 },
    { value: safetyRate ?? 0, weight: 0.15 },
    { value: requiredTermRate, weight: 0.1 },
  ];
  if (requireSource) {
    qualityComponents.push({ value: sourceValidityRate ?? 0, weight: 0.2 });
  }
  const totalQualityWeight = qualityComponents.reduce((sum, component) => sum + component.weight, 0);
  const qualityScore = recommendations.length === 0
    ? 0
    : qualityComponents.reduce(
        (sum, component) => sum + component.value * component.weight,
        0
      ) / totalQualityWeight;

  return {
    ...entry,
    expected: evalCase?.expected ?? "",
    requireSource,
    validRecommendationRate,
    ingredientUtilization,
    sourceValidityRate,
    awkwardPairViolations,
    forbiddenClaimViolations,
    cautionTonePass,
    safetyRate,
    requiredTermRate,
    minIngredientUtilization: checks.minIngredientUtilization ?? 0.6,
    rejectReasonCounts: rejectReasons.counts,
    readyCount: rejectReasons.readyCount,
    rejectedCount: rejectReasons.rejectedCount,
    qualityScore,
    pass:
      (validRecommendationRate ?? 0) >= 0.9 &&
      (ingredientUtilization ?? 0) >= (checks.minIngredientUtilization ?? 0.6) &&
      (!requireSource || (sourceValidityRate ?? 0) >= 0.9) &&
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

function summarizeEvalGaps(rows) {
  const counts = new Map();
  for (const row of rows) {
    for (const gap of getEvalGaps(row)) counts.set(gap, (counts.get(gap) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([, left], [, right]) => right - left);
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

export function getLatestModelComparison(evaluatedRows) {
  const groups = new Map();
  evaluatedRows.forEach((row, index) => {
    if (typeof row.runLabel !== "string" || !row.runLabel.trim() || !row.model) return;
    const current = groups.get(row.runLabel) ?? { runLabel: row.runLabel, rows: [], lastIndex: index };
    current.rows.push(row);
    current.lastIndex = index;
    groups.set(row.runLabel, current);
  });

  return [...groups.values()]
    .filter((group) => new Set(group.rows.map((row) => row.model)).size > 1)
    .sort((left, right) => right.lastIndex - left.lastIndex)[0] ?? null;
}

export function summarizeComparisonModel(rows) {
  const total = rows.length;
  const failureCount = rows.filter((row) => row.ok === false).length;
  const fallbackCount = rows.filter((row) => row.fallbackUsed === true).length;
  const latencies = rows.map((row) => row.latencyMs);
  return {
    total,
    passRate: total > 0 ? rows.filter((row) => row.pass).length / total : null,
    qualityScore: average(rows.map((row) => row.qualityScore)),
    validRecommendationRate: average(rows.map((row) => row.validRecommendationRate)),
    ingredientUtilization: average(rows.map((row) => row.ingredientUtilization)),
    safetyRate: average(rows.map((row) => row.safetyRate)),
    failureCount,
    fallbackCount,
    latencyAverageMs: average(latencies),
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    inputTokens: sum(rows.map((row) => row.inputTokens)),
    outputTokens: sum(rows.map((row) => row.outputTokens)),
    totalTokens: sum(rows.map((row) => row.totalTokens)),
  };
}

function formatPairedResult(row) {
  if (!row) return "missing";
  const status = row.ok === false ? "API fail" : row.pass ? "pass" : "fail";
  const fallback = row.fallbackUsed ? "; fallback" : "";
  return `${status}; Q ${formatRate(row.qualityScore)}; V ${formatRate(row.validRecommendationRate)}; I ${formatRate(row.ingredientUtilization)}; S ${formatOptionalRate(row.safetyRate)}; ${formatMilliseconds(row.latencyMs)}; ${row.totalTokens ?? 0} tok${fallback}`;
}

export function buildModelComparisonMarkdown(evaluatedRows) {
  const comparison = getLatestModelComparison(evaluatedRows);
  if (!comparison) return "";

  const models = [...new Set(comparison.rows.map((row) => row.model))].sort();
  const summaries = models.map((model) => ({
    model,
    summary: summarizeComparisonModel(comparison.rows.filter((row) => row.model === model)),
  }));
  const summaryRows = summaries
    .map(({ model, summary }) =>
      `| ${escapeMarkdownCell(model)} | ${summary.total} | ${formatRate(summary.passRate)} | ${formatRate(summary.qualityScore)} | ${formatRate(summary.validRecommendationRate)} | ${formatRate(summary.ingredientUtilization)} | ${formatOptionalRate(summary.safetyRate)} | ${formatCountRate(summary.failureCount, summary.total)} | ${formatCountRate(summary.fallbackCount, summary.total)} | ${formatMilliseconds(summary.latencyAverageMs)} | ${formatMilliseconds(summary.latencyP50Ms)} | ${formatMilliseconds(summary.latencyP95Ms)} | ${summary.inputTokens} | ${summary.outputTokens} | ${summary.totalTokens} |`
    )
    .join("\n");

  const paired = new Map();
  for (const row of comparison.rows) {
    const repeat = Number.isInteger(row.repeat) ? row.repeat : 1;
    const key = `${row.caseId ?? "unknown"}\u0000${repeat}`;
    const group = paired.get(key) ?? { caseId: row.caseId ?? "unknown", repeat, rows: new Map() };
    group.rows.set(row.model, row);
    paired.set(key, group);
  }
  const completePairs = [...paired.values()].filter((group) =>
    models.every((model) => group.rows.has(model)),
  );
  const pairedHeader = `| Case | Repeat | ${models.map(escapeMarkdownCell).join(" | ")} |`;
  const pairedDivider = `| --- | ---: | ${models.map(() => "---").join(" | ")} |`;
  const pairedRows = completePairs.length > 0
    ? completePairs
        .map((group) =>
          `| ${escapeMarkdownCell(group.caseId)} | ${group.repeat} | ${models.map((model) => escapeMarkdownCell(formatPairedResult(group.rows.get(model)))).join(" | ")} |`
        )
        .join("\n")
    : `| - | - | ${models.map(() => "missing").join(" | ")} |`;
  const caseCount = new Set(comparison.rows.map((row) => row.caseId)).size;
  const repeatCount = Math.max(0, ...comparison.rows.map((row) => Number(row.repeat) || 1));

  return `## Model A/B Comparison

Run label: \`${escapeMarkdownCell(comparison.runLabel)}\`

Models are reported by separate dimensions; this report deliberately does not calculate a subjective combined winner score. Token columns are observed Responses API usage, not credential values or estimated cost.

- Cases: ${caseCount}
- Repeats: ${repeatCount}
- Complete paired samples: ${completePairs.length}

### Model Summary

| Model | Samples | Pass | Quality | Valid | Ingredient | Safety | API failures | Fallbacks | Latency avg | p50 | p95 | Input tok total | Output tok total | All tok total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${summaryRows}

### Paired Case Comparison

Each row compares the same golden-set case and repeat. Q=quality, V=valid recommendations, I=ingredient utilization, S=safety.

${pairedHeader}
${pairedDivider}
${pairedRows}
`;
}

export function buildMarkdown(cases, evaluatedRows) {
  const generatedAt = new Date().toISOString();
  const latestRows = latestRowsByCase(evaluatedRows);
  const measuredCaseIds = new Set(latestRows.map((row) => row.caseId));
  const pendingCases = cases.filter((item) => !measuredCaseIds.has(item.caseId));
  const summary = summarize(latestRows);
  const rejectReasonSummary = summarizeRejectReasons(latestRows);
  const evalGapSummary = summarizeEvalGaps(latestRows);
  const modelComparison = buildModelComparisonMarkdown(evaluatedRows);

  const caseRows = cases
    .map(
      (item) =>
        `| ${item.caseId} | ${JSON.stringify(item.ingredients)} | ${item.expected} | ${Math.round((item.checks?.minIngredientUtilization ?? 0.6) * 100)}% | ${item.checks?.requireSource === true ? "yes" : "no"} |`,
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
              `| ${row.createdAt ?? row.date ?? "TBD"} | ${row.caseId ?? "-"} | ${formatRate(row.qualityScore)} | ${formatRate(row.validRecommendationRate)} | ${formatRate(row.ingredientUtilization)} | ${formatSourceRate(row.sourceValidityRate, row.requireSource)} | ${row.awkwardPairViolations ?? 0} | ${row.forbiddenClaimViolations ?? 0} | ${formatTopReasons(row.rejectReasonCounts)} | ${formatEvalGaps(row)} | ${row.pass ? "pass" : "fail"} |`,
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
Source validity is scored only for cases that explicitly opt into verified-source checks; generated recommendation cases show N/A.

${modelComparison}

## Summary

| Total cases | Measured cases | Pending cases | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward violations | Forbidden claims |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ${cases.length} | ${summary.total} | ${pendingCases.length} | ${formatRate(summary.passRate)} | ${formatRate(summary.qualityScore)} | ${formatRate(summary.validRecommendationRate)} | ${formatRate(summary.ingredientUtilization)} | ${formatSourceRate(summary.sourceValidityRate, summary.sourceValidityRate !== null)} | ${summary.awkwardPairViolations} | ${summary.forbiddenClaimViolations} |

## Quality Gate Reason Summary

Calculated with \`evaluateRecipeQuality\` from the latest measured run for each case.

| Ready recipes | Rejected recipes | Top reject reasons |
| ---: | ---: | --- |
| ${summary.readyCount} | ${summary.rejectedCount} | ${formatTopReasons(rejectReasonSummary, 8)} |

| Reason | Count |
| --- | ---: |
${knownRejectReasons.map((reason) => `| ${reason} | ${rejectReasonSummary[reason] ?? 0} |`).join("\n")}

## Eval Gap Summary

These gaps are stricter eval-case expectations. A recipe can pass the production quality gate but still fail an eval case.

| Gap | Count |
| --- | ---: |
${evalGapSummary.length === 0 ? "| - | 0 |" : evalGapSummary.map(([gap, count]) => `| ${gap} | ${count} |`).join("\n")}

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

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward | Forbidden | Top reject reasons | Eval gaps | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
${resultRows}
`;
}

export async function main() {
  const cases = await readJsonArray(casesPath);
  const caseMap = new Map(cases.map((item) => [item.caseId, item]));
  const history = await readJsonArray(historyPath);
  const evaluatedRows = history.map((entry) => evaluateEntry(entry, caseMap.get(entry.caseId)));

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, buildMarkdown(cases, evaluatedRows));
  process.stdout.write(`Wrote ${path.relative(root, reportPath)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) await main();
