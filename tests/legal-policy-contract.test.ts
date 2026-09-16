import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LEGAL_EFFECTIVE_DATE_DOTTED,
  LEGAL_EFFECTIVE_DATE_KOREAN,
  PRIVACY_POLICY_VERSION,
  SERVICE_TERMS_VERSION,
} from "../packages/contracts/src/legal.ts";

test("legal display dates and stored policy versions share one source of truth", () => {
  assert.equal(SERVICE_TERMS_VERSION, "2026-05-03");
  assert.equal(PRIVACY_POLICY_VERSION, "2026-05-03");
  assert.equal(LEGAL_EFFECTIVE_DATE_KOREAN, "2026년 5월 3일");
  assert.equal(LEGAL_EFFECTIVE_DATE_DOTTED, "2026.05.03");
});

test("public policies and signup disclosure use the shared legal policy constants", () => {
  const terms = readFileSync(new URL("../src/app/terms/page.tsx", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../src/app/privacy/page.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../src/features/auth/ui/auth-form-view.tsx", import.meta.url), "utf8");
  assert.match(terms, /LEGAL_EFFECTIVE_DATE_KOREAN/);
  assert.match(privacy, /LEGAL_EFFECTIVE_DATE_KOREAN/);
  assert.match(auth, /LEGAL_EFFECTIVE_DATE_DOTTED/);
  assert.doesNotMatch(auth, /시행일: 2026\.00\.00/);
});
