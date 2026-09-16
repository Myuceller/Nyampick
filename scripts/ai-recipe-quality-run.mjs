import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import OpenAI from "openai";
import {
  generateRecipeRecommendations,
  RECIPE_MODEL_CLIENT_OPTIONS,
} from "../src/lib/ai/recipe-generation.ts";

const root = process.cwd();
const casesPath = path.join(root, "docs", "ai-recipe-eval-cases.json");
const historyPath = path.join(root, "docs", "ai-recipe-quality-history.json");
const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_REPEATS = 10;

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

function validatePublicMetadata(value, name, env) {
  if (value.length > 100 || /[\r\n|]/.test(value)) {
    throw new Error(`${name} must be at most 100 characters and cannot contain line breaks or pipes.`);
  }

  for (const [key, secret] of Object.entries(env)) {
    if (!/(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(key) || typeof secret !== "string" || secret.length < 8) {
      continue;
    }
    if (value.includes(secret)) throw new Error(`${name} must not contain a credential value.`);
  }

  return value;
}

export function parseQualityModels(env = process.env) {
  const configured = env.AI_QUALITY_MODELS;
  const rawModels = configured === undefined
    ? [env.OPENAI_MODEL?.trim() || DEFAULT_MODEL]
    : configured.split(",").map((value) => value.trim()).filter(Boolean);

  if (rawModels.length === 0) {
    throw new Error("AI_QUALITY_MODELS must contain at least one model ID.");
  }

  const models = [...new Set(rawModels)];
  for (const model of models) {
    validatePublicMetadata(model, "AI_QUALITY_MODELS", env);
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error(`Invalid model ID: ${model}`);
  }
  return models;
}

export function parseQualityRepeats(env = process.env) {
  const raw = env.AI_QUALITY_REPEATS?.trim();
  if (!raw) return 1;
  const repeats = Number(raw);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > MAX_REPEATS) {
    throw new Error(`AI_QUALITY_REPEATS must be an integer between 1 and ${MAX_REPEATS}.`);
  }
  return repeats;
}

export function parseCaseFilter(env = process.env) {
  return new Set(
    (env.AI_QUALITY_CASES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function selectQualityCases(cases, history, { models, env = process.env }) {
  const selectedIds = parseCaseFilter(env);
  if (selectedIds.size > 0) return cases.filter((item) => selectedIds.has(item.caseId));

  // A fair model comparison needs the same complete golden set. The legacy
  // single-model command keeps its incremental five-unmeasured-case behavior.
  if (models.length > 1) return [...cases];

  const measuredIds = new Set(history.map((entry) => entry.caseId).filter(Boolean));
  const maxCases = Number(env.AI_QUALITY_MAX_CASES ?? 5);
  return cases
    .filter((item) => !measuredIds.has(item.caseId))
    .slice(0, Number.isInteger(maxCases) && maxCases > 0 ? maxCases : 5);
}

export function buildQualityExecutionPlan(cases, models, repeats) {
  const plan = [];
  for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const rotation = (caseIndex + repeatIndex) % models.length;
      for (let orderIndex = 0; orderIndex < models.length; orderIndex += 1) {
        plan.push({
          evalCase: cases[caseIndex],
          model: models[(rotation + orderIndex) % models.length],
          repeat: repeatIndex + 1,
          orderIndex,
        });
      }
    }
  }
  return plan;
}

export function createQualityRunLabel(env = process.env, models = [], now = new Date()) {
  const configured = env.AI_QUALITY_RUN_LABEL?.trim();
  if (configured) return validatePublicMetadata(configured, "AI_QUALITY_RUN_LABEL", env);
  if (models.length < 2) return undefined;
  return `model-compare-${now.toISOString().replaceAll(/[:.]/g, "-")}`;
}

function redactCredentialValues(message, env = process.env) {
  let redacted = String(message)
    .replaceAll(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]")
    .replaceAll(/(Bearer\s+)[^\s"'`]+/gi, "$1[REDACTED]");

  for (const [key, secret] of Object.entries(env)) {
    if (!/(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(key) || typeof secret !== "string" || secret.length < 8) {
      continue;
    }
    redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  return redacted.slice(0, 500);
}

function normalizeError(error) {
  return redactCredentialValues(error instanceof Error ? error.message : String(error));
}

async function runCase(evalCase, { model, runLabel, repeat, orderIndex }) {
  const startedAt = Date.now();
  const entry = {
    createdAt: new Date().toISOString(),
    caseId: evalCase.caseId,
    model,
    limit: evalCase.limit ?? 3,
    ...(runLabel ? { runLabel, repeat, orderIndex } : {}),
  };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is missing");
    const client = new OpenAI({ apiKey, ...RECIPE_MODEL_CLIENT_OPTIONS });
    const result = await generateRecipeRecommendations({
      execute: (request, options) =>
        client.responses.create(request, {
          signal: options.signal,
          timeout: options.timeoutMs,
        }),
      model,
      recipeInput: {
        ingredients: evalCase.ingredients,
        limit: evalCase.limit ?? 3,
      },
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
      inputTokens: 0,
      outputTokens: 0,
      fallbackUsed: false,
      ok: false,
      error: normalizeError(error),
    };
  }
}

export async function main() {
  await loadDotEnvFile(path.join(root, ".env.local"));
  await loadDotEnvFile(path.join(root, ".env"));

  const models = parseQualityModels();
  const repeats = parseQualityRepeats();
  const runLabel = createQualityRunLabel(process.env, models);
  const cases = await readJsonArray(casesPath);
  const history = await readJsonArray(historyPath);
  const casesToRun = selectQualityCases(cases, history, { models });

  if (casesToRun.length === 0) {
    process.stdout.write("No AI recipe eval cases selected.\n");
    return;
  }

  const plan = buildQualityExecutionPlan(casesToRun, models, repeats);
  const nextHistory = [...history];
  for (const task of plan) {
    const comparisonPrefix = runLabel
      ? `[${runLabel}] repeat ${task.repeat}/${repeats} ${task.model} `
      : "";
    process.stdout.write(
      `${comparisonPrefix}Running ${task.evalCase.caseId}: ${task.evalCase.ingredients.join(", ")}\n`
    );
    const entry = await runCase(task.evalCase, { ...task, runLabel });
    nextHistory.push(entry);
    process.stdout.write(
      `${entry.ok ? "ok" : "fail"} ${entry.caseId} ${entry.latencyMs}ms ${entry.totalTokens} tokens\n`
    );
  }

  await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`);
  process.stdout.write(`Wrote ${path.relative(root, historyPath)}\n`);
  if (runLabel) {
    process.stdout.write(`Comparison run label: ${runLabel}\nRun npm run ai:quality to refresh the report.\n`);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) await main();
