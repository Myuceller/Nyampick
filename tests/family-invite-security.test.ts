import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const accessUrl = new URL("../src/lib/server/family-access.ts", import.meta.url);
const routeUrl = new URL("../src/app/api/children/invite-code/route.ts", import.meta.url);
const mobileUrl = new URL("../apps/mobile/src/features/family/use-family.ts", import.meta.url);

test("family invite codes use high entropy and explicit rotation revokes active codes", async () => {
  const [access, route, mobile] = await Promise.all([
    readFile(accessUrl, "utf8"),
    readFile(routeUrl, "utf8"),
    readFile(mobileUrl, "utf8"),
  ]);

  assert.match(access, /randomBytes\(12\)/);
  assert.match(access, /rotate\?: boolean/);
  assert.match(access, /if \(input\.rotate\)/);
  assert.match(access, /update\(\{ revoked_at: nowIso \}\)/);
  assert.match(route, /rotate must be a boolean/);
  assert.match(route, /rotate: body\.rotate === true/);
  assert.match(mobile, /createInviteCode = useCallback\(async \(rotate = true\)/);
});

test("family invite joins use an atomic server-side attempt limit", async () => {
  const [access, route, migration] = await Promise.all([
    readFile(accessUrl, "utf8"),
    readFile(new URL("../src/app/api/children/join-code/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/supabase-meals.sql", import.meta.url), "utf8"),
  ]);
  assert.match(access, /consumeFamilyInviteJoinAttempt/);
  assert.match(route, /FamilyInviteRateLimitError/);
  assert.match(route, /status: 429/);
  assert.match(route, /status: 503/);
  assert.match(migration, /family_invite_join_attempts/);
  assert.match(migration, /consume_family_invite_join_attempt/);
  assert.match(migration, /on conflict \(key_hash\) do update/i);
});
