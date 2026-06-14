type AuthMode = "signin" | "signup";

export function validateAuthForm(input: {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword?: string;
}): string | null {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password.trim()) {
    return "이메일과 비밀번호를 입력해주세요.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "이메일 형식을 확인해주세요.";
  }
  if (input.mode === "signup" && input.password.length < 8) {
    return "비밀번호는 8자 이상으로 입력해주세요.";
  }
  if (input.mode === "signup" && input.password !== input.confirmPassword) {
    return "비밀번호가 서로 일치하지 않습니다.";
  }
  return null;
}
