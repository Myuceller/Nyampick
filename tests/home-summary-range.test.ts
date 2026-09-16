import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getHomeSummaryMealRange } from "../src/lib/meal-date-range.ts";

const mealStoreSource = readFileSync(
  new URL("../src/lib/server/supabase-meals.ts", import.meta.url),
  "utf8"
);
const homeSummarySource = readFileSync(
  new URL("../src/lib/server/supabase-app-data.ts", import.meta.url),
  "utf8"
);

test("home summary fetches only the visible calendar month and adjacent weeks", () => {
  assert.deepEqual(getHomeSummaryMealRange("2026-09-07"), {
    from: "2026-08-25",
    to: "2026-10-07",
  });
  assert.deepEqual(getHomeSummaryMealRange("2026-02-16"), {
    from: "2026-01-25",
    to: "2026-03-07",
  });
});

test("home summary uses a bounded meal query backed by a user-date filter", () => {
  assert.match(mealStoreSource, /export async function getMealsByDateRangeFromDb/);
  assert.match(mealStoreSource, /\.eq\("user_id", userId\)[\s\S]*?\.gte\("date", range\.from\)[\s\S]*?\.lte\("date", range\.to\)/);
  assert.match(homeSummarySource, /getHomeSummaryFromDb[\s\S]*?getMealsByDateRangeFromDb\(userId, getHomeSummaryMealRange\(today\)\)/);
});
