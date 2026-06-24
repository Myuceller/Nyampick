export interface SignupTermsState {
  service: boolean;
  privacy: boolean;
  age?: boolean;
}

export function areRequiredSignupTermsAccepted(terms: SignupTermsState) {
  return terms.service && terms.privacy && terms.age !== false;
}

export function getSignupTermsValidationMessage(terms: SignupTermsState) {
  return areRequiredSignupTermsAccepted(terms) ? "" : "필수 약관에 동의해 주세요.";
}
