import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("protected API authentication does not retain a process-local bearer-token cache", () => {
  const source = readFileSync(new URL("../src/lib/server/api-auth.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /TOKEN_USER_CACHE/);
  assert.doesNotMatch(source, /AUTH_CACHE_TTL_MS/);
  assert.match(source, /supabase\.auth\.getUser\(token\)/);
});
