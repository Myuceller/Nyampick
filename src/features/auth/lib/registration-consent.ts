export interface RegistrationConsentInput {
  serviceTermsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  ageOver14Confirmed: boolean;
  marketingAccepted: boolean;
}

interface PendingRegistrationConsent {
  expiresAt: number;
  attemptId: string;
}

const PENDING_REGISTRATION_CONSENT_KEY = "nyampick:pending-registration-consent";
const PENDING_REGISTRATION_CONSENT_TTL_MS = 15 * 60 * 1000;

export class RegistrationConsentSubmissionError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "RegistrationConsentSubmissionError";
    this.status = status;
  }
}

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function isRequiredRegistrationConsentAccepted(
  consent: RegistrationConsentInput | null | undefined
): consent is RegistrationConsentInput {
  return Boolean(
    consent?.serviceTermsAccepted &&
      consent.privacyPolicyAccepted &&
      consent.ageOver14Confirmed
  );
}

export function savePendingRegistrationConsent(attemptId: string) {
  const storage = getSessionStorage();
  if (!storage) {
    throw new Error("회원가입 정보를 저장할 수 없습니다. 다시 시도해주세요.");
  }
  if (!attemptId.trim()) {
    throw new Error("회원가입 정보를 확인하지 못했습니다. 다시 시도해주세요.");
  }
  storage.setItem(
    PENDING_REGISTRATION_CONSENT_KEY,
    JSON.stringify({
      expiresAt: Date.now() + PENDING_REGISTRATION_CONSENT_TTL_MS,
      attemptId,
    } satisfies PendingRegistrationConsent)
  );
  return attemptId;
}

export function getPendingRegistrationConsent(attemptId: string | null) {
  if (!attemptId) return null;
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PENDING_REGISTRATION_CONSENT_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingRegistrationConsent>;
    if (
      typeof pending.attemptId !== "string" ||
      typeof pending.expiresAt !== "number" ||
      pending.expiresAt <= Date.now() ||
      !pending.attemptId.trim()
    ) {
      storage.removeItem(PENDING_REGISTRATION_CONSENT_KEY);
      return null;
    }
    return pending.attemptId === attemptId ? (pending as PendingRegistrationConsent) : null;
  } catch {
    storage.removeItem(PENDING_REGISTRATION_CONSENT_KEY);
    return null;
  }
}

export function clearPendingRegistrationConsent() {
  getSessionStorage()?.removeItem(PENDING_REGISTRATION_CONSENT_KEY);
}

export async function createRegistrationConsentAttempt(
  provider: "google" | "kakao",
  consent: RegistrationConsentInput
) {
  if (!isRequiredRegistrationConsentAccepted(consent)) {
    throw new Error("필수 약관 동의를 확인해주세요.");
  }
  const response = await fetch("/api/auth/registration-attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, consent }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    attemptId?: unknown;
    message?: string;
  };
  if (!response.ok || typeof body.attemptId !== "string" || !body.attemptId.trim()) {
    throw new RegistrationConsentSubmissionError(
      body.message ?? "회원가입 정보를 준비하지 못했습니다.",
      response.status
    );
  }
  return body.attemptId;
}

export async function recordRegistrationConsent(
  accessToken: string,
  attemptId: string
) {
  if (!attemptId.trim()) throw new Error("회원가입 정보를 확인하지 못했습니다.");

  const response = await fetch("/api/auth/registration-consent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ attemptId }),
  });
  if (response.ok) return;

  const body = (await response.json().catch(() => ({}))) as { message?: string };
  throw new RegistrationConsentSubmissionError(
    body.message ?? "약관 동의를 저장하지 못했습니다. 다시 시도해주세요.",
    response.status
  );
}
