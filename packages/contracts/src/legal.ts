/**
 * Public policy versions are deliberately transport-only constants so the web
 * disclosure, auth UI, and server-side consent audit cannot drift apart.
 */
export const SERVICE_TERMS_VERSION = "2026-05-03";
export const PRIVACY_POLICY_VERSION = "2026-05-03";
export const LEGAL_EFFECTIVE_DATE_KOREAN = "2026년 5월 3일";
export const LEGAL_EFFECTIVE_DATE_DOTTED = "2026.05.03";

/**
 * Accounts created before the consent audit rollout may retain access only
 * when they have no registration marker at all and still own a legacy profile.
 * A later policy version must never be treated as a legacy exemption.
 */
export const REGISTRATION_CONSENT_ROLLOUT_AT = "2026-09-07T00:00:00.000Z";
