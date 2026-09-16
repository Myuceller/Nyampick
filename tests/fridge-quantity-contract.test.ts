import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fridgeStoreSource = readFileSync(new URL("../src/lib/server/supabase-app-data.ts", import.meta.url), "utf8");
const fridgeRouteSource = readFileSync(new URL("../src/app/api/fridge/items/route.ts", import.meta.url), "utf8");
const mobileSource = readFileSync(new URL("../apps/mobile/src/features/fridge/use-fridge-items.ts", import.meta.url), "utf8");

test("ordinary fridge-item quantities round-trip through the API", () => {
  assert.match(fridgeStoreSource, /quantity: row\.quantity \?\? undefined/);
  assert.match(fridgeStoreSource, /quantity: input\.quantity\?\.trim\(\) \|\| null/);
  assert.match(fridgeStoreSource, /quantity: patch\.quantity/);
  assert.doesNotMatch(fridgeStoreSource, /isCubeItemName/);
  assert.match(fridgeRouteSource, /quantity: body\.quantity/);
  assert.match(mobileSource, /quantity: quantity\?\.trim\(\) \|\| undefined/);
});
