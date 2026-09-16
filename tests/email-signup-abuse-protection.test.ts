import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const requestRouteUrl = new URL(
  "../src/app/api/auth/email-verification/request/route.ts",
  import.meta.url
);
const signupRouteUrl = new URL("../src/app/api/auth/email-signup/route.ts", import.meta.url);
const rateLimitUrl = new URL(
  "../src/lib/server/email-verification-rate-limit.ts",
  import.meta.url
);
const migrationUrl = new URL("../docs/supabase-email-verification.sql", import.meta.url);

test("signup verification never scans or reveals the Auth user list", async () => {
  const [requestRoute, signupRoute] = await Promise.all([
    readFile(requestRouteUrl, "utf8"),
    readFile(signupRouteUrl, "utf8"),
  ]);

  assert.doesNotMatch(requestRoute, /hasAuthUserWithEmail|이미 가입된 이메일/);
  assert.doesNotMatch(signupRoute, /hasAuthUserWithEmail|이미 가입된 이메일/);
  assert.match(requestRoute, /consumeEmailVerificationRequestLimit/);
  assert.match(signupRoute, /auth\.admin\.createUser/);
});

test("email signup verification has atomic hashed IP and email request limits", async () => {
  const [rateLimit, migration] = await Promise.all([
    readFile(rateLimitUrl, "utf8"),
    readFile(migrationUrl, "utf8"),
  ]);

  assert.match(rateLimit, /createHmac\("sha256"/);
  assert.match(rateLimit, /consumePersistentLimit\("ip", ip, IP_LIMIT_PER_HOUR\)/);
  assert.match(rateLimit, /consumePersistentLimit\("email", email, EMAIL_LIMIT_PER_HOUR\)/);
  assert.match(migration, /email_verification_rate_limits/);
  assert.match(migration, /consume_email_verification_rate_limit/);
  assert.match(migration, /on conflict \(scope, key_hash\) do update/i);
  assert.match(migration, /to service_role/);
});
