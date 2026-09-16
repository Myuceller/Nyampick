function requiredPublicValue(value: string | undefined) {
  return value || null;
}

function normalizeApiUrl(value: string | null) {
  return value?.replace(/\/$/, "") ?? null;
}

export const mobileConfig = {
  apiUrl: normalizeApiUrl(requiredPublicValue(process.env.EXPO_PUBLIC_API_URL?.trim())),
  appleAuthEnabled: process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === "true",
  supabaseAnonKey: requiredPublicValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  supabaseUrl: requiredPublicValue(process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()),
};

export function getAuthConfigurationError() {
  const missing = [
    !mobileConfig.apiUrl && "EXPO_PUBLIC_API_URL",
    !mobileConfig.supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
    !mobileConfig.supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  return missing.length ? `${missing.join(", ")} 환경 변수가 필요합니다.` : null;
}
