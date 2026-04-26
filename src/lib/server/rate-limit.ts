type RateLimitAction = "recipes" | "ocr";

interface CounterState {
  count: number;
  resetAt: number;
}

interface DailyTokenState {
  tokens: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  retryAfterSeconds?: number;
}

interface ConsumeAttemptInput {
  userId: string;
  ip: string;
  action: RateLimitAction;
}

interface ConsumeTokenBudgetInput {
  userId: string;
  tokens: number;
}

const USER_MINUTE_LIMITS: Record<RateLimitAction, number> = {
  recipes: 5,
  ocr: 3,
};

const USER_DAILY_LIMITS: Record<RateLimitAction, number> = {
  recipes: 100,
  ocr: 30,
};

const USER_DAILY_TOKEN_BUDGET = 50_000;
const IP_MINUTE_LIMIT_ALL_AI = 20;
const FAILURE_COOLDOWN_THRESHOLD = 5;
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const COUNTERS = new Map<string, CounterState>();
const DAILY_TOKENS = new Map<string, DailyTokenState>();
const FAILURE_STREAK = new Map<string, number>();
const COOLDOWN_UNTIL = new Map<string, number>();

function nowMs() {
  return Date.now();
}

function cleanupExpiredCounter(key: string, now: number) {
  const state = COUNTERS.get(key);
  if (!state) return;
  if (now >= state.resetAt) {
    COUNTERS.delete(key);
  }
}

function cleanupExpiredTokens(key: string, now: number) {
  const state = DAILY_TOKENS.get(key);
  if (!state) return;
  if (now >= state.resetAt) {
    DAILY_TOKENS.delete(key);
  }
}

function getOrInitCounter(key: string, windowMs: number, now: number): CounterState {
  cleanupExpiredCounter(key, now);
  const existing = COUNTERS.get(key);
  if (existing) return existing;

  const created: CounterState = {
    count: 0,
    resetAt: now + windowMs,
  };
  COUNTERS.set(key, created);
  return created;
}

function consumeCounter(
  key: string,
  windowMs: number,
  limit: number,
  now: number
): RateLimitResult {
  const counter = getOrInitCounter(key, windowMs, now);
  if (counter.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((counter.resetAt - now) / 1000)),
    };
  }
  counter.count += 1;
  return { allowed: true };
}

function getFailureKey(input: { userId: string; action: RateLimitAction }) {
  return `fail:${input.userId}:${input.action}`;
}

function getCooldownKey(input: { userId: string; action: RateLimitAction }) {
  return `cooldown:${input.userId}:${input.action}`;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function consumeAiAttempt(input: ConsumeAttemptInput): RateLimitResult {
  const now = nowMs();
  const cooldownKey = getCooldownKey({ userId: input.userId, action: input.action });
  const cooldownUntil = COOLDOWN_UNTIL.get(cooldownKey);
  if (cooldownUntil && now < cooldownUntil) {
    return {
      allowed: false,
      message: "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      retryAfterSeconds: Math.max(1, Math.ceil((cooldownUntil - now) / 1000)),
    };
  }
  if (cooldownUntil && now >= cooldownUntil) {
    COOLDOWN_UNTIL.delete(cooldownKey);
  }

  const userMinuteKey = `rl:user:${input.userId}:${input.action}:minute`;
  const minuteResult = consumeCounter(
    userMinuteKey,
    MINUTE_MS,
    USER_MINUTE_LIMITS[input.action],
    now
  );
  if (!minuteResult.allowed) {
    return {
      allowed: false,
      message: "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      retryAfterSeconds: minuteResult.retryAfterSeconds,
    };
  }

  const userDailyKey = `rl:user:${input.userId}:${input.action}:day`;
  const dailyResult = consumeCounter(
    userDailyKey,
    DAY_MS,
    USER_DAILY_LIMITS[input.action],
    now
  );
  if (!dailyResult.allowed) {
    return {
      allowed: false,
      message: "오늘 사용 가능한 요청 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.",
      retryAfterSeconds: dailyResult.retryAfterSeconds,
    };
  }

  const ipMinuteKey = `rl:ip:${input.ip}:ai:minute`;
  const ipResult = consumeCounter(ipMinuteKey, MINUTE_MS, IP_MINUTE_LIMIT_ALL_AI, now);
  if (!ipResult.allowed) {
    return {
      allowed: false,
      message: "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      retryAfterSeconds: ipResult.retryAfterSeconds,
    };
  }

  return { allowed: true };
}

export function consumeUserDailyTokenBudget(
  input: ConsumeTokenBudgetInput
): RateLimitResult {
  const now = nowMs();
  const key = `token:${input.userId}:day`;
  cleanupExpiredTokens(key, now);

  const state = DAILY_TOKENS.get(key) ?? {
    tokens: 0,
    resetAt: now + DAY_MS,
  };
  if (!DAILY_TOKENS.has(key)) {
    DAILY_TOKENS.set(key, state);
  }

  if (state.tokens + input.tokens > USER_DAILY_TOKEN_BUDGET) {
    return {
      allowed: false,
      message: "오늘 사용 가능한 AI 토큰 예산을 모두 사용했습니다. 내일 다시 시도해주세요.",
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }

  state.tokens += input.tokens;
  return { allowed: true };
}

export function registerAiSuccess(input: {
  userId: string;
  action: RateLimitAction;
}) {
  const failureKey = getFailureKey(input);
  FAILURE_STREAK.delete(failureKey);
}

export function registerAiFailure(input: {
  userId: string;
  action: RateLimitAction;
}) {
  const now = nowMs();
  const failureKey = getFailureKey(input);
  const cooldownKey = getCooldownKey(input);
  const nextFailure = (FAILURE_STREAK.get(failureKey) ?? 0) + 1;
  FAILURE_STREAK.set(failureKey, nextFailure);

  if (nextFailure >= FAILURE_COOLDOWN_THRESHOLD) {
    COOLDOWN_UNTIL.set(cooldownKey, now + FAILURE_COOLDOWN_MS);
    FAILURE_STREAK.set(failureKey, 0);
  }
}
