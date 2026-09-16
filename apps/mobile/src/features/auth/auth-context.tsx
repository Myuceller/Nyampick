import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { AppState, Linking, Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getAuthedApi,
  MobileApiError,
  postPublicApi,
  requestAuthedApi,
  setMobileApiUnauthorizedHandler,
} from "@mobile/lib/api";
import { getAuthConfigurationError, mobileConfig } from "@mobile/lib/config";
import { getSupabase, getSupabaseInitializationError } from "@mobile/lib/supabase";
import { normalizeEmail, toFriendlyAuthError, validateAuthInput } from "@mobile/features/auth/auth-utils";

WebBrowser.maybeCompleteAuthSession();

type AuthStatus = "loading" | "configured" | "missing-config";
type AuthMode = "signin" | "signup";
type SocialProvider = "google" | "kakao" | "apple";
type RegistrationConsent = {
  serviceTermsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  ageOver14Confirmed: boolean;
  marketingAccepted?: boolean;
};
type AcceptedRegistrationConsent = {
  serviceTermsAccepted: true;
  privacyPolicyAccepted: true;
  ageOver14Confirmed: true;
  marketingAccepted?: boolean;
};
type AuthCallbackParams = {
  code: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  registrationAttempt: string | null;
};
type StoredPendingRegistrationConsent = {
  expiresAt: number;
  attemptId: string;
};

const PENDING_REGISTRATION_CONSENT_KEY = "nyampick.pending-registration-consent";
const PENDING_REGISTRATION_CONSENT_TTL_MS = 15 * 60 * 1000;
const REGISTRATION_ATTEMPT_PARAM = "registration_attempt";

interface AuthContextValue {
  callbackError: string | null;
  completeOnboarding(): Promise<void>;
  configurationError: string | null;
  isAuthenticated: boolean;
  isOnboardingRequired: boolean;
  isPasswordRecovery: boolean;
  session: Session | null;
  status: AuthStatus;
  requestVerification(email: string): Promise<{ devCode?: string; message: string }>;
  verifyEmail(email: string, code: string): Promise<{ message: string; verificationToken: string }>;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: {
    email: string;
    password: string;
    confirmPassword: string;
    verificationToken: string | null;
    consent: RegistrationConsent;
  }): Promise<void>;
  signInWithSocial(provider: SocialProvider, consent?: RegistrationConsent): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  deleteAccount(confirmText: string): Promise<string>;
  signOut(): Promise<void>;
  updatePassword(password: string, confirmPassword: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      getSupabaseInitializationError() ??
        getAuthConfigurationError() ??
        "인증 설정을 확인해주세요."
    );
  }
  return client;
}

function readAuthCallbackParams(url: string): AuthCallbackParams | null {
  try {
    const parsedUrl = new URL(url);
    const isCallbackPath =
      (parsedUrl.hostname === "auth" && parsedUrl.pathname === "/callback") ||
      (!parsedUrl.hostname && parsedUrl.pathname === "/auth/callback");
    if (parsedUrl.protocol !== "nyampick:" || !isCallbackPath) {
      return null;
    }

    const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
    const getParam = (name: string) => parsedUrl.searchParams.get(name) ?? fragmentParams.get(name);

    return {
      code: getParam("code"),
      error: getParam("error"),
      errorCode: getParam("error_code"),
      errorDescription: getParam("error_description"),
      registrationAttempt: getParam(REGISTRATION_ATTEMPT_PARAM),
    };
  } catch {
    return null;
  }
}

