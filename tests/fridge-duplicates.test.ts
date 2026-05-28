import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFridgePayloadName,
  normalizeFridgeItemKey,
  selectAddableDraftIngredients,
  selectNewDraftIngredients,
} from "../src/features/fridge/lib/fridge-duplicates.ts";

test("buildFridgePayloadName appends cube suffix only for cube ingredients", () => {
  assert.equal(buildFridgePayloadName("브로콜리", "cube"), "브로콜리 큐브");
  assert.equal(buildFridgePayloadName("브로콜리 큐브", "cube"), "브로콜리 큐브");
  assert.equal(buildFridgePayloadName("브로콜리", "vegetable"), "브로콜리");
});

test("normalizeFridgeItemKey ignores whitespace differences", () => {
  assert.equal(normalizeFridgeItemKey("브로 콜리 큐브"), normalizeFridgeItemKey("브로콜리큐브"));
});

test("selectNewDraftIngredients skips items already in fridge", () => {
  const result = selectNewDraftIngredients({
    lines: ["브로콜리", "당근"],
    type: "vegetable",
    existingItems: [{ name: "브로콜리" }],
    idPrefix: "draft-test",
  });

  assert.deepEqual(result.drafts.map((item) => item.name), ["당근"]);
  assert.deepEqual(result.skippedExisting, ["브로콜리"]);
  assert.deepEqual(result.skippedRepeated, []);
});

test("selectNewDraftIngredients skips repeated input lines", () => {
  const result = selectNewDraftIngredients({
    lines: ["당근", "당근", "소고기"],
    type: "protein",
    existingItems: [],
    idPrefix: "draft-test",
  });

  assert.deepEqual(result.drafts.map((item) => item.name), ["당근", "소고기"]);
  assert.deepEqual(result.skippedExisting, []);
  assert.deepEqual(result.skippedRepeated, ["당근"]);
});

test("selectNewDraftIngredients compares cube inputs by final payload name", () => {
  const result = selectNewDraftIngredients({
    lines: ["브로콜리"],
    type: "cube",
    existingItems: [{ name: "브로콜리 큐브" }],
    idPrefix: "draft-test",
  });

  assert.deepEqual(result.drafts, []);
  assert.deepEqual(result.skippedExisting, ["브로콜리"]);
});

test("selectAddableDraftIngredients rechecks duplicates after draft type changes", () => {
  const result = selectAddableDraftIngredients({
    drafts: [
      { id: "draft-1", name: "브로콜리", type: "vegetable" },
      { id: "draft-2", name: "당근", type: "cube" },
      { id: "draft-3", name: "당근 큐브", type: "cube" },
    ],
    existingItems: [{ name: "브로콜리" }],
  });

  assert.deepEqual(result.drafts.map((item) => item.name), ["당근"]);
  assert.deepEqual(result.skippedExisting, ["브로콜리"]);
  assert.deepEqual(result.skippedRepeated, ["당근 큐브"]);
});
