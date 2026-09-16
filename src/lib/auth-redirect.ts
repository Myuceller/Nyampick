const DEFAULT_AUTH_NEXT_PATH = "/meal";
const AUTH_REDIRECT_ORIGIN = "https://nyampick.invalid";

function hasUnsafeRedirectCharacters(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return (
      decoded.startsWith("//") ||
      /[\\\u0000-\u001F\u007F]/.test(value) ||
      /[\\\u0000-\u001F\u007F]/.test(decoded)
    );
  } catch {
    return true;
  }
}

export function sanitizeAuthNextPath(value: string | null | undefined) {
  if (!value) return DEFAULT_AUTH_NEXT_PATH;
  if (hasUnsafeRedirectCharacters(value)) return DEFAULT_AUTH_NEXT_PATH;

  try {
    const destination = new URL(value, AUTH_REDIRECT_ORIGIN);
    if (destination.origin !== AUTH_REDIRECT_ORIGIN) return DEFAULT_AUTH_NEXT_PATH;
    if (!destination.pathname.startsWith("/") || destination.pathname.startsWith("/auth")) {
      return DEFAULT_AUTH_NEXT_PATH;
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_AUTH_NEXT_PATH;
  }
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
