import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production canonical origin defaults to the deployed www Nyampick domain", () => {
  const source = readFileSync(new URL("../src/lib/app-url.ts", import.meta.url), "utf8");
  assert.match(source, /return "https:\/\/www\.nyampick\.kr"/);
});
