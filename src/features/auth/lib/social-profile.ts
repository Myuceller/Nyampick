export type SocialProviderName = "email" | "google" | "kakao" | "unknown";

type MetadataScalar = string | number | boolean | null;
export type MetadataValue = MetadataScalar | MetadataObject | MetadataValue[];
export interface MetadataObject {
  [key: string]: MetadataValue;
}

export interface AuthUserLike {
  email?: string | null;
  app_metadata?: MetadataObject | null;
  user_metadata?: MetadataObject | null;
}

function asObject(value: MetadataValue | undefined): MetadataObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MetadataObject)
    : null;
}

function asString(value: MetadataValue | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function getPrimaryAuthProvider(user: AuthUserLike): SocialProviderName {
  const provider = asString(user.app_metadata?.provider);
  if (provider === "email" || provider === "google" || provider === "kakao") return provider;

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    if (providers.includes("kakao")) return "kakao";
    if (providers.includes("google")) return "google";
    if (providers.includes("email")) return "email";
  }

  return "unknown";
}

export function getKakaoAccountMetadata(user: AuthUserLike) {
  return asObject(user.user_metadata?.kakao_account);
}

export function readAuthUserEmail(user: AuthUserLike): string | undefined {
  const direct = user.email?.trim();
  if (direct) return direct;

  const metadata = user.user_metadata ?? {};
  const metadataEmail =
    asString(metadata.email) ||
    asString(metadata.email_address) ||
    asString(metadata.preferred_email);
  if (metadataEmail) return metadataEmail;

  return asString(getKakaoAccountMetadata(user)?.email);
}

export function readAuthUserDisplayName(user: AuthUserLike): string | undefined {
  const metadata = user.user_metadata ?? {};
  const direct =
    asString(metadata.full_name) ||
    asString(metadata.name) ||
    asString(metadata.nickname) ||
    asString(metadata.user_name) ||
    asString(metadata.preferred_username);
  if (direct) return direct;

  const kakaoProfile = asObject(getKakaoAccountMetadata(user)?.profile);
  return asString(kakaoProfile?.nickname);
}

export function readAuthUserProfileImage(user: AuthUserLike): string | undefined {
  const metadata = user.user_metadata ?? {};
  const direct =
    asString(metadata.avatar_url) ||
    asString(metadata.picture) ||
    asString(metadata.profile_image_url);
  if (direct) return direct;

  const kakaoProfile = asObject(getKakaoAccountMetadata(user)?.profile);
  return (
    asString(kakaoProfile?.profile_image_url) ||
    asString(kakaoProfile?.thumbnail_image_url)
  );
}

export function requiresKakaoEmailConsent(user: AuthUserLike): boolean {
  return getPrimaryAuthProvider(user) === "kakao" && !readAuthUserEmail(user);
}
