export type MobileEntryScreen = "loading" | "auth" | "onboarding" | "app";

export type MobileEntryState = {
  authStatus: "loading" | "configured" | "missing-config";
  isAuthenticated: boolean;
  isOnboardingRequired: boolean;
  isPasswordRecovery: boolean;
};

export function resolveMobileEntryScreen({
  authStatus,
  isAuthenticated,
  isOnboardingRequired,
  isPasswordRecovery,
}: MobileEntryState): MobileEntryScreen {
  if (authStatus === "loading") return "loading";
  if (!isAuthenticated || isPasswordRecovery) return "auth";
  if (isOnboardingRequired) return "onboarding";
  return "app";
}
