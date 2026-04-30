const DEFAULT_AUTH_NEXT_PATH = "/";

export function sanitizeAuthNextPath(value: string | null | undefined) {
  if (!value) return DEFAULT_AUTH_NEXT_PATH;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_AUTH_NEXT_PATH;
  if (value.startsWith("/auth")) return DEFAULT_AUTH_NEXT_PATH;
  return value;
}

export function getAuthNextPath() {
  if (typeof window === "undefined") return DEFAULT_AUTH_NEXT_PATH;
  const currentUrl = new URL(window.location.href);
  return sanitizeAuthNextPath(currentUrl.searchParams.get("next"));
}

export function hasAuthNextPath() {
  return getAuthNextPath() !== DEFAULT_AUTH_NEXT_PATH;
}

export function buildAuthRedirectPath(nextPath: string | null | undefined) {
  const safeNextPath = sanitizeAuthNextPath(nextPath);
  if (safeNextPath === DEFAULT_AUTH_NEXT_PATH) return "/auth";
  return `/auth?next=${encodeURIComponent(safeNextPath)}`;
}
