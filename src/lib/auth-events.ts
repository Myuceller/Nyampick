export const AUTH_REQUIRED_EVENT = "nyampick:auth-required";

type AuthRequiredDetail = {
  status: number;
  url: string;
};

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export function notifyAuthRequired(input: RequestInfo | URL, status = 401) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AuthRequiredDetail>(AUTH_REQUIRED_EVENT, {
      detail: {
        status,
        url: getRequestUrl(input),
      },
    })
  );
}
