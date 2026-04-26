"use client";

import { Onboarding } from "@/components/features/onboarding/onboarding";
import { useAuthPage } from "@/features/auth/hooks/use-auth-page";
import { AuthFormView } from "@/features/auth/ui/auth-form-view";
import { AuthLoadingView } from "@/features/auth/ui/auth-loading-view";

export default function AuthPage() {
  const vm = useAuthPage();

  if (vm.screenMode === "loading") {
    return (
      <AuthLoadingView
        loadingPhase={vm.loadingPhase}
        showLoadingFallback={vm.showLoadingFallback}
        onRetry={() => window.location.reload()}
        onOpenForm={vm.openFormScreen}
      />
    );
  }

  if (vm.screenMode === "onboarding") {
    return <Onboarding onComplete={vm.completeOnboarding} />;
  }

  return (
    <AuthFormView
      mode={vm.mode}
      email={vm.email}
      password={vm.password}
      isBusy={vm.isBusy}
      isSubmitting={vm.isSubmitting}
      isSocialSubmitting={vm.isSocialSubmitting}
      socialProvider={vm.socialProvider}
      isEnvMissing={vm.isEnvMissing}
      errorMessage={vm.errorMessage}
      noticeMessage={vm.noticeMessage}
      onSetMode={vm.setMode}
      onSetEmail={vm.setEmail}
      onSetPassword={vm.setPassword}
      onSubmit={vm.onSubmit}
      onSocialSignIn={(provider) => {
        void vm.signInWithSocial(provider);
      }}
    />
  );
}
