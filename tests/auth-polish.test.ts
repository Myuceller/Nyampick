import assert from "node:assert/strict";
import test from "node:test";
import { isReferralSource, REFERRAL_OPTIONS } from "../src/constants/referral.ts";
import {
  AUTH_POLICY_CONTENT,
  REQUIRED_AUTH_POLICY_KEYS,
} from "../src/constants/terms.ts";
import {
  areRequiredSignupTermsAccepted,
  getSignupTermsValidationMessage,
} from "../src/features/auth/lib/auth-terms.ts";
import {
  readAuthUserDisplayName,
  readAuthUserEmail,
  readAuthUserProfileImage,
  requiresKakaoEmailConsent,
} from "../src/features/auth/lib/social-profile.ts";

test("signup terms require service and privacy consent", () => {
  assert.equal(
    areRequiredSignupTermsAccepted({ service: false, privacy: true, age: true }),
    false
  );
  assert.equal(
    getSignupTermsValidationMessage({ service: true, privacy: false, age: true }),
    "필수 약관에 동의해 주세요."
  );
  assert.equal(
    areRequiredSignupTermsAccepted({ service: true, privacy: true, age: true }),
    true
  );
});

test("auth policy content is separated and includes required policies", () => {
  assert.deepEqual([...REQUIRED_AUTH_POLICY_KEYS], ["service", "privacy"]);
  assert.ok(AUTH_POLICY_CONTENT.service.sections.length > 0);
  assert.ok(AUTH_POLICY_CONTENT.privacy.sections.length > 0);
});

test("referral options match onboarding survey values", () => {
  assert.deepEqual(
    REFERRAL_OPTIONS.map((option) => option.label),
    ["지인 추천", "검색", "SNS", "커뮤니티", "기타"]
  );
  assert.equal(isReferralSource("search"), true);
  assert.equal(isReferralSource("store"), false);
});

test("kakao profile helper reads email, nickname, and profile image", () => {
  const user = {
    app_metadata: { provider: "kakao" },
    user_metadata: {
      kakao_account: {
        email: "KAKAO@example.com",
        profile: {
          nickname: "카카오동규",
          profile_image_url: "https://example.com/profile.png",
        },
      },
    },
  };

  assert.equal(readAuthUserEmail(user), "KAKAO@example.com");
  assert.equal(readAuthUserDisplayName(user), "카카오동규");
  assert.equal(readAuthUserProfileImage(user), "https://example.com/profile.png");
  assert.equal(requiresKakaoEmailConsent(user), false);
});

test("kakao login requires email consent when email is missing", () => {
  assert.equal(
    requiresKakaoEmailConsent({
      app_metadata: { provider: "kakao" },
      user_metadata: { kakao_account: { profile: { nickname: "이메일 없음" } } },
    }),
    true
  );
  assert.equal(
    requiresKakaoEmailConsent({
      app_metadata: { provider: "google" },
      user_metadata: {},
    }),
    false
  );
});
