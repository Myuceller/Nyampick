import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const apiUrl = new URL("../apps/mobile/src/lib/api.ts", import.meta.url);
const authContextUrl = new URL("../apps/mobile/src/features/auth/auth-context.tsx", import.meta.url);
const appUrl = new URL("../apps/mobile/App.tsx", import.meta.url);

test("a protected mobile API 401 clears the device session through one registered handler", async () => {
  const [api, authContext] = await Promise.all([
    readFile(apiUrl, "utf8"),
    readFile(authContextUrl, "utf8"),
  ]);

  assert.match(api, /setMobileApiUnauthorizedHandler/);
  assert.match(api, /response\.status === 401/);
  assert.match(api, /unauthorizedHandler\?\.\(\)/);
  assert.match(authContext, /setMobileApiUnauthorizedHandler\(clearExpiredSession\)/);
  assert.match(authContext, /signOut\(\{ scope: "local" \}\)/);
});

test("active native mutation buttons handle rejected promises and retain a visible error state", async () => {
  const app = await readFile(appUrl, "utf8");

  assert.match(app, /updateReaction\([\s\S]*?\.catch\(\(\) => undefined\)/);
  assert.match(app, /removeMeal\([\s\S]*?\.catch\(\(\) => undefined\)/);
  assert.match(app, /updateItem\([\s\S]*?\.catch\(\(\) => undefined\)/);
  assert.match(app, /removeItem\([\s\S]*?\.catch\(\(\) => undefined\)/);
  assert.match(app, /accessibilityRole="alert"[\s\S]*?style=\{s\.formError\}/);
});
