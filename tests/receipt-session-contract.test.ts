import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../docs/supabase-meals.sql", import.meta.url), "utf8");
const scanRoute = readFileSync(new URL("../src/app/api/fridge/receipt-scan/route.ts", import.meta.url), "utf8");
const confirmRoute = readFileSync(new URL("../src/app/api/fridge/receipt-confirm/route.ts", import.meta.url), "utf8");
const sessionStore = readFileSync(new URL("../src/lib/server/receipt-scan-sessions.ts", import.meta.url), "utf8");

test("receipt scans use a private persistent session with TTL", () => {
  assert.match(migration, /create table if not exists public\.receipt_scan_sessions/i);
  assert.match(migration, /user_id uuid not null references auth\.users/i);
  assert.match(migration, /expires_at timestamptz not null/i);
  assert.match(migration, /consumed_at timestamptz/i);
  assert.match(migration, /alter table public\.receipt_scan_sessions enable row level security/i);
  assert.match(scanRoute, /createPersistentReceiptScanSession/);
  assert.match(sessionStore, /RECEIPT_SESSION_TTL_MINUTES = 15/);
});

test("receipt confirmation is atomically consumed and rejects replay", () => {
  assert.match(migration, /create or replace function public\.confirm_receipt_scan_session/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /set consumed_at = now\(\)/i);
  assert.match(migration, /already_confirmed/i);
  assert.match(migration, /insert into public\.fridge_items/i);
  assert.match(confirmRoute, /confirmPersistentReceiptScanSession/);
  assert.match(confirmRoute, /result\.status === "already_confirmed" \? 409/i);
});

test("missing receipt persistence migration fails closed with a recoverable response", () => {
  assert.match(sessionStore, /ReceiptScanSessionStorageError/);
  assert.match(sessionStore, /confirm_receipt_scan_session/);
  assert.match(scanRoute, /error instanceof ReceiptScanSessionStorageError \? 503 : 500/);
  assert.match(confirmRoute, /error instanceof ReceiptScanSessionStorageError \? 503 : 500/);
});
