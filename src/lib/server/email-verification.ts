import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const CODE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 20 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 20 * 1000;
const MAX_ATTEMPTS = 5;
const TABLE_NAME = "email_verification_codes";
const RESEND_TIMEOUT_MS = 12_000;

interface VerificationRecord {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  updatedAt: number;
  verifiedAt?: number;
}

const memoryStore = new Map<string, VerificationRecord>();

export class EmailVerificationRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`인증 메일은 ${retryAfterSeconds}초 후 다시 요청할 수 있어요.`);
    this.name = "EmailVerificationRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string) {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function getTokenSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";
}

function signTokenPayload(payload: string) {
  return createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function makeVerificationToken(email: string) {
  const expiresAt = Date.now() + VERIFIED_TTL_MS;
  const nonce = randomUUID();
  const payload = `${email}.${expiresAt}.${nonce}`;
  return `${payload}.${signTokenPayload(payload)}`;
}

export function verifyEmailVerificationToken(emailInput: string, token: string) {
  const email = normalizeEmail(emailInput);
  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [tokenEmail, expiresAtRaw, nonce, signature] = parts;
  if (!tokenEmail || !expiresAtRaw || !nonce || !signature) return false;
  if (tokenEmail !== email) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const payload = `${tokenEmail}.${expiresAtRaw}.${nonce}`;
  return safeEqual(signature, signTokenPayload(payload));
}

function isMissingVerificationTable(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.message?.includes(TABLE_NAME) ||
    error?.message?.includes("does not exist")
  );
}

async function upsertCodeInDb(record: VerificationRecord) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      email: record.email,
      code_hash: record.codeHash,
      expires_at: new Date(record.expiresAt).toISOString(),
      attempts: record.attempts,
      verified_at: null,
      updated_at: new Date(record.updatedAt).toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) {
    if (isMissingVerificationTable(error)) {
      return false;
    }
    throw error;
  }
  return true;
}

async function readCodeFromDb(email: string): Promise<VerificationRecord | null | false> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("email,code_hash,expires_at,attempts,verified_at,updated_at")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    if (isMissingVerificationTable(error)) return false;
    throw error;
  }
  if (!data) return null;

  const row = data as {
    email: string;
    code_hash: string;
    expires_at: string;
    attempts?: number | null;
    verified_at?: string | null;
    updated_at?: string | null;
  };
  return {
    email: row.email,
    codeHash: row.code_hash,
    expiresAt: new Date(row.expires_at).getTime(),
    attempts: row.attempts ?? 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
    verifiedAt: row.verified_at ? new Date(row.verified_at).getTime() : undefined,
  };
}

async function updateAttemptsInDb(email: string, attempts: number) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ attempts, updated_at: new Date().toISOString() })
    .eq("email", email);
  if (error && !isMissingVerificationTable(error)) throw error;
}

async function markVerifiedInDb(email: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("email", email);
  if (error && !isMissingVerificationTable(error)) throw error;
}

export async function createEmailVerificationCode(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const existing = await readCodeFromDb(email);
  const existingRecord = existing === false ? memoryStore.get(email) ?? null : existing;
  if (existingRecord?.updatedAt) {
    const elapsed = Date.now() - existingRecord.updatedAt;
    if (elapsed < REQUEST_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((REQUEST_COOLDOWN_MS - elapsed) / 1000);
      throw new EmailVerificationRateLimitError(retryAfterSeconds);
    }
  }

  const code = String(randomInt(100000, 1000000));
  const record: VerificationRecord = {
    email,
    codeHash: hashCode(email, code),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
    updatedAt: Date.now(),
  };

  const storedInDb = await upsertCodeInDb(record);
  if (!storedInDb) {
    memoryStore.set(email, record);
  }

  return { email, code, expiresInMinutes: Math.floor(CODE_TTL_MS / 60_000) };
}

export async function verifyEmailCode(emailInput: string, codeInput: string) {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  const fromDb = await readCodeFromDb(email);
  const record = fromDb === false ? memoryStore.get(email) ?? null : fromDb;

  if (!record) {
    return { ok: false as const, message: "인증 코드를 먼저 요청해주세요." };
  }
  if (record.expiresAt < Date.now()) {
    return { ok: false as const, message: "인증 코드가 만료되었습니다. 다시 요청해주세요." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, message: "인증 시도 횟수가 초과되었습니다. 다시 요청해주세요." };
  }

  const nextAttempts = record.attempts + 1;
  const matches = safeEqual(record.codeHash, hashCode(email, code));
  if (!matches) {
    record.attempts = nextAttempts;
    if (fromDb === false) {
      memoryStore.set(email, record);
    } else {
      await updateAttemptsInDb(email, nextAttempts);
    }
    return { ok: false as const, message: "인증번호가 올바르지 않습니다." };
  }

  record.verifiedAt = Date.now();
  if (fromDb === false) {
    memoryStore.set(email, record);
  } else {
    await markVerifiedInDb(email);
  }

  return { ok: true as const, token: makeVerificationToken(email) };
}

export async function sendVerificationEmail(input: {
  email: string;
  code: string;
  expiresInMinutes: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || "Nyampick <onboarding@resend.dev>";
  if (!apiKey) {
    return { sent: false, devCode: input.code };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.email,
        subject: "[냠픽] 이메일 인증번호",
        text: `냠픽 이메일 인증번호는 ${input.code} 입니다. ${input.expiresInMinutes}분 안에 입력해주세요.`,
        html: `<p>냠픽 이메일 인증번호는 <strong>${input.code}</strong> 입니다.</p><p>${input.expiresInMinutes}분 안에 입력해주세요.</p>`,
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "인증 이메일 발송에 실패했습니다.");
  }

  return { sent: true, devCode: undefined };
}
