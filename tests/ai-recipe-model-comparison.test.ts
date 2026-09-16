import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQualityExecutionPlan,
  parseQualityModels,
  parseQualityRepeats,
  selectQualityCases,
} from "../scripts/ai-recipe-quality-run.mjs";
import {
  buildModelComparisonMarkdown,
  evaluateEntry,
} from "../scripts/ai-recipe-quality-report.mjs";

const cases = [
  { caseId: "R1", ingredients: ["쌀"], limit: 1 },
  { caseId: "R2", ingredients: ["두부"], limit: 1 },
];

function testEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides,
    NODE_ENV: overrides.NODE_ENV ?? process.env.NODE_ENV ?? "test",
  };
}

test("multi-model quality runs select the full case set and alternate model order", () => {
  const models = parseQualityModels(testEnv({
    AI_QUALITY_MODELS: "gpt-4.1-mini,gpt-5.6-luna,gpt-4.1-mini",
  }));
  assert.deepEqual(models, ["gpt-4.1-mini", "gpt-5.6-luna"]);
  assert.equal(parseQualityRepeats(testEnv({ AI_QUALITY_REPEATS: "2" })), 2);

  const selected = selectQualityCases(cases, [{ caseId: "R1" }], {
    models,
    env: testEnv(),
  });
  assert.deepEqual(selected.map((item: { caseId: string }) => item.caseId), ["R1", "R2"]);

  const plan = buildQualityExecutionPlan(selected, models, 2);
  assert.deepEqual(
    plan.map((item) => `${item.repeat}:${item.evalCase.caseId}:${item.model}`),
    [
      "1:R1:gpt-4.1-mini",
      "1:R1:gpt-5.6-luna",
      "1:R2:gpt-5.6-luna",
      "1:R2:gpt-4.1-mini",
      "2:R1:gpt-5.6-luna",
      "2:R1:gpt-4.1-mini",
      "2:R2:gpt-4.1-mini",
      "2:R2:gpt-5.6-luna",
    ],
  );
});

test("single-model case selection keeps the legacy incremental behavior", () => {
  const selected = selectQualityCases(cases, [{ caseId: "R1" }], {
    models: ["gpt-4.1-mini"],
    env: testEnv({ AI_QUALITY_MAX_CASES: "5" }),
  });
  assert.deepEqual(selected.map((item: { caseId: string }) => item.caseId), ["R2"]);
});

test("empty model output scores zero quality and reports safety as unavailable", () => {
  const row = evaluateEntry(
    {
      caseId: "R1",
      model: "gpt-4.1-mini",
      limit: 1,
      ok: false,
      recommendations: [],
    },
    {
      caseId: "R1",
      ingredients: ["쌀"],
      limit: 1,
      checks: { minIngredientUtilization: 0.5 },
    },
  );

  assert.equal(row.qualityScore, 0);
  assert.equal(row.safetyRate, null);
  assert.equal(row.pass, false);
});

test("comparison report separates models, usage totals, latency, and paired cases", () => {
  const base = {
    runLabel: "test-ab",
    caseId: "R1",
    repeat: 1,
    ok: true,
    pass: true,
    qualityScore: 1,
    validRecommendationRate: 1,
    ingredientUtilization: 1,
    safetyRate: 1,
    fallbackUsed: false,
  };
  const markdown = buildModelComparisonMarkdown([
    {
      ...base,
      model: "gpt-4.1-mini",
      latencyMs: 100,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    },
    {
      ...base,
      model: "gpt-5.6-luna",
      latencyMs: 80,
      inputTokens: 12,
      outputTokens: 18,
      totalTokens: 30,
    },
  ]);

  assert.match(markdown, /Model A\/B Comparison/);
  assert.match(markdown, /gpt-4\.1-mini/);
  assert.match(markdown, /gpt-5\.6-luna/);
  assert.match(markdown, /Input tok total/);
  assert.match(markdown, /Complete paired samples: 1/);
  assert.match(markdown, /100ms/);
  assert.match(markdown, /80ms/);
});
