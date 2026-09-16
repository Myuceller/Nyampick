import { createHmac } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const RPC_NAME = "consume_email_verification_rate_limit";
const EMAIL_LIMIT_PER_HOUR = 3;
const IP_LIMIT_PER_HOUR = 10;
const WINDOW_SECONDS = 60 * 60;

type RateLimitScope = "email" | "ip";

interface MemoryCounter {
  count: number;
  resetAt: number;
}

const memoryCounters = new Map<string, MemoryCounter>();

export class EmailVerificationRequestRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("인증 요청이 많아요. 잠시 후 다시 시도해주세요.");
    this.name = "EmailVerificationRequestRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class EmailVerificationRateLimitStorageError extends Error {
  constructor() {
    super("인증 요청 보호 설정이 필요합니다. 운영 환경을 확인해주세요.");
    this.name = "EmailVerificationRateLimitStorageError";
  }
}

function isDevelopment() {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

function getRateLimitSecret() {
  return (
    process.env.EMAIL_VERIFICATION_RATE_LIMIT_SECRET ||
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-email-verification-rate-limit"
  );
}

function hashRateLimitKey(value: string) {
  return createHmac("sha256", getRateLimitSecret()).update(value).digest("hex");
}

function readClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isMissingRateLimitStorage(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42883" ||
    message.includes(RPC_NAME) ||
    message.includes("does not exist")
  );
}

function consumeInMemory(scope: RateLimitScope, key: string, limit: number) {
  const now = Date.now();
  const counterKey = `${scope}:${key}`;
  const current = memoryCounters.get(counterKey);
  const state = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_SECONDS * 1000 };
  state.count += 1;
  memoryCounters.set(counterKey, state);

  if (state.count > limit) {
    throw new EmailVerificationRequestRateLimitError(
      Math.max(1, Math.ceil((state.resetAt - now) / 1000))
    );
  }
}

async function consumePersistentLimit(scope: RateLimitScope, key: string, limit: number) {
  const { data, error } = await getSupabaseAdmin().rpc(RPC_NAME, {
    p_scope: scope,
    p_key_hash: hashRateLimitKey(key),
    p_limit: limit,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error) {
    if (isMissingRateLimitStorage(error)) {
      if (isDevelopment()) {
        consumeInMemory(scope, key, limit);
        return;
      }
      throw new EmailVerificationRateLimitStorageError();
    }
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || !("allowed" in result)) {
    throw new EmailVerificationRateLimitStorageError();
  }

  const allowed = result.allowed === true;
  const retryAfterSeconds =
    typeof result.retry_after_seconds === "number" ? result.retry_after_seconds : WINDOW_SECONDS;
  if (!allowed) {
    throw new EmailVerificationRequestRateLimitError(Math.max(1, Math.ceil(retryAfterSeconds)));
  }
}

export async function consumeEmailVerificationRequestLimit(input: {
  email: string;
  request: Request;
}) {
  const email = input.email.trim().toLowerCase();
  const ip = readClientIp(input.request);

  await consumePersistentLimit("ip", ip, IP_LIMIT_PER_HOUR);
  await consumePersistentLimit("email", email, EMAIL_LIMIT_PER_HOUR);
}
