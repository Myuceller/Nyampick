"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getAuthNextPath, hasAuthNextPath } from "@/lib/auth-redirect";
import { setCachedHasSession } from "@/lib/auth-session-cache";
import {
  AuthMode,
  FatalProfileSeedError,
  LoadingPhase,
  RecoverableProfileSeedError,
  ScreenMode,
  SocialProvider,
  clearAuthCallbackParams,
  clearSocialProviderParam,
  ensureProfileSeeded,
  getCanonicalSocialAuthUrl,
  getOAuthRedirectTo,
  getSupabaseOrThrow,
  normalizeAuthEmail,
  readAuthCallbackParams,
  readSocialProviderParam,
  toFriendlyAuthErrorMessage,
  validateAuthForm,
} from "../lib/auth-utils";

export function useAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [screenMode, setScreenMode] = useState<ScreenMode>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isEnvMissing, setIsEnvMissing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("session");
  const [showLoadingFallback, setShowLoadingFallback] = useState(false);
  const [canRetryProfileSeed, setCanRetryProfileSeed] = useState(false);
  const isProcessingCallbackRef = useRef(false);
  const isFinalizingSessionRef = useRef(false);
  const autoStartedSocialRef = useRef(false);
  const lastSessionRef = useRef<Session | null>(null);
  const isBusy = isSubmitting || isSocialSubmitting;

  useEffect(() => {
    if (screenMode !== "loading") {
      setShowLoadingFallback(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLoadingFallback(true);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [screenMode]);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof getSupabaseOrThrow>;

    try {
      supabase = getSupabaseOrThrow();
    } catch {
      setIsEnvMissing(true);
      setScreenMode("form");
      return;
    }

    const finalizeSession = async (session: Session | null) => {
      if (!active) return;
      if (!session) {
        setCachedHasSession(false);
        setLoadingPhase("session");
        if (hasAuthNextPath()) {
          setNoticeMessage("다시 로그인하면 이전 화면으로 돌아갑니다.");
        }
        setScreenMode("form");
        return;
      }
      if (isFinalizingSessionRef.current) return;
      isFinalizingSessionRef.current = true;
      setCachedHasSession(true);
      lastSessionRef.current = session;
      setLoadingPhase("profile");

      try {
        await ensureProfileSeeded(session.access_token);
      } catch (error) {
        if (active) {
          setErrorMessage(toFriendlyAuthErrorMessage(error));
          setCanRetryProfileSeed(error instanceof RecoverableProfileSeedError);
          setScreenMode("form");
          if (error instanceof FatalProfileSeedError) {
            await supabase.auth.signOut();
            setCachedHasSession(false);
            lastSessionRef.current = null;
          }
        }
        return;
      } finally {
        isFinalizingSessionRef.current = false;
      }

      if (!active) return;
      if (session.user.user_metadata?.onboarding_completed === true) {
        setLoadingPhase("redirect");
        router.replace(getAuthNextPath());
        return;
      }

      setLoadingPhase("onboarding");
      setScreenMode("onboarding");
    };

    const syncScreenFromSession = async () => {
      if (typeof window !== "undefined") {
        if (isProcessingCallbackRef.current) return;
        isProcessingCallbackRef.current = true;

        const callback = readAuthCallbackParams();

        try {
          if (callback.authCode) {
            setLoadingPhase("oauth");
            const { data, error } = await supabase.auth.exchangeCodeForSession(callback.authCode);
            if (error) {
              if (!active) return;
              setErrorMessage(toFriendlyAuthErrorMessage(error));
              setScreenMode("form");
              return;
            }
            if (data.session) {
              await finalizeSession(data.session);
              return;
            }
          } else if (callback.hashAccessToken && callback.hashRefreshToken) {
            setLoadingPhase("oauth");
            const { data, error } = await supabase.auth.setSession({
              access_token: callback.hashAccessToken,
              refresh_token: callback.hashRefreshToken,
            });
            if (error) {
              if (!active) return;
              setErrorMessage(toFriendlyAuthErrorMessage(error));
              setScreenMode("form");
              return;
            }
            if (data.session) {
              await finalizeSession(data.session);
              return;
            }
          }
        } finally {
          if (callback.hasCallback) clearAuthCallbackParams();
          isProcessingCallbackRef.current = false;
        }

        if (callback.oauthError && active) {
          setErrorMessage(
            toFriendlyAuthErrorMessage(
              new Error(decodeURIComponent(callback.oauthError.replace(/\+/g, " ")))
            )
          );
          setScreenMode("form");
          return;
        }
      }

      setLoadingPhase("session");
      const { data } = await supabase.auth.getSession();
      await finalizeSession(data.session);
    };

    void syncScreenFromSession();

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      void finalizeSession(session);
    });

    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);
    setCanRetryProfileSeed(false);

    const validationMessage = validateAuthForm({ mode, email, password, confirmPassword });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    let supabase: ReturnType<typeof getSupabaseOrThrow>;
    try {
      supabase = getSupabaseOrThrow();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizeAuthEmail(email),
          password,
        });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizeAuthEmail(email),
        password,
        options: {
          data: {
            onboarding_completed: false,
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        setNoticeMessage("회원가입이 완료되었습니다. 이메일 인증 후 다시 로그인해주세요.");
        setMode("signin");
      }
    } catch (error) {
      setErrorMessage(toFriendlyAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryProfileSeed = async () => {
    setErrorMessage(null);
    setCanRetryProfileSeed(false);
    const session = lastSessionRef.current;
    if (!session) {
      setScreenMode("loading");
      return;
    }
    setLoadingPhase("profile");
    await ensureProfileSeeded(session.access_token)
      .then(() => {
        if (session.user.user_metadata?.onboarding_completed === true) {
          setCachedHasSession(true);
          router.replace(getAuthNextPath());
          return;
        }
        setCachedHasSession(true);
        setScreenMode("onboarding");
      })
      .catch((error) => {
        setErrorMessage(toFriendlyAuthErrorMessage(error));
        if (error instanceof RecoverableProfileSeedError) {
          setCanRetryProfileSeed(true);
          setScreenMode("form");
          return;
        }
        setScreenMode("form");
      });
  };

  const completeOnboarding = async () => {
    let supabase: ReturnType<typeof getSupabaseOrThrow>;
    try {
      supabase = getSupabaseOrThrow();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }

    setErrorMessage(null);
    setCanRetryProfileSeed(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });
      if (error) throw error;
      localStorage.setItem("nyampick:onboarding:done", "true");
      setCachedHasSession(true);
      router.replace(getAuthNextPath());
    } catch (error) {
      setErrorMessage(toFriendlyAuthErrorMessage(error));
    }
  };

  const signInWithSocial = useCallback(async (provider: "google" | "kakao") => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setCanRetryProfileSeed(false);
    let didStartRedirect = false;

    const canonicalAuthUrl = getCanonicalSocialAuthUrl(provider);
    if (canonicalAuthUrl) {
      setIsSocialSubmitting(true);
      setSocialProvider(provider);
      window.location.assign(canonicalAuthUrl);
      return;
    }

    let supabase: ReturnType<typeof getSupabaseOrThrow>;
    try {
      supabase = getSupabaseOrThrow();
    } catch {
      setErrorMessage("Supabase 환경 변수가 누락되었습니다.");
      return;
    }

    try {
      setIsSocialSubmitting(true);
      setSocialProvider(provider);
      const redirectTo = getOAuthRedirectTo();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams:
            provider === "kakao"
              ? { scope: "profile_nickname profile_image account_email" }
              : undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        didStartRedirect = true;
        window.location.assign(data.url);
        return;
      }
      throw new Error("소셜 로그인 URL을 받지 못했습니다.");
    } catch (error) {
      if (
        provider === "kakao" &&
        error instanceof Error &&
        (error.message.includes("KOE205") || error.message.includes("동의 항목"))
      ) {
        setErrorMessage(
          "카카오 동의항목 설정 문제입니다. Supabase Kakao provider의 scope에서 account_email을 제거하거나 Kakao 동의항목에서 이메일을 활성화해주세요."
        );
        return;
      }
      setErrorMessage(toFriendlyAuthErrorMessage(error));
    } finally {
      if (!didStartRedirect) {
        setIsSocialSubmitting(false);
        setSocialProvider(null);
      }
    }
  }, []);

  useEffect(() => {
    if (autoStartedSocialRef.current || screenMode !== "form" || isBusy) return;

    const provider = readSocialProviderParam();
    if (!provider) return;

    autoStartedSocialRef.current = true;
    clearSocialProviderParam();
    void signInWithSocial(provider);
  }, [screenMode, isBusy, signInWithSocial]);

  return {
    mode,
    setMode,
    screenMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    isSocialSubmitting,
    socialProvider,
    errorMessage,
    noticeMessage,
    isEnvMissing,
    loadingPhase,
    showLoadingFallback,
    canRetryProfileSeed,
    isBusy,
    onSubmit,
    completeOnboarding,
    signInWithSocial,
    retryProfileSeed,
    openFormScreen: () => setScreenMode("form"),
  };
}
