import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mobileConfig } from "@mobile/lib/config";
import { installNativeWebCrypto } from "@mobile/lib/web-crypto";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

let client: SupabaseClient | null = null;
let initializationError: string | null = null;

export function getSupabaseInitializationError() {
  return initializationError;
}

export function getSupabase() {
  if (client) return client;
  if (!mobileConfig.supabaseUrl || !mobileConfig.supabaseAnonKey) return null;

  try {
    installNativeWebCrypto();
  } catch {
    initializationError = "이 기기에서는 안전한 소셜 로그인을 시작할 수 없어요. 앱을 업데이트한 뒤 다시 시도해주세요.";
    return null;
  }

  client = createClient(mobileConfig.supabaseUrl, mobileConfig.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
      storage: secureStorage,
    },
  });
  return client;
}
