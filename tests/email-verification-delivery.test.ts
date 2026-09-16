import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const emailVerificationSource = readFileSync(
  new URL("../src/lib/server/email-verification.ts", import.meta.url),
  "utf8"
);

test("email verification exposes a development code only behind explicit local-development flags", () => {
  assert.match(
    emailVerificationSource,
    /process\.env\.NODE_ENV === "development"[\s\S]*?process\.env\.ALLOW_DEV_EMAIL_VERIFICATION_CODE === "true"/
  );
  assert.match(
    emailVerificationSource,
    /if \(canExposeDevelopmentVerificationCode\(\)\) \{[\s\S]*?return \{ sent: false, devCode: input\.code \};[\s\S]*?\}/
  );
  assert.match(
    emailVerificationSource,
    /throw new Error\("이메일 인증 발송 설정이 필요합니다\. 운영 환경을 확인해주세요\."\)/
  );
});
