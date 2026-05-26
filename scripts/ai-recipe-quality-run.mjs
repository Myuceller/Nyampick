import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateRecipeRecommendationsWithOpenAI } from "../src/lib/server/recipe-ai.ts";

const root = process.cwd();
const casesPath = path.join(root, "docs", "ai-recipe-eval-cases.json");
const historyPath = path.join(root, "docs", "ai-recipe-quality-history.json");

async function loadDotEnvFile(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}

async function readJsonArray(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

function parseCaseFilter() {
  return new Set(
    (process.env.AI_QUALITY_CASES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function selectCases(cases, history) {
  const selectedIds = parseCaseFilter();
  if (selectedIds.size > 0) return cases.filter((item) => selectedIds.has(item.caseId));

  const measuredIds = new Set(history.map((entry) => entry.caseId).filter(Boolean));
  const maxCases = Number(process.env.AI_QUALITY_MAX_CASES ?? 5);
  return cases
    .filter((item) => !measuredIds.has(item.caseId))
    .slice(0, Number.isInteger(maxCases) && maxCases > 0 ? maxCases : 5);
}

function normalizeError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function runCase(evalCase) {
  const startedAt = Date.now();
  const entry = {
    createdAt: new Date().toISOString(),
    caseId: evalCase.caseId,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    limit: evalCase.limit ?? 3,
  };

  try {
    const result = await generateRecipeRecommendationsWithOpenAI({
      ingredients: evalCase.ingredients,
      limit: evalCase.limit ?? 3,
    });
    return {
      ...entry,
      recommendations: result.recommendations,
      latencyMs: Date.now() - startedAt,
      totalTokens: result.usage.totalTokens,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      fallbackUsed: result.fallbackUsed,
      ok: true,
    };
  } catch (error) {
    return {
      ...entry,
      recommendations: [],
      latencyMs: Date.now() - startedAt,
      totalTokens: 0,
      fallbackUsed: false,
      ok: false,
      error: normalizeError(error),
    };
  }
}

await loadDotEnvFile(path.join(root, ".env.local"));
await loadDotEnvFile(path.join(root, ".env"));

const cases = await readJsonArray(casesPath);
const history = await readJsonArray(historyPath);
const casesToRun = selectCases(cases, history);

if (casesToRun.length === 0) {
  process.stdout.write("No AI recipe eval cases selected.\n");
  process.exit(0);
}

const nextHistory = [...history];
for (const evalCase of casesToRun) {
  process.stdout.write(`Running ${evalCase.caseId}: ${evalCase.ingredients.join(", ")}\n`);
  const entry = await runCase(evalCase);
  nextHistory.push(entry);
  process.stdout.write(
    `${entry.ok ? "ok" : "fail"} ${entry.caseId} ${entry.latencyMs}ms ${entry.totalTokens} tokens\n`
  );
}

await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`);
process.stdout.write(`Wrote ${path.relative(root, historyPath)}\n`);
