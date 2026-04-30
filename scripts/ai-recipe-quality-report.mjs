import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const casesPath = path.join(root, "docs", "ai-recipe-eval-cases.json");
const historyPath = path.join(root, "docs", "ai-recipe-quality-history.json");
const reportPath = path.join(root, "docs", "ai-recipe-quality-report.md");
const chartPath = path.join(root, "docs", "ai-recipe-quality-chart.svg");

const validTastes = new Set(["좋아해요", "보통이에요", "싫어해요"]);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function evaluateEntry(entry, evalCase) {
  const recommendations = Array.isArray(entry.recommendations) ? entry.recommendations : [];
  const checks = evalCase?.checks ?? {};
  const requireSource = checks.requireSource !== false;
  const limit = Number(entry.limit ?? evalCase?.limit ?? recommendations.length ?? 0);
  const validCount = recommendations.filter((recipe) => isValidRecipe(recipe, requireSource)).length;
  const validRecommendationRate = limit > 0 ? Math.min(1, validCount / limit) : null;

  const joinedText = recommendations.map(textOfRecipe).join(" ");
  const usedIngredients = (evalCase?.ingredients ?? []).filter((ingredient) =>
    containsIngredient(joinedText, ingredient)
  );
  const ingredientUtilization =
    evalCase?.ingredients?.length > 0 ? usedIngredients.length / evalCase.ingredients.length : null;

  const sourceUrls = recommendations
    .map((recipe) => recipe?.source_url ?? recipe?.sourceUrl)
    .filter((value) => typeof value === "string" && value.trim().length > 0);
  const sourceValidityRate =
    recommendations.length > 0
      ? sourceUrls.filter(isValidHttpUrl).length / recommendations.length
      : null;

  const awkwardPairs = Array.isArray(checks.awkwardPairs) ? checks.awkwardPairs : [];
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
  const safetyRate = awkwardPairs.length === 0 ? 1 : awkwardPairViolations === 0 ? 1 : 0;

  const qualityScore =
    (validRecommendationRate ?? 0) * 0.4 +
    (ingredientUtilization ?? 0) * 0.25 +
    (sourceValidityRate ?? 0) * 0.2 +
    safetyRate * 0.15;

  return {
    ...entry,
    expected: evalCase?.expected ?? "",
    validRecommendationRate,
    ingredientUtilization,
    sourceValidityRate,
    awkwardPairViolations,
    qualityScore,
    pass:
      (validRecommendationRate ?? 0) >= 0.9 &&
      (ingredientUtilization ?? 0) >= (checks.minIngredientUtilization ?? 0.6) &&
      (sourceValidityRate ?? 0) >= 0.9 &&
      awkwardPairViolations === 0,
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
  };
}

function trendPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function buildRateTrend(rows, options) {
  const nums = rows
    .map((row, index) => ({ row, index, value: options.value(row) }))
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));

  if (nums.length === 0) return "";

  const pointGap = nums.length > 1 ? options.width / (nums.length - 1) : 0;
  const points = nums.map((point, index) => ({
    ...point,
    x: nums.length > 1 ? options.x + pointGap * index : options.x + options.width / 2,
    y: options.y + options.height - Math.max(0, Math.min(1, point.value)) * options.height,
  }));

  return `${points.length > 1 ? `<path d="${trendPath(points)}" fill="none" stroke="${options.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ""}
  ${points
    .map(
      (point, index) =>
        `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 5 : 4}" fill="${index === points.length - 1 ? "#202725" : options.color}" />`
    )
    .join("\n")}
  ${points
    .map((point, index) => {
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      return `<text x="${point.x.toFixed(1)}" y="${options.y + options.height + 22}" text-anchor="${anchor}" font-size="11" fill="#6f7875">${escapeXml(point.row.caseId ?? `#${point.index + 1}`)}</text>`;
    })
    .join("\n")}`;
}

function buildMarkdown(cases, evaluatedRows) {
  const generatedAt = new Date().toISOString();
  const summary = summarize(evaluatedRows);

  const caseRows = cases
    .map(
      (item) =>
        `| ${item.caseId} | ${JSON.stringify(item.ingredients)} | ${item.expected} | ${Math.round((item.checks?.minIngredientUtilization ?? 0.6) * 100)}% | ${item.checks?.requireSource === false ? "no" : "yes"} |`
    )
    .join("\n");

  const resultRows =
    evaluatedRows.length === 0
      ? "| - | - | - | - | - | - | - | - |"
      : evaluatedRows
          .slice(-20)
          .reverse()
          .map(
            (row) =>
              `| ${row.createdAt ?? row.date ?? "TBD"} | ${row.caseId ?? "-"} | ${formatRate(row.qualityScore)} | ${formatRate(row.validRecommendationRate)} | ${formatRate(row.ingredientUtilization)} | ${formatRate(row.sourceValidityRate)} | ${row.awkwardPairViolations ?? 0} | ${row.pass ? "pass" : "fail"} |`
          )
          .join("\n");

  return `# AI Recipe Quality Report

Generated at: ${generatedAt}

Sources:

