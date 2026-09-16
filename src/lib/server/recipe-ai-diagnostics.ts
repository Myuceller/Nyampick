export type RecipeAiFailureReason =
  | "configuration"
  | "authentication"
  | "quota"
  | "rate_limit"
  | "model_access"
  | "invalid_request"
  | "timeout"
  | "network"
  | "invalid_output"
  | "provider"
  | "unknown";

export interface RecipeAiFailureDiagnostic {
  reason: RecipeAiFailureReason;
  providerStatus?: number;
}

function asErrorRecord(cause: unknown): Record<string, unknown> | undefined {
  return cause && typeof cause === "object"
    ? (cause as Record<string, unknown>)
    : undefined;
}

function safeProviderStatus(record: Record<string, unknown> | undefined) {
  const status = record?.status;
  return Number.isInteger(status) && Number(status) >= 400 && Number(status) <= 599
    ? Number(status)
    : undefined;
}

export function classifyRecipeAiFailure(cause: unknown): RecipeAiFailureDiagnostic {
  const record = asErrorRecord(cause);
  const providerStatus = safeProviderStatus(record);
  const name = typeof record?.name === "string" ? record.name : "";
  const code = typeof record?.code === "string" ? record.code : "";
  const message = typeof record?.message === "string" ? record.message : "";
  const withStatus = (reason: RecipeAiFailureReason): RecipeAiFailureDiagnostic =>
    providerStatus ? { reason, providerStatus } : { reason };

  if (name === "RecipeAiConfigurationError") return { reason: "configuration" };
  if (providerStatus === 401) return withStatus("authentication");
  if (providerStatus === 402 || code === "insufficient_quota") {
    return withStatus("quota");
  }
  if (providerStatus === 429) return withStatus("rate_limit");
  if (providerStatus === 403 || providerStatus === 404) {
    return withStatus("model_access");
  }
  if (providerStatus === 400 || providerStatus === 422) {
    return withStatus("invalid_request");
  }
  if (
    name === "AbortError" ||
    name === "APIConnectionTimeoutError" ||
    name === "APITimeoutError" ||
    message === "AI 추천 생성 시간이 초과되었습니다."
  ) {
    return withStatus("timeout");
  }
  if (name === "APIConnectionError") return withStatus("network");
  if (
    message === "AI가 사용할 수 있는 레시피를 생성하지 못했습니다." ||
    message === "AI 응답 형식이 올바르지 않습니다." ||
    message === "AI 응답 스키마가 올바르지 않습니다." ||
    message === "AI 응답을 JSON으로 해석하지 못했습니다."
  ) {
    return withStatus("invalid_output");
  }
  if (providerStatus && providerStatus >= 500) return withStatus("provider");
  return withStatus("unknown");
}
