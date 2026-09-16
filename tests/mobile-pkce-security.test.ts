import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webCryptoSource = readFileSync(
  new URL("../apps/mobile/src/lib/web-crypto.ts", import.meta.url),
  "utf8"
);
const supabaseSource = readFileSync(
  new URL("../apps/mobile/src/lib/supabase.ts", import.meta.url),
  "utf8"
);

test("native Supabase PKCE receives an Expo-backed S256 digest before client initialization", () => {
  assert.match(webCryptoSource, /import \* as Crypto from "expo-crypto"/);
  assert.match(webCryptoSource, /Crypto\.CryptoDigestAlgorithm\.SHA256/);
  assert.match(webCryptoSource, /Object\.defineProperty\(globalThis, "crypto"/);
  assert.match(webCryptoSource, /throw new Error\("native_webcrypto_unavailable"\)/);
  assert.match(supabaseSource, /installNativeWebCrypto\(\);[\s\S]*?client = createClient/);
  assert.match(supabaseSource, /flowType: "pkce"/);
});