- \`docs/ai-recipe-eval-cases.json\`
- \`docs/ai-recipe-quality-history.json\`

## Summary

| Runs | Pass rate | Quality score | Valid recommendations | Ingredient utilization | Source validity | Awkward pair violations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ${summary.total} | ${formatRate(summary.passRate)} | ${formatRate(summary.qualityScore)} | ${formatRate(summary.validRecommendationRate)} | ${formatRate(summary.ingredientUtilization)} | ${formatRate(summary.sourceValidityRate)} | ${summary.awkwardPairViolations} |

## Evaluation Cases

| Case | Ingredients | Expected | Min ingredient use | Require source |
| --- | --- | --- | ---: | --- |
${caseRows}

## Latest Results

| Created at | Case | Quality | Valid recs | Ingredient use | Source validity | Awkward violations | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${resultRows}

## History Entry Format

\`\`\`json
{
  "createdAt": "2026-04-30T00:00:00.000Z",
  "caseId": "R1",
  "model": "OPENAI_MODEL",
  "limit": 3,
  "recommendations": [],
  "latencyMs": 2140,
  "totalTokens": 1030,
  "fallbackUsed": false
}
\`\`\`
`;
}

function buildSvg(evaluatedRows) {
  const summary = summarize(evaluatedRows);
  const width = 920;
  const height = evaluatedRows.length > 0 ? 650 : 320;
  const metrics = [
    ["Quality score", summary.qualityScore, "#57bf8e"],
    ["Valid recommendations", summary.validRecommendationRate, "#8ccfb0"],
    ["Ingredient utilization", summary.ingredientUtilization, "#75b7d9"],
    ["Source validity", summary.sourceValidityRate, "#9c8ee5"],
    ["Pass rate", summary.passRate, "#f2b84b"],
  ];

  const rows = metrics
    .map(([label, value, color], index) => {
      const y = 112 + index * 36;
      const widthValue = typeof value === "number" ? (520 * Math.max(0, Math.min(1, value))).toFixed(1) : 0;
      return `<text x="32" y="${y}" font-size="13" font-weight="700" fill="#202725">${escapeXml(label)}</text>
  <rect x="220" y="${y - 13}" width="520" height="16" rx="4" fill="#ecf0ee" />
  <rect x="220" y="${y - 13}" width="${widthValue}" height="16" rx="4" fill="${color}" />
  <text x="758" y="${y}" font-size="12" fill="#202725">${escapeXml(formatRate(value))}</text>`;
    })
    .join("\n");

  const trend =
    evaluatedRows.length === 0
      ? ""
      : `<text x="32" y="330" font-size="15" font-weight="700" fill="#202725">Quality Trend</text>
  <line x1="92" y1="430" x2="732" y2="430" stroke="#ecf0ee" />
  ${buildRateTrend(evaluatedRows, {
    x: 92,
    y: 340,
    width: 640,
    height: 92,
    color: "#57bf8e",
    value: (row) => row.qualityScore,
  })}
  <text x="760" y="370" font-size="12" fill="#6f7875">higher is better</text>
  <text x="760" y="392" font-size="12" fill="#202725">pass rate ${escapeXml(formatRate(summary.passRate))}</text>

  <text x="32" y="504" font-size="15" font-weight="700" fill="#202725">Case Results</text>
  ${evaluatedRows
    .slice(-5)
    .map((row, index) => {
      const x = 32 + index * 170;
      const color = row.pass ? "#13966f" : "#b35b00";
      return `<text x="${x}" y="532" font-size="12" font-weight="700" fill="#202725">${escapeXml(row.caseId ?? `#${index + 1}`)}</text>
  <text x="${x}" y="554" font-size="12" fill="#6f7875">quality ${escapeXml(formatRate(row.qualityScore))}</text>
  <text x="${x}" y="576" font-size="12" fill="${color}">${row.pass ? "pass" : "fail"} · awkward ${row.awkwardPairViolations ?? 0}</text>`;
    })
    .join("\n")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">AI Recipe Quality Report</title>
  <desc id="desc">Recipe recommendation quality metrics from fixed evaluation cases and recorded AI responses.</desc>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <text x="32" y="42" font-size="24" font-weight="800" fill="#202725">AI Recipe Quality Report</text>
  <text x="32" y="68" font-size="13" fill="#6f7875">Valid recommendations, ingredient utilization, source validity, and awkward pair checks</text>
  ${rows}
  ${trend}
  <text x="32" y="${height - 34}" font-size="12" fill="#6f7875">${evaluatedRows.length} recorded runs · source docs/ai-recipe-quality-history.json</text>
</svg>
`;
}

const cases = await readJsonArray(casesPath);
const caseMap = new Map(cases.map((item) => [item.caseId, item]));
const history = await readJsonArray(historyPath);
const evaluatedRows = history.map((entry) => evaluateEntry(entry, caseMap.get(entry.caseId)));

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, buildMarkdown(cases, evaluatedRows));
await writeFile(chartPath, buildSvg(evaluatedRows));

console.log(`Wrote ${path.relative(root, reportPath)}`);
console.log(`Wrote ${path.relative(root, chartPath)}`);
