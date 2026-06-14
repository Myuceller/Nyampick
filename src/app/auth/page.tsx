"use client";

import { Onboarding } from "@/components/features/onboarding/onboarding";
import { useAuthPage } from "@/features/auth/hooks/use-auth-page";
import { AuthFormView } from "@/features/auth/ui/auth-form-view";
import { AuthLoadingView } from "@/features/auth/ui/auth-loading-view";
import { getCachedHasSession } from "@/lib/auth-session-cache";

export default function AuthPage() {
  const vm = useAuthPage();

  if (vm.screenMode === "loading") {
    if (getCachedHasSession()) {
      return (
        <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center bg-[#f0faf5]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b8dfc8] border-t-[#57bf8e]" />
        </main>
      );
    }

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
      confirmPassword={vm.confirmPassword}
      isBusy={vm.isBusy}
      isSubmitting={vm.isSubmitting}
      isSocialSubmitting={vm.isSocialSubmitting}
      socialProvider={vm.socialProvider}
      isEnvMissing={vm.isEnvMissing}
      errorMessage={vm.errorMessage}
      noticeMessage={vm.noticeMessage}
      canRetryProfileSeed={vm.canRetryProfileSeed}
      onSetMode={vm.setMode}
      onSetEmail={vm.setEmail}
      onSetPassword={vm.setPassword}
      onSetConfirmPassword={vm.setConfirmPassword}
      onSubmit={vm.onSubmit}
      onSocialSignIn={(provider) => {
        void vm.signInWithSocial(provider);
      }}
      onRetryProfileSeed={() => {
        void vm.retryProfileSeed();
      }}
    />
  );
}