function toFriendlySocialCallbackError(params: Pick<AuthCallbackParams, "error" | "errorCode" | "errorDescription">) {
  const raw = [params.error, params.errorCode, params.errorDescription].filter(Boolean).join(" ");
  const normalized = raw.toLowerCase();

  if (normalized.includes("registration_consent_storage")) {
    return "회원가입 약관 동의를 준비하지 못했어요. 다시 시도해주세요.";
  }
  if (normalized.includes("registration_attempt_unavailable")) {
    return "소셜 로그인 보안 정보를 준비하지 못했어요. 다시 시도해주세요.";
  }
  if (normalized.includes("oauth state") || normalized.includes("state mismatch")) {
    return "소셜 로그인 상태 확인에 실패했어요. 다시 시도해주세요.";
  }
  if (normalized.includes("koe205") || normalized.includes("동의 항목") || normalized.includes("consent")) {
    return "카카오 로그인에 필요한 동의 항목 설정을 확인해주세요. 계속되면 고객센터에 문의해주세요.";
  }
  if (normalized.includes("access_denied") || normalized.includes("user denied") || normalized.includes("cancelled") || normalized.includes("canceled")) {
    return "소셜 로그인이 취소되었어요. 다시 시도해주세요.";
  }
  if (
    normalized.includes("redirect_uri_mismatch") ||
    normalized.includes("unauthorized_client") ||
    normalized.includes("invalid_client") ||
    normalized.includes("provider is not enabled") ||
    normalized.includes("unsupported provider")
  ) {
    return "소셜 로그인 설정에 문제가 있어요. 잠시 후 다시 시도해주세요.";
  }
  if (normalized.includes("temporarily_unavailable")) {
    return "소셜 로그인 서비스를 일시적으로 사용할 수 없어요. 잠시 후 다시 시도해주세요.";
  }

  const friendlyError = toFriendlyAuthError(new Error(raw));
  return friendlyError === raw ? "소셜 로그인 처리 중 문제가 발생했어요. 다시 시도해주세요." : friendlyError;
}

function requireRegistrationConsent(consent: RegistrationConsent): AcceptedRegistrationConsent {
  if (!consent.serviceTermsAccepted || !consent.privacyPolicyAccepted || !consent.ageOver14Confirmed) {
    throw new Error("필수 약관에 동의해주세요.");
  }

  return {
    serviceTermsAccepted: true,
    privacyPolicyAccepted: true,
    ageOver14Confirmed: true,
    ...(typeof consent.marketingAccepted === "boolean" ? { marketingAccepted: consent.marketingAccepted } : {}),
  };
}

function parseStoredPendingRegistrationConsent(value: string): StoredPendingRegistrationConsent | null {
  try {
    const parsed = JSON.parse(value) as {
      expiresAt?: unknown;
      attemptId?: unknown;
    };
    if (
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now() ||
      typeof parsed.attemptId !== "string" ||
      !parsed.attemptId.trim()
    ) {
      return null;
    }

    return {
      expiresAt: parsed.expiresAt,
      attemptId: parsed.attemptId,
    };
  } catch {
    return null;
  }
}

function isRegistrationConsentRequired(error: unknown) {
  return error instanceof MobileApiError && error.status === 403 && error.message.includes("필수 약관 동의");
}

function isDuplicateEmailAccount(error: unknown) {
  return error instanceof MobileApiError && error.status === 409;
}

function isAppleAuthenticationCancelled(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
  );
}

