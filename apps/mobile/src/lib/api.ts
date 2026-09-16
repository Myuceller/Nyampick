import { mobileConfig } from "@mobile/lib/config";

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly correlationId?: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

type UnauthorizedHandler = () => void;

type ApiErrorEnvelope = {
  code?: string;
  correlationId?: string;
  message?: string;
};

function getRetryAfterSeconds(value: string | null) {
  if (!value) return undefined;

  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setMobileApiUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export async function postPublicApi<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(path, { body });
}

export async function getAuthedApi<T>(path: string, accessToken: string): Promise<T> {
  return requestApi<T>(path, { accessToken, method: "GET" });
}

export async function requestAuthedApi<T>(path: string, accessToken: string, options: {
  body?: unknown;
  method: "POST" | "PATCH" | "DELETE";
  timeoutMessage?: string;
  timeoutMs?: number;
}): Promise<T> {
  return requestApi<T>(path, { ...options, accessToken });
}

async function requestApi<T>(path: string, options: {
  accessToken?: string;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  timeoutMessage?: string;
  timeoutMs?: number;
}): Promise<T> {
  if (!mobileConfig.apiUrl) {
    throw new MobileApiError("EXPO_PUBLIC_API_URL 환경 변수가 필요합니다.");
  }

  const controller = options.timeoutMs ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), options.timeoutMs)
    : null;

  try {
    const response = await fetch(`${mobileConfig.apiUrl}${path}`, {
      method: options.method ?? "POST",
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller?.signal,
    });
    const json = (await response.json().catch(() => ({}))) as T & ApiErrorEnvelope;
    if (!response.ok) {
      if (response.status === 401) {
        unauthorizedHandler?.();
      }
      throw new MobileApiError(
        json.message ?? "요청을 처리하지 못했습니다.",
        response.status,
        typeof json.code === "string" ? json.code : undefined,
        typeof json.correlationId === "string"
          ? json.correlationId
          : response.headers.get("X-Correlation-ID") ?? undefined,
        getRetryAfterSeconds(response.headers.get("Retry-After"))
      );
    }
    return json;
  } catch (caught) {
    if (controller?.signal.aborted) {
      throw new MobileApiError(options.timeoutMessage ?? "요청 시간이 오래 걸리고 있어요. 네트워크를 확인한 뒤 다시 시도해주세요.");
    }
    throw caught;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}
