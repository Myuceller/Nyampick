"use client";

import { useEffect, useState } from "react";
import { Onboarding } from "@/components/features/onboarding/onboarding";
import { useAuthPage } from "@/features/auth/hooks/use-auth-page";
import { AuthFormView } from "@/features/auth/ui/auth-form-view";
import { AuthLoadingView } from "@/features/auth/ui/auth-loading-view";
import { ReferralSurveyView } from "@/features/auth/ui/referral-survey-view";
import { getCachedHasSession } from "@/lib/auth-session-cache";

export default function AuthPage() {
  const vm = useAuthPage();
  const [hasMounted, setHasMounted] = useState(false);
  const cachedHasSession = hasMounted ? getCachedHasSession() : false;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (vm.screenMode === "loading") {
    if (cachedHasSession) {
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

  if (vm.screenMode === "referral") {
    return (
      <ReferralSurveyView
        onComplete={(source) => {
          void vm.completeReferralSurvey(source);
        }}
      />
    );
  }

  return (
    <AuthFormView
      mode={vm.mode}
      email={vm.email}
      password={vm.password}
      confirmPassword={vm.confirmPassword}
      verificationCode={vm.verificationCode}
      verificationToken={vm.verificationToken}
      isRequestingVerification={vm.isRequestingVerification}
      isVerifyingEmail={vm.isVerifyingEmail}
      verificationRetryAfter={vm.verificationRetryAfter}
      verificationNotice={vm.verificationNotice}
      devVerificationCode={vm.devVerificationCode}
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
      onSetVerificationCode={vm.setVerificationCode}
      onRequestEmailVerification={() => {
        void vm.requestEmailVerification();
      }}
      onVerifyEmailCode={() => {
        void vm.verifyEmailCode();
      }}
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