function toAppleNameMetadata(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) return null;

  const formattedName = AppleAuthentication.formatFullName(fullName).trim();
  if (!formattedName) return null;

  return {
    full_name: formattedName,
    given_name: fullName.givenName,
    middle_name: fullName.middleName,
    family_name: fullName.familyName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const processedCodesRef = useRef(new Map<string, Promise<void>>());
  const pendingRegistrationConsentRef = useRef<StoredPendingRegistrationConsent | null>(null);
  const matchedPendingRegistrationConsentRef = useRef<string | null>(null);
  const pendingConsentRequestRef = useRef<Promise<void> | null>(null);
  const pendingConsentHydrationRef = useRef<Promise<void> | null>(null);
  const pendingConsentVersionRef = useRef(0);
  const finalizingSessionsRef = useRef(new Map<string, Promise<void>>());
  const activeSessionAccessTokenRef = useRef<string | null>(null);
  const configurationError = getAuthConfigurationError() ?? getSupabaseInitializationError();

  const clearPendingRegistrationConsent = useCallback(async () => {
    pendingConsentVersionRef.current += 1;
    pendingRegistrationConsentRef.current = null;
    matchedPendingRegistrationConsentRef.current = null;
    await SecureStore.deleteItemAsync(PENDING_REGISTRATION_CONSENT_KEY).catch(() => undefined);
  }, []);

  const clearExpiredSession = useCallback(() => {
    setSession(null);
    void clearPendingRegistrationConsent();
    void getSupabase()?.auth.signOut({ scope: "local" }).catch(() => {
      // Clearing React state still returns the user to the login screen when
      // device storage cannot be updated immediately.
    });
  }, [clearPendingRegistrationConsent]);

  useEffect(() => {
    setMobileApiUnauthorizedHandler(clearExpiredSession);
    return () => setMobileApiUnauthorizedHandler(null);
  }, [clearExpiredSession]);

  const hydratePendingRegistrationConsent = useCallback(async () => {
    if (pendingConsentHydrationRef.current) return pendingConsentHydrationRef.current;

    const versionAtStart = pendingConsentVersionRef.current;
    const hydration = (async () => {
      try {
        const stored = await SecureStore.getItemAsync(PENDING_REGISTRATION_CONSENT_KEY);
        if (pendingConsentVersionRef.current !== versionAtStart) return;

        const pending = stored ? parseStoredPendingRegistrationConsent(stored) : null;
        if (pending) {
          pendingRegistrationConsentRef.current = pending;
          return;
        }

        pendingRegistrationConsentRef.current = null;
        if (stored) await SecureStore.deleteItemAsync(PENDING_REGISTRATION_CONSENT_KEY).catch(() => undefined);
      } catch {
        // A failed local read must not grant registration access. The profile
        // endpoint will keep an unconsented identity blocked.
        if (pendingConsentVersionRef.current === versionAtStart) {
          pendingRegistrationConsentRef.current = null;
        }
      }
    })();
    pendingConsentHydrationRef.current = hydration;

    return hydration;
  }, []);

  const persistPendingRegistrationConsent = useCallback(async (
    attemptId: string
  ) => {
    pendingConsentVersionRef.current += 1;
    const payload: StoredPendingRegistrationConsent = {
      expiresAt: Date.now() + PENDING_REGISTRATION_CONSENT_TTL_MS,
      attemptId,
    };
    pendingRegistrationConsentRef.current = payload;
    matchedPendingRegistrationConsentRef.current = null;

    try {
      await SecureStore.setItemAsync(PENDING_REGISTRATION_CONSENT_KEY, JSON.stringify(payload));
    } catch {
      pendingRegistrationConsentRef.current = null;
      matchedPendingRegistrationConsentRef.current = null;
      throw new Error("registration_consent_storage");
    }
  }, []);

  const processAuthRedirect = useCallback(async (url: string) => {
    await hydratePendingRegistrationConsent();
    const client = getSupabase();
    if (!client) return;

    const params = readAuthCallbackParams(url);
    if (!params) return;
    const pendingConsent = pendingRegistrationConsentRef.current;
    if (pendingConsent) {
      if (pendingConsent.attemptId !== params.registrationAttempt) {
        await clearPendingRegistrationConsent();
      } else {
        matchedPendingRegistrationConsentRef.current = pendingConsent.attemptId;
      }
    }
    if (params.error || params.errorCode || params.errorDescription) {
      await clearPendingRegistrationConsent();
      setCallbackError(toFriendlySocialCallbackError(params));
      return;
    }
    if (!params.code) {
      await clearPendingRegistrationConsent();
      setCallbackError("소셜 로그인 결과를 확인하지 못했어요. 다시 시도해주세요.");
      return;
    }

    const code = params.code;
    const existingExchange = processedCodesRef.current.get(code);
    if (existingExchange) return existingExchange;

    const exchange = (async () => {
      try {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          await clearPendingRegistrationConsent();
          setCallbackError(toFriendlySocialCallbackError({ error: error.message, errorCode: null, errorDescription: null }));
          return;
        }
        setCallbackError(null);
      } catch (error) {
        await clearPendingRegistrationConsent();
        const message = error instanceof Error ? error.message : null;
        setCallbackError(toFriendlySocialCallbackError({ error: message, errorCode: null, errorDescription: null }));
      }
    })();
    processedCodesRef.current.set(code, exchange);

    return exchange;
  }, [clearPendingRegistrationConsent, hydratePendingRegistrationConsent]);

  const ensureProfileSeed = useCallback(async (nextSession: Session) => {
    // The server creates the matching app profile and starter data on first access.
    await getAuthedApi("/api/profile", nextSession.access_token);
  }, []);

  const recordPendingRegistrationConsent = useCallback(async (nextSession: Session) => {
    await hydratePendingRegistrationConsent();
    const attemptId = matchedPendingRegistrationConsentRef.current;
    if (!attemptId) return;

    let request = pendingConsentRequestRef.current;
    if (!request) {
      request = requestAuthedApi<void>("/api/auth/registration-consent", nextSession.access_token, {
        method: "POST",
        body: { attemptId },
      });
      pendingConsentRequestRef.current = request;
    }

    try {
      await request;
      await clearPendingRegistrationConsent();
    } finally {
      if (pendingConsentRequestRef.current === request) pendingConsentRequestRef.current = null;
    }
  }, [clearPendingRegistrationConsent, hydratePendingRegistrationConsent]);

  const finalizeSession = useCallback((nextSession: Session | null) => {
    if (!nextSession) {
      activeSessionAccessTokenRef.current = null;
      setSession(null);
      return Promise.resolve();
    }

    const isCurrentSession = () => activeSessionAccessTokenRef.current === nextSession.access_token;
    if (!isCurrentSession()) return Promise.resolve();

    const existingFinalization = finalizingSessionsRef.current.get(nextSession.access_token);
    if (existingFinalization) return existingFinalization;

    const finalization = (async () => {
      try {
        await hydratePendingRegistrationConsent();
        if (!isCurrentSession()) return;
        await recordPendingRegistrationConsent(nextSession);
      } catch {
        if (!isCurrentSession()) return;
        setSession(null);
        setCallbackError("필수 약관 동의를 저장하지 못했어요. 네트워크를 확인한 뒤 다시 시도해주세요.");
        await getSupabase()?.auth.signOut().catch(() => {
          // The local session still remains blocked when remote sign-out is unavailable.
        });
        return;
      }

      try {
        if (!isCurrentSession()) return;
        await ensureProfileSeed(nextSession);
      } catch (error) {
        if (!isCurrentSession()) return;
        if (isRegistrationConsentRequired(error)) {
          setSession(null);
          setCallbackError("회원가입 탭에서 필수 약관에 동의한 뒤 소셜 계정으로 가입해주세요.");
          await getSupabase()?.auth.signOut().catch(() => {
            // The local session still remains blocked when remote sign-out is unavailable.
          });
          return;
        }
        if (isDuplicateEmailAccount(error)) {
          setSession(null);
          setCallbackError("이미 같은 이메일로 가입된 계정이 있어요. 처음 가입한 로그인 방법으로 다시 시도해주세요.");
          await getSupabase()?.auth.signOut().catch(() => {
            // The local session still remains blocked when remote sign-out is unavailable.
          });
          return;
        }
        // Login remains usable when the application API is temporarily unavailable.
        // Feature screens render an actionable retry message for this case.
      }

      if (isCurrentSession()) setSession(nextSession);
    })();
    finalizingSessionsRef.current.set(nextSession.access_token, finalization);
    void finalization.finally(() => {
      if (finalizingSessionsRef.current.get(nextSession.access_token) === finalization) {
        finalizingSessionsRef.current.delete(nextSession.access_token);
      }
    });

    return finalization;
  }, [ensureProfileSeed, hydratePendingRegistrationConsent, recordPendingRegistrationConsent]);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setStatus("missing-config");
      return;
    }

    let active = true;
    let receivedAuthEvent = false;
    let initialSessionResolved = false;
    let initialSessionVersion = 0;
    const resolveInitialSession = (nextSession: Session | null) => {
      const version = ++initialSessionVersion;
      activeSessionAccessTokenRef.current = nextSession?.access_token ?? null;
      void finalizeSession(nextSession).finally(() => {
        if (!active || version !== initialSessionVersion) return;
        initialSessionResolved = true;
        setStatus("configured");
      });
    };

    void client.auth.getSession().then(({ data }) => {
      if (!active || receivedAuthEvent || initialSessionResolved) return;
      resolveInitialSession(data.session);
    }).catch(() => {
      if (!active || receivedAuthEvent || initialSessionResolved) return;
      initialSessionResolved = true;
      setStatus("configured");
    });

    const subscription = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      receivedAuthEvent = true;
      activeSessionAccessTokenRef.current = nextSession?.access_token ?? null;
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") {
        void clearPendingRegistrationConsent();
        setIsPasswordRecovery(false);
      }
      if (!initialSessionResolved) {
        resolveInitialSession(nextSession);
        return;
      }
      setStatus("configured");
      void finalizeSession(nextSession);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void processAuthRedirect(url);
    });
    const linking = Linking.addEventListener("url", ({ url }) => {
      // Kakao can return through Linking before openAuthSessionAsync resolves.
      // processAuthRedirect deduplicates the single-use PKCE code, so the first
      // valid callback wins without dropping the other delivery path.
      void processAuthRedirect(url);
    });
    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    const appleRevokeSubscription = Platform.OS === "ios" && mobileConfig.appleAuthEnabled
      ? AppleAuthentication.addRevokeListener(clearExpiredSession)
      : null;
    client.auth.startAutoRefresh();

    return () => {
      active = false;
      linking.remove();
      appState.remove();
      appleRevokeSubscription?.remove();
      subscription.data.subscription.unsubscribe();
      client.auth.stopAutoRefresh();
    };
  }, [clearPendingRegistrationConsent, finalizeSession, processAuthRedirect]);

  const value = useMemo<AuthContextValue>(() => ({
    callbackError,
    async completeOnboarding() {
      const client = requireClient();
      const { error } = await client.auth.updateUser({ data: { onboarding_completed: true } });
      if (error) throw error;
      const { data, error: refreshError } = await client.auth.refreshSession();
      if (refreshError) throw refreshError;
      setSession(data.session);
    },
    configurationError,
    isAuthenticated: Boolean(session),
    isOnboardingRequired: session ? session.user.user_metadata?.onboarding_completed !== true : false,
    isPasswordRecovery,
    session,
    status,
    async requestVerification(email) {
      const normalizedEmail = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("이메일 형식을 확인해주세요.");
      return postPublicApi("/api/auth/email-verification/request", { email: normalizedEmail });
    },
    async verifyEmail(email, code) {
      if (!code.trim()) throw new Error("인증번호를 입력해주세요.");
      return postPublicApi("/api/auth/email-verification/verify", { email: normalizeEmail(email), code: code.trim() });
    },
    async signIn(email, password) {
      const error = validateAuthInput({ mode: "signin", email, password, confirmPassword: "", verificationToken: null });
      if (error) throw new Error(error);
      await clearPendingRegistrationConsent();
      const { error: signInError } = await requireClient().auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (signInError) throw signInError;
    },
    async signUp(input) {
      const error = validateAuthInput({ mode: "signup", ...input });
      if (error) throw new Error(error);
      const consent = requireRegistrationConsent(input.consent);
      await clearPendingRegistrationConsent();
      await postPublicApi("/api/auth/email-signup", {
        email: normalizeEmail(input.email),
        password: input.password,
        verificationToken: input.verificationToken,
        consent,
      });
      const { error: signInError } = await requireClient().auth.signInWithPassword({ email: normalizeEmail(input.email), password: input.password });
      if (signInError) throw signInError;
    },
    async signInWithSocial(provider, consent) {
      const client = requireClient();
      const acceptedConsent = consent ? requireRegistrationConsent(consent) : null;
      setCallbackError(null);

      try {
        if (provider === "apple") {
          if (!mobileConfig.appleAuthEnabled) {
            throw new Error("Apple 로그인은 준비 중이에요.");
          }
          if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
            throw new Error("이 기기에서는 Apple 로그인을 사용할 수 없어요.");
          }
        }

        let registrationAttempt: string | null = null;
        if (acceptedConsent) {
          const attemptResponse = await postPublicApi<{ attemptId?: unknown }>(
            "/api/auth/registration-attempt",
            { provider, consent: acceptedConsent }
          );
          if (typeof attemptResponse.attemptId !== "string" || !attemptResponse.attemptId.trim()) {
            throw new Error("registration_attempt_unavailable");
          }
          registrationAttempt = attemptResponse.attemptId;
        }
        const redirectTo = AuthSession.makeRedirectUri({
          scheme: "nyampick",
          path: "auth/callback",
          queryParams: registrationAttempt ? { [REGISTRATION_ATTEMPT_PARAM]: registrationAttempt } : undefined,
        });
        if (acceptedConsent) {
          // Preserve only the opaque, short-lived server attempt before opening
          // a browser so an OS restart can still finish the matching OAuth flow.
          await persistPendingRegistrationConsent(registrationAttempt!);
        } else {
          await clearPendingRegistrationConsent();
        }

        if (provider === "apple") {
          if (registrationAttempt) {
            // Native Apple sign-in has no redirect query. Match the locally
            // persisted opaque attempt before Supabase emits SIGNED_IN.
            matchedPendingRegistrationConsentRef.current = registrationAttempt;
          }

          const rawNonce = Crypto.randomUUID();
          const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce
          );
          const requestState = Crypto.randomUUID();
          const credential = await AppleAuthentication.signInAsync({
            nonce: hashedNonce,
            state: requestState,
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (credential.state !== requestState) throw new Error("apple_state_mismatch");
          if (!credential.identityToken) throw new Error("Apple 로그인 결과를 확인하지 못했어요.");

          const { data, error } = await client.auth.signInWithIdToken({
            provider: "apple",
            token: credential.identityToken,
            nonce: rawNonce,
            ...(credential.authorizationCode ? { access_token: credential.authorizationCode } : {}),
          });
          if (error) throw error;
          if (!data.session) throw new Error("Apple 로그인 세션을 확인하지 못했어요.");

          // Native ID-token login may emit SIGNED_IN before this promise
          // resolves. Await the same idempotent finalizer so profile creation
          // cannot race the one-time Apple name update below.
          activeSessionAccessTokenRef.current = data.session.access_token;
          await finalizeSession(data.session);

          const nameMetadata = toAppleNameMetadata(credential.fullName);
          if (nameMetadata) {
            const { error: nameError } = await client.auth.updateUser({ data: nameMetadata });
            if (nameError) {
              // Authentication is already complete. Do not discard a valid
              // session because optional profile metadata could not be
              // synchronized; the user can confirm it in My Page.
              setCallbackError("Apple 계정 이름을 프로필에 저장하지 못했어요. 마이페이지에서 이름을 확인해주세요.");
            } else {
              const { data: currentAuth } = await client.auth.getSession();
              if (currentAuth.session) {
                await ensureProfileSeed(currentAuth.session).catch(() => {
                  // Auth metadata keeps the one-time name for the next profile
                  // seed retry when the application API becomes available.
                });
              }
            }
          }
          return;
        }

        const { data, error } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: provider === "kakao" ? { scope: "profile_nickname profile_image account_email" } : undefined,
          },
        });
        if (error) throw error;
        if (!data.url) throw new Error("소셜 로그인 URL을 준비하지 못했습니다.");

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "cancel" || result.type === "dismiss") {
          // Kakao's native-app handoff can deliver the callback through Linking
          // while the auth-session promise reports dismiss. Keep the short-lived
          // pending attempt so that late callback can still finish safely.
          return;
        }
        if (result.type !== "success") throw new Error("소셜 로그인 화면을 열지 못했습니다.");

        // Never exchange here directly. WebBrowser and Linking callbacks share
        // this idempotent processor because PKCE codes are single-use.
        await processAuthRedirect(result.url);
      } catch (error) {
        await clearPendingRegistrationConsent();
        if (isAppleAuthenticationCancelled(error)) return;
        const message = error instanceof Error ? error.message : null;
        setCallbackError(toFriendlySocialCallbackError({ error: message, errorCode: null, errorDescription: null }));
      }
    },
    async requestPasswordReset(email) {
      const normalizedEmail = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("비밀번호를 재설정할 이메일을 입력해주세요.");
      await clearPendingRegistrationConsent();
      const redirectTo = AuthSession.makeRedirectUri({ scheme: "nyampick", path: "auth/callback" });
      const { error } = await requireClient().auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw error;
    },
    async deleteAccount(confirmText) {
      if (confirmText !== "회원탈퇴") throw new Error("회원탈퇴 확인 문구를 정확히 입력해주세요.");
      if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
      const response = await requestAuthedApi<{ message?: string }>("/api/account", session.access_token, {
        method: "DELETE",
        body: { confirmText },
      });
      await requireClient().auth.signOut().catch(() => {
        // The server can delete the auth user before this client clears its session.
      });
      setSession(null);
      return response.message ?? "회원탈퇴가 완료되었습니다.";
    },
    async signOut() {
      const { error } = await requireClient().auth.signOut();
      if (error) throw error;
    },
    async updatePassword(password, confirmPassword) {
      if (password.length < 8) throw new Error("비밀번호는 8자 이상으로 입력해주세요.");
      if (password !== confirmPassword) throw new Error("비밀번호가 서로 일치하지 않습니다.");
      const client = requireClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      setIsPasswordRecovery(false);
    },
  }), [
    callbackError,
    clearPendingRegistrationConsent,
    configurationError,
    ensureProfileSeed,
    finalizeSession,
    isPasswordRecovery,
    persistPendingRegistrationConsent,
    processAuthRedirect,
    session,
    status,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider 안에서 useAuth를 사용해주세요.");
  return context;
}

export function getFriendlyAuthError(error: unknown) {
  return toFriendlyAuthError(error);
}
