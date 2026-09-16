import * as Crypto from "expo-crypto";

type CryptoAlgorithm = string | { name?: string };

type MinimalSubtleCrypto = {
  digest(algorithm: CryptoAlgorithm, data: BufferSource): Promise<ArrayBuffer>;
};

type MinimalWebCrypto = {
  getRandomValues?<T extends ArrayBufferView>(typedArray: T): T;
  subtle?: MinimalSubtleCrypto;
};

function getAlgorithmName(algorithm: CryptoAlgorithm) {
  return typeof algorithm === "string" ? algorithm : algorithm.name ?? "";
}

async function digest(algorithm: CryptoAlgorithm, data: BufferSource) {
  if (getAlgorithmName(algorithm).toUpperCase() !== "SHA-256") {
    throw new Error("Unsupported WebCrypto digest algorithm");
  }

  return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
}

function getRuntimeCrypto() {
  return (globalThis as unknown as { crypto?: MinimalWebCrypto }).crypto;
}

/**
 * Supabase Auth uses the WebCrypto-shaped `crypto.subtle.digest` API to produce
 * an S256 PKCE challenge. Expo Crypto supplies the equivalent native SHA-256
 * primitive, but React Native does not expose `crypto.subtle` by default.
 */
export function installNativeWebCrypto() {
  const existing = getRuntimeCrypto();
  if (existing?.subtle && existing.getRandomValues) return;

  const crypto: MinimalWebCrypto = existing ?? {};
  if (!crypto.getRandomValues) {
    crypto.getRandomValues = Crypto.getRandomValues as NonNullable<MinimalWebCrypto["getRandomValues"]>;
  }
  if (!crypto.subtle) {
    crypto.subtle = { digest };
  }

  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: crypto,
      writable: true,
    });
  } catch {
    // React Native must expose this before a PKCE flow can begin. Never let
    // Supabase silently fall back from S256 to the insecure plain challenge.
    throw new Error("native_webcrypto_unavailable");
  }
}

export function hasNativeWebCrypto() {
  const crypto = getRuntimeCrypto();
  return Boolean(crypto?.getRandomValues && crypto.subtle);
}
