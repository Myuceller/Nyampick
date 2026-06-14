import assert from "node:assert/strict";
import test from "node:test";
import { validateAuthForm } from "../src/features/auth/lib/auth-form-validation.ts";

test("validateAuthForm requires matching signup passwords", () => {
  assert.equal(
    validateAuthForm({
      mode: "signup",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password456",
    }),
    "비밀번호가 서로 일치하지 않습니다."
  );
});

test("validateAuthForm accepts matching signup passwords", () => {
  assert.equal(
    validateAuthForm({
      mode: "signup",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    }),
    null
  );
});
