import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMealDate,
  getMealDayHeading,
  getMealShareButtonLabel,
  getMealShareTitle,
} from "../apps/mobile/src/features/meal/meal-date-copy.ts";

const referenceDate = new Date("2026-09-07T12:00:00");

test("selected meal date drives the meal heading instead of always saying today", () => {
  assert.equal(getMealDayHeading("2026-09-07", referenceDate), "오늘의 식단");
  assert.equal(getMealDayHeading("2026-09-08", referenceDate), "9월 8일 식단");
});

test("selected meal date drives the one-day share title and button label", () => {
  assert.equal(formatMealDate("2026-09-08"), "9월 8일");
  assert.equal(getMealShareTitle("2026-09-08"), "냠픽 9월 8일 식단표");
  assert.equal(getMealShareButtonLabel("2026-09-07", referenceDate), "오늘 식단표 공유");
  assert.equal(getMealShareButtonLabel("2026-09-08", referenceDate), "9월 8일 식단표 공유");
});
