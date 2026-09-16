export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateAuthInput(input: {
  mode: "signin" | "signup";
  email: string;
  password: string;
  confirmPassword: string;
  verificationToken: string | null;
}) {
  const email = normalizeEmail(input.email);
  if (!email || !input.password) return "이메일과 비밀번호를 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "이메일 형식을 확인해주세요.";
  if (input.mode === "signup" && input.password.length < 8) return "비밀번호는 8자 이상으로 입력해주세요.";
  if (input.mode === "signup" && input.password !== input.confirmPassword) return "비밀번호가 서로 일치하지 않습니다.";
  if (input.mode === "signup" && !input.verificationToken) return "이메일 인증을 완료해 주세요.";
  return null;
}

export function toFriendlyAuthError(error: unknown) {
  const raw = error instanceof Error ? error.message : "인증 처리 중 오류가 발생했습니다.";
  const message = raw.toLowerCase();
  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (message.includes("email not confirmed")) return "이메일 인증 후 로그인해주세요.";
  if (message.includes("user already registered")) return "이미 가입된 이메일입니다.";
  if (message.includes("password should be at least")) return "비밀번호는 8자 이상으로 입력해주세요.";
  if (message.includes("rate limit") || message.includes("too many requests")) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (message.includes("network") || message.includes("failed to fetch")) return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  if (message.includes("code verifier") || message.includes("pkce")) return "소셜 로그인 세션 확인에 실패했습니다. 같은 기기에서 다시 시도해주세요.";
  return raw;
}
