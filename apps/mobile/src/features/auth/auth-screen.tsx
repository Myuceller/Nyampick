import { CalendarDays, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles, Users } from "lucide-react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFriendlyAuthError, useAuth } from "@mobile/features/auth/auth-context";
import { mobileConfig } from "@mobile/lib/config";
import { colors, font, radius } from "@mobile/theme";

type Mode = "signin" | "signup";
type LegalDocument = "terms" | "privacy";

const webCanvas = "#d4ede0";
const webInk = "#1a3a28";
// Keeps placeholder and supporting Korean copy readable on the warm input
// surface while remaining visually secondary to entered text.
const webMuted = "#4f6c5d";
const webInput = "#fffdf8";
const webBorder = "#d4ede0";
const webHeaderBorder = "#b8dfc8";
const disabledButton = "#cfd8d3";
const brandArtwork = "https://www.nyampick.kr/icon_main.png";

const onboardingArtwork = [
  "https://www.nyampick.kr/landing-motion/baby.png",
  "https://www.nyampick.kr/landing-motion/calendar.png",
  "https://www.nyampick.kr/landing-motion/family.png",
] as const;

const onboardingArtworkFallbacks = [Sparkles, CalendarDays, Users] as const;

function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <SafeAreaView edges={["top", "bottom"]} style={styles.authSafeArea}>
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.flex}>
      <View style={styles.authCanvas}>
        <View style={styles.authFrame}>
          <View style={styles.authHeader}>
            <Text accessibilityRole="header" style={styles.authHeaderTitle}>{title}</Text>
          </View>
          {children}
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function BrandLockup({ compact = false, dense = false }: { compact?: boolean; dense?: boolean }) {
  const [isArtworkUnavailable, setIsArtworkUnavailable] = useState(false);

  return <View style={[styles.brandLockup, compact ? styles.brandLockupCompact : styles.brandLockupCentered, dense && styles.brandLockupDense]}>
    <View style={[styles.brandMark, compact && styles.brandMarkCompact, dense && styles.brandMarkDense]}>
      {isArtworkUnavailable ? <Sparkles color={colors.surface} size={compact || dense ? 22 : 28} strokeWidth={1.9} /> : <Image accessibilityLabel="냠픽 로고" onError={() => setIsArtworkUnavailable(true)} resizeMode="contain" source={{ uri: brandArtwork }} style={styles.brandArtwork} />}
    </View>
    <Text style={[styles.brandName, compact && styles.brandNameCompact, dense && styles.brandNameDense]}>냠픽</Text>
  </View>;
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoComplete,
  accessibilityLabel,
  maxLength,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoComplete?: "email" | "password" | "new-password" | "one-time-code";
  accessibilityLabel: string;
  maxLength?: number;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return <TextInput
    accessibilityLabel={accessibilityLabel}
    autoCapitalize="none"
    autoCorrect={false}
    autoComplete={autoComplete}
    keyboardType={keyboardType}
    maxLength={maxLength}
    onBlur={() => setIsFocused(false)}
    onChangeText={onChangeText}
    onFocus={() => setIsFocused(true)}
    placeholder={placeholder}
    placeholderTextColor={webMuted}
    style={[styles.input, isFocused && styles.inputFocused]}
    value={value}
  />;
}

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  autoComplete,
  accessibilityLabel,
  visible,
  onToggleVisibility,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoComplete: "password" | "new-password";
  accessibilityLabel: string;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const EyeIcon = visible ? EyeOff : Eye;

  return <View style={[styles.passwordInput, isFocused && styles.inputFocused]}>
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      onBlur={() => setIsFocused(false)}
      onChangeText={onChangeText}
      onFocus={() => setIsFocused(true)}
      placeholder={placeholder}
      placeholderTextColor={webMuted}
      secureTextEntry={!visible}
      style={styles.passwordTextInput}
      value={value}
    />
    <Pressable
      accessibilityLabel={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onToggleVisibility}
      style={styles.eyeButton}
    >
      <EyeIcon color={colors.secondary} size={20} strokeWidth={2.1} />
    </Pressable>
  </View>;
}

function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
  >
    {loading ? <ActivityIndicator color={colors.onGreen} size="small" /> : null}
    <Text style={styles.primaryButtonText}>{label}</Text>
  </Pressable>;
}

function Divider() {
  return <View style={styles.dividerRow}>
    <View style={styles.divider} />
    <Text style={styles.dividerText}>또는</Text>
    <View style={styles.divider} />
  </View>;
}

function SocialButtons({
  disabled,
  isSubmitting,
  isSignup,
  termsConsentRequired = false,
  onKakao,
  onGoogle,
  onApple,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  isSignup: boolean;
  termsConsentRequired?: boolean;
  onKakao: () => void;
  onGoogle: () => void;
  onApple: () => void;
}) {
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const socialButtonsDisabled = disabled || termsConsentRequired;
  const termsConsentHint = termsConsentRequired ? "필수 약관에 동의한 뒤 사용할 수 있어요." : undefined;

  useEffect(() => {
    let active = true;
    if (Platform.OS !== "ios" || !mobileConfig.appleAuthEnabled) return () => {
      active = false;
    };

    void AppleAuthentication.isAvailableAsync().then((available) => {
      if (active) setIsAppleAvailable(available);
    }).catch(() => {
      if (active) setIsAppleAvailable(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return <View style={styles.socialSection}>
    {isAppleAvailable ? <View
      accessibilityHint={termsConsentHint}
      accessibilityState={{ disabled: socialButtonsDisabled }}
      pointerEvents={socialButtonsDisabled ? "none" : "auto"}
      style={[styles.appleButtonFrame, socialButtonsDisabled && styles.socialIconButtonDisabled]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel={isSignup ? "Apple로 시작하기" : "Apple로 로그인"}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={isSignup ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={12}
        onPress={onApple}
        style={styles.appleButton}
      />
    </View> : null}
    <View accessibilityLabel={isSignup ? "소셜 회원가입" : "소셜 로그인"} style={styles.socialRow}>
      <Pressable
        accessibilityLabel={isSignup ? "카카오로 시작하기" : "카카오로 로그인"}
        accessibilityRole="button"
        accessibilityHint={termsConsentHint}
        accessibilityState={{ disabled: socialButtonsDisabled }}
        disabled={socialButtonsDisabled}
        onPress={onKakao}
        style={[styles.socialIconButton, socialButtonsDisabled && styles.socialIconButtonDisabled]}
      >
        <View style={styles.kakaoMark}><Text style={styles.kakaoMarkText}>{isSubmitting ? "…" : "K"}</Text></View>
      </Pressable>
      <Pressable
        accessibilityLabel={isSignup ? "Google로 시작하기" : "Google로 로그인"}
        accessibilityRole="button"
        accessibilityHint={termsConsentHint}
        accessibilityState={{ disabled: socialButtonsDisabled }}
        disabled={socialButtonsDisabled}
        onPress={onGoogle}
        style={[styles.socialIconButton, socialButtonsDisabled && styles.socialIconButtonDisabled]}
      >
        <View style={styles.googleMark}><Text style={styles.googleMarkText}>{isSubmitting ? "…" : "G"}</Text></View>
      </Pressable>
    </View>
    <Text style={[styles.socialCaption, termsConsentRequired && styles.socialCaptionTermsRequired]}>{termsConsentRequired ? "필수 약관에 동의하면 소셜 계정으로 가입할 수 있어요." : isSignup ? "소셜 계정으로 간편하게 시작하기" : "소셜 계정으로 로그인"}</Text>
  </View>;
}

function AgreementRow({
  checked,
  label,
  required = false,
  onPress,
  onView,
}: {
  checked: boolean;
  label: string;
  required?: boolean;
  onPress: () => void;
  onView?: () => void;
}) {
  return <View style={styles.agreementRow}>
    <Pressable
      accessibilityLabel={`${label} ${checked ? "동의함" : "동의하지 않음"}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkboxButton}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Check color={colors.surface} size={14} strokeWidth={3} /> : null}
      </View>
    </Pressable>
    <Text style={styles.agreementText}>
      <Text style={[styles.agreementRequired, !required && styles.agreementOptional]}>[{required ? "필수" : "선택"}] </Text>
      {label}
    </Text>
    {onView ? <Pressable accessibilityLabel={`${label} 내용 보기`} accessibilityRole="button" onPress={onView} style={styles.agreementViewButton}>
      <Text style={styles.agreementViewText}>보기</Text>
    </Pressable> : null}
  </View>;
}

function PasswordRecoveryScreen() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const submit = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      setIsSubmitting(true);
      await auth.updatePassword(password, confirmPassword);
      setNoticeMessage("비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.");
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return <AuthFrame title="비밀번호 재설정">
    <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BrandLockup />
      <Text accessibilityRole="header" style={styles.authTitle}>새 비밀번호를{"\n"}입력해주세요</Text>
      {errorMessage ? <View accessibilityRole="alert" style={styles.errorNotice}><Text style={styles.errorText}>{errorMessage}</Text></View> : null}
      {noticeMessage ? <View accessibilityRole="alert" style={styles.notice}><Text style={styles.noticeText}>{noticeMessage}</Text></View> : null}
      <View style={[styles.formCard, styles.recoveryFormCard]}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>새 비밀번호</Text>
          <PasswordInput accessibilityLabel="새 비밀번호" autoComplete="new-password" onChangeText={setPassword} onToggleVisibility={() => setIsPasswordVisible((current) => !current)} placeholder="영문, 숫자 포함 8자 이상" value={password} visible={isPasswordVisible} />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>새 비밀번호 확인</Text>
          <PasswordInput accessibilityLabel="새 비밀번호 확인" autoComplete="new-password" onChangeText={setConfirmPassword} onToggleVisibility={() => setIsConfirmPasswordVisible((current) => !current)} placeholder="비밀번호를 다시 입력해 주세요" value={confirmPassword} visible={isConfirmPasswordVisible} />
        </View>
        <PrimaryButton disabled={isSubmitting} label={isSubmitting ? "변경 중이에요" : "비밀번호 변경"} loading={isSubmitting} onPress={() => void submit()} />
      </View>
    </ScrollView>
  </AuthFrame>;
}

const onboardingSlides = [
  {
    title: "맛있는 첫걸음, 냠픽",
    descriptionTop: "우리 아이 성장 단계에 딱 맞는",
    descriptionBottom: "이유식 식단을 AI가 추천해드려요.",
  },
  {
    title: "꼼꼼한 기록, 한눈에 확인",
    descriptionTop: "언제 무엇을 얼마나 먹었는지",
    descriptionBottom: "간편하게 기록하고 확인하세요.",
  },
  {
    title: "온 가족이 함께해요",
    descriptionTop: "엄마, 아빠, 할머니까지 공유하여",
    descriptionBottom: "아이의 식단을 공동 관리할 수 있어요.",
  },
] as const;

export function OnboardingScreen() {
  const auth = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isArtworkUnavailable, setIsArtworkUnavailable] = useState(false);
  const [isArtworkLoading, setIsArtworkLoading] = useState(true);
  const completionInFlight = useRef(false);
  const slide = onboardingSlides[currentSlide];
  const ArtworkFallback = onboardingArtworkFallbacks[currentSlide];

  useEffect(() => {
    setIsArtworkUnavailable(false);
    setIsArtworkLoading(true);
  }, [currentSlide]);

  const complete = async () => {
    if (completionInFlight.current) return;
    completionInFlight.current = true;
    try {
      setIsCompleting(true);
      setErrorMessage(null);
      await auth.completeOnboarding();
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      completionInFlight.current = false;
      setIsCompleting(false);
    }
  };

  const next = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide((current) => current + 1);
      return;
    }
    void complete();
  };

  return <SafeAreaView edges={["top", "bottom"]} style={styles.onboardingSafeArea}>
    <ScrollView contentContainerStyle={styles.onboardingContent} showsVerticalScrollIndicator={false}>
      <View style={styles.onboardingHeader}>
        <View>
          <Text style={styles.onboardingEyebrow}>처음 만나는 냠픽</Text>
          <Text accessibilityLiveRegion="polite" style={styles.onboardingProgress}>{currentSlide + 1} / {onboardingSlides.length}</Text>
        </View>
        <Pressable
          accessibilityHint="소개를 마치고 식단 화면으로 이동합니다."
          accessibilityLabel="온보딩 건너뛰기"
          accessibilityRole="button"
          disabled={isCompleting}
          onPress={() => void complete()}
          style={[styles.onboardingSkipButton, isCompleting && styles.disabled]}
        >
          <Text style={styles.onboardingSkipText}>건너뛰기</Text>
        </Pressable>
      </View>
      <View style={styles.onboardingArtworkArea}>
        {isArtworkLoading || isArtworkUnavailable ? <View accessibilityLabel={slide.title} style={styles.onboardingArtworkFallback}><ArtworkFallback color={colors.greenDeep} size={68} strokeWidth={1.5} /></View> : null}
        {!isArtworkUnavailable ? <Image accessibilityLabel={slide.title} onError={() => setIsArtworkUnavailable(true)} onLoadEnd={() => setIsArtworkLoading(false)} onLoadStart={() => setIsArtworkLoading(true)} resizeMode="contain" source={{ uri: onboardingArtwork[currentSlide] }} style={[styles.onboardingArtwork, isArtworkLoading && styles.onboardingArtworkLoading]} /> : null}
      </View>
      <Text accessibilityRole="header" style={styles.onboardingTitle}>{slide.title}</Text>
      <Text style={styles.onboardingDescription}>{slide.descriptionTop}{"\n"}{slide.descriptionBottom}</Text>

      <View style={styles.onboardingFooter}>
        <View style={styles.onboardingDots}>
          {onboardingSlides.map((item, index) => <Pressable
            accessibilityLabel={`${index + 1}번째 온보딩으로 이동`}
            accessibilityRole="button"
            accessibilityState={{ selected: currentSlide === index }}
            key={item.title}
            onPress={() => setCurrentSlide(index)}
            style={styles.onboardingDotHitTarget}
          >
            <View style={[styles.onboardingDot, currentSlide === index && styles.onboardingDotActive]} />
          </Pressable>)}
        </View>
        {errorMessage ? <View accessibilityRole="alert" style={styles.onboardingError}><Text style={styles.errorText}>{errorMessage}</Text></View> : null}
        <View style={styles.onboardingActions}>
          {currentSlide > 0 ? <Pressable accessibilityLabel="이전 슬라이드" accessibilityRole="button" disabled={isCompleting} onPress={() => setCurrentSlide((current) => current - 1)} style={[styles.onboardingBackButton, isCompleting && styles.disabled]}>
            <ChevronLeft color={colors.secondary} size={20} strokeWidth={2} />
            <Text style={styles.onboardingBackText}>이전</Text>
          </Pressable> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isCompleting}
            onPress={next}
            style={[styles.onboardingNextButton, currentSlide === 0 && styles.onboardingNextButtonSolo, isCompleting && styles.primaryButtonDisabled]}
          >
            {isCompleting ? <ActivityIndicator color={colors.onGreen} size="small" /> : null}
            <Text style={styles.onboardingNextText}>{isCompleting ? "시작 준비 중" : currentSlide === onboardingSlides.length - 1 ? "시작하기" : "다음으로"}</Text>
            {currentSlide < onboardingSlides.length - 1 && !isCompleting ? <ChevronRight color={colors.onGreen} size={20} strokeWidth={2} /> : null}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [agreements, setAgreements] = useState({ service: false, privacy: false, age: false, marketing: false });

  const isSignup = mode === "signup";
  const isBusy = isSubmitting || isSendingCode || isVerifying;
  const requiredTermsAccepted = agreements.service && agreements.privacy && agreements.age;
  const signupConsent = {
    serviceTermsAccepted: agreements.service,
    privacyPolicyAccepted: agreements.privacy,
    ageOver14Confirmed: agreements.age,
    marketingAccepted: agreements.marketing,
  };

  if (auth.isPasswordRecovery) return <PasswordRecoveryScreen />;

  const resetMessages = () => {
    setErrorMessage(null);
    setNoticeMessage(null);
  };

  const changeMode = (nextMode: Mode) => {
    resetMessages();
    setMode(nextMode);
    setCode("");
    setVerificationToken(null);
  };

  const updateAgreement = (key: keyof typeof agreements, value: boolean) => {
    setAgreements((current) => ({ ...current, [key]: value }));
  };

  const requestCode = async () => {
    resetMessages();
    try {
      setIsSendingCode(true);
      const result = await auth.requestVerification(email);
      // Do not expose a development verification code in the app UI or device logs.
      setNoticeMessage(result.message);
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    resetMessages();
    try {
      setIsVerifying(true);
      const result = await auth.verifyEmail(email, code);
      setVerificationToken(result.verificationToken);
      setNoticeMessage(result.message);
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const submit = async () => {
    resetMessages();
    if (isSignup && !requiredTermsAccepted) {
      setErrorMessage("필수 약관에 동의해주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (isSignup) {
        await auth.signUp({ email, password, confirmPassword, verificationToken, consent: signupConsent });
      } else {
        await auth.signIn(email, password);
      }
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithSocial = async (provider: "google" | "kakao" | "apple") => {
    resetMessages();
    if (isSignup && !requiredTermsAccepted) {
      setErrorMessage("필수 약관에 동의한 뒤 소셜 계정으로 가입할 수 있어요.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (isSignup) {
        await auth.signInWithSocial(provider, signupConsent);
      } else {
        await auth.signInWithSocial(provider);
      }
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    resetMessages();
    try {
      setIsSubmitting(true);
      await auth.requestPasswordReset(email);
      setNoticeMessage("비밀번호 재설정 메일을 보냈어요.");
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLegalDocument = async (document: LegalDocument) => {
    try {
      await Linking.openURL(`https://www.nyampick.kr/${document}`);
    } catch {
      setErrorMessage("약관 페이지를 열지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return <AuthFrame title={isSignup ? "회원가입" : "로그인"}>
    <ScrollView contentContainerStyle={[styles.authScrollContent, !isSignup && styles.signinScrollContent]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BrandLockup compact={isSignup} dense={!isSignup} />
      <Text accessibilityRole="header" style={[styles.authTitle, !isSignup && styles.signinTitle]}>{isSignup ? "계정을 만들고\n기록을 이어가요" : "다시 만나서\n반가워요"}</Text>

      {auth.configurationError ? <View accessibilityRole="alert" style={styles.configNotice}><Text style={styles.configTitle}>인증 설정이 필요해요.</Text><Text style={styles.configText}>{auth.configurationError}</Text></View> : null}
      {errorMessage || auth.callbackError ? <View accessibilityRole="alert" style={styles.errorNotice}><Text style={styles.errorText}>{errorMessage ?? auth.callbackError}</Text></View> : null}
      {noticeMessage ? <View accessibilityRole="alert" style={styles.notice}><Text style={styles.noticeText}>{noticeMessage}</Text></View> : null}

      <View style={[styles.formCard, !isSignup && styles.signinFormCard]}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>이메일</Text>
          <View style={isSignup ? styles.emailRequestRow : undefined}>
            <View style={isSignup ? styles.emailField : undefined}>
              <FormInput accessibilityLabel="이메일" autoComplete="email" keyboardType="email-address" onChangeText={(value) => { setEmail(value); setVerificationToken(null); }} placeholder="example@email.com" value={email} />
            </View>
            {isSignup ? <Pressable accessibilityRole="button" disabled={isBusy || Boolean(verificationToken)} onPress={() => void requestCode()} style={[styles.requestCodeButton, (isBusy || verificationToken) && styles.disabled]}>
              <Text style={styles.requestCodeButtonText}>{isSendingCode ? "발송 중" : verificationToken ? "완료" : "인증 요청"}</Text>
            </Pressable> : null}
          </View>
          {isSignup ? <Text style={styles.fieldHelp}>비밀번호 찾기와 계정 복구에 필요해요.</Text> : null}
        </View>

        {isSignup ? <View style={styles.fieldGroup}>
          <Text style={styles.label}>이메일 인증번호</Text>
          <View style={styles.emailRequestRow}>
            <View style={styles.emailField}>
              <FormInput accessibilityLabel="이메일 인증번호" autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} onChangeText={(value) => { setCode(value); setVerificationToken(null); }} placeholder="6자리 입력" value={code} />
            </View>
            <Pressable accessibilityRole="button" disabled={isBusy || !code.trim() || Boolean(verificationToken)} onPress={() => void verifyCode()} style={[styles.confirmCodeButton, (isBusy || !code.trim() || verificationToken) && styles.disabled]}>
              <Text style={styles.confirmCodeButtonText}>{verificationToken ? "완료" : isVerifying ? "확인 중" : "확인"}</Text>
            </Pressable>
          </View>
          <Text style={[styles.fieldHelp, verificationToken && styles.fieldHelpVerified]}>{verificationToken ? "이메일 인증이 완료됐어요." : "아직 이메일 인증 전이에요."}</Text>
        </View> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>비밀번호</Text>
          <PasswordInput accessibilityLabel="비밀번호" autoComplete={isSignup ? "new-password" : "password"} onChangeText={setPassword} onToggleVisibility={() => setIsPasswordVisible((current) => !current)} placeholder={isSignup ? "영문, 숫자 포함 8자 이상" : "비밀번호 입력"} value={password} visible={isPasswordVisible} />
        </View>

        {isSignup ? <View style={styles.fieldGroup}>
          <Text style={styles.label}>비밀번호 확인</Text>
          <PasswordInput accessibilityLabel="비밀번호 확인" autoComplete="new-password" onChangeText={setConfirmPassword} onToggleVisibility={() => setIsConfirmPasswordVisible((current) => !current)} placeholder="비밀번호를 다시 입력해 주세요" value={confirmPassword} visible={isConfirmPasswordVisible} />
        </View> : null}

        {!isSignup ? <View style={styles.signinUtilityRow}>
          <Text style={styles.sessionHint}>로그인 상태는 이 기기에 안전하게 저장돼요.</Text>
          <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => void resetPassword()} style={[styles.forgotButton, isBusy && styles.disabled]}>
            <Text style={styles.forgotText}>{isSubmitting ? "메일 발송 중" : "비밀번호 찾기"}</Text>
          </Pressable>
        </View> : null}

        {isSignup ? <><Divider /><SocialButtons disabled={isBusy || Boolean(auth.configurationError)} isSignup onApple={() => void signInWithSocial("apple")} onGoogle={() => void signInWithSocial("google")} onKakao={() => void signInWithSocial("kakao")} isSubmitting={isSubmitting} termsConsentRequired={!requiredTermsAccepted} /></> : null}

        {!isSignup ? <PrimaryButton disabled={isBusy || Boolean(auth.configurationError)} label={isSubmitting ? "로그인 중이에요" : "로그인"} loading={isSubmitting} onPress={() => void submit()} /> : null}
      </View>

      {!isSignup ? <><View style={styles.signinDivider}><Divider /></View><SocialButtons disabled={isBusy || Boolean(auth.configurationError)} isSignup={false} onApple={() => void signInWithSocial("apple")} onGoogle={() => void signInWithSocial("google")} onKakao={() => void signInWithSocial("kakao")} isSubmitting={isSubmitting} /></> : null}

      {isSignup ? <View style={styles.agreementCard}>
        <Pressable
          accessibilityLabel={`약관 전체 ${Object.values(agreements).every(Boolean) ? "동의 해제" : "동의"}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Object.values(agreements).every(Boolean) }}
          onPress={() => {
            const next = !Object.values(agreements).every(Boolean);
            setAgreements({ service: next, privacy: next, age: next, marketing: next });
          }}
          style={styles.agreementAllRow}
        >
          <View style={[styles.checkbox, Object.values(agreements).every(Boolean) && styles.checkboxChecked]}>
            {Object.values(agreements).every(Boolean) ? <Check color={colors.surface} size={14} strokeWidth={3} /> : null}
          </View>
          <Text style={styles.agreementAllText}>약관 전체 동의</Text>
        </Pressable>
        <View style={styles.agreementList}>
          <AgreementRow checked={agreements.service} label="서비스 이용약관 동의" onPress={() => updateAgreement("service", !agreements.service)} onView={() => void openLegalDocument("terms")} required />
          <AgreementRow checked={agreements.privacy} label="개인정보 수집 및 이용 동의" onPress={() => updateAgreement("privacy", !agreements.privacy)} onView={() => void openLegalDocument("privacy")} required />
          <AgreementRow checked={agreements.age} label="만 14세 이상입니다" onPress={() => updateAgreement("age", !agreements.age)} required />
          <AgreementRow checked={agreements.marketing} label="광고성 정보 수신 동의" onPress={() => updateAgreement("marketing", !agreements.marketing)} />
        </View>
      </View> : null}

      {isSignup ? <PrimaryButton disabled={isBusy || Boolean(auth.configurationError)} label={isSubmitting ? "가입 중이에요" : "가입하기"} loading={isSubmitting} onPress={() => void submit()} /> : null}

      <View style={[styles.modeRow, !isSignup && styles.signinModeRow]}>
        <Text style={styles.modeText}>{isSignup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}</Text>
        <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => changeMode(isSignup ? "signin" : "signup")} style={[styles.modeButton, isBusy && styles.disabled]}>
          {isSignup ? <ChevronLeft color={colors.green} size={16} strokeWidth={2.2} /> : null}
          <Text style={styles.modeButtonText}>{isSignup ? "로그인" : "회원가입"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  </AuthFrame>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  authSafeArea: { flex: 1, backgroundColor: webCanvas },
  authCanvas: { flex: 1, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  authFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: colors.greenSubtle,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 8,
  },
  authHeader: { minHeight: 54, alignItems: "center", justifyContent: "center", borderBottomColor: webHeaderBorder, borderBottomWidth: 1, backgroundColor: colors.greenSubtle },
  authHeaderTitle: { color: webInk, fontFamily: font.family, fontSize: 17, fontWeight: "700", lineHeight: 27, letterSpacing: 0 },
  authScrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 32 },
  signinScrollContent: { paddingTop: 16, paddingBottom: 16 },
  brandLockup: { marginBottom: 24 },
  brandLockupCentered: { alignItems: "center", gap: 12 },
  brandLockupCompact: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  brandLockupDense: { gap: 8, marginBottom: 16 },
  brandMark: { width: 56, height: 56, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 20, backgroundColor: colors.green, shadowColor: colors.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 3 },
  brandMarkCompact: { width: 44, height: 44, borderRadius: 16 },
  brandMarkDense: { width: 48, height: 48, borderRadius: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 },
  brandArtwork: { width: "94%", height: "94%" },
  brandName: { color: colors.green, fontFamily: font.family, fontSize: 22, fontWeight: "700", lineHeight: 29, letterSpacing: 0 },
  brandNameCompact: { fontSize: 20, lineHeight: 27 },
  brandNameDense: { fontSize: 20, lineHeight: 27 },
  authTitle: { color: webInk, fontFamily: font.family, fontSize: 28, fontWeight: "700", lineHeight: 36, letterSpacing: 0, marginBottom: 20 },
  signinTitle: { fontSize: 26, lineHeight: 34, marginBottom: 16 },
  formCard: { borderWidth: 1, borderColor: webBorder, borderRadius: radius.xl, backgroundColor: colors.surface, padding: 16, shadowColor: colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  signinFormCard: { padding: 12 },
  recoveryFormCard: { marginTop: 4 },
  fieldGroup: { gap: 8, marginBottom: 16 },
  label: { color: webInk, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  input: { minHeight: 52, borderWidth: 1, borderColor: webBorder, borderRadius: radius.md, color: webInk, backgroundColor: webInput, fontFamily: font.family, fontSize: 16, fontWeight: "500", lineHeight: 25, letterSpacing: 0, paddingHorizontal: 14, paddingVertical: 12 },
  inputFocused: { borderColor: colors.green, backgroundColor: colors.surface, shadowColor: colors.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 1 },
  passwordInput: { minHeight: 52, position: "relative", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: webBorder, borderRadius: radius.md, backgroundColor: webInput },
  passwordTextInput: { flex: 1, minHeight: 50, color: webInk, fontFamily: font.family, fontSize: 16, fontWeight: "500", lineHeight: 25, letterSpacing: 0, paddingLeft: 14, paddingRight: 52, paddingVertical: 12 },
  eyeButton: { position: "absolute", right: 0, width: 52, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  emailRequestRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emailField: { flex: 1 },
  requestCodeButton: { width: 92, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.green },
  requestCodeButtonText: { color: colors.onGreen, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  confirmCodeButton: { width: 72, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.greenTint },
  confirmCodeButtonText: { color: colors.greenDeep, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  fieldHelp: { color: webMuted, fontFamily: font.family, fontSize: 12, fontWeight: "500", lineHeight: 19, letterSpacing: 0, marginTop: -2 },
  fieldHelpVerified: { color: colors.greenDeep },
  signinUtilityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: -4, marginBottom: 8 },
  sessionHint: { flex: 1, color: "#4a7a60", fontFamily: font.family, fontSize: 12, fontWeight: "500", lineHeight: 19, letterSpacing: 0 },
  forgotButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  forgotText: { color: colors.green, fontFamily: font.family, fontSize: 12, fontWeight: "700", lineHeight: 19, letterSpacing: 0 },
  primaryButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, backgroundColor: colors.green, shadowColor: colors.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 2 },
  primaryButtonDisabled: { backgroundColor: disabledButton, shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { color: colors.onGreen, fontFamily: font.family, fontSize: font.body, fontWeight: "700", lineHeight: 26, letterSpacing: 0 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  signinDivider: { marginVertical: -4 },
  divider: { flex: 1, height: 1, backgroundColor: webBorder },
  dividerText: { color: webMuted, fontFamily: font.family, fontSize: 12, fontWeight: "500", lineHeight: 19, letterSpacing: 0 },
  socialSection: { alignItems: "center", gap: 8 },
  appleButtonFrame: { width: 220, height: 44 },
  appleButton: { width: 220, height: 44 },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  socialIconButton: { width: 52, minHeight: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: webBorder, borderRadius: 16, backgroundColor: colors.surface, shadowColor: colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  socialIconButtonDisabled: { borderColor: colors.border, backgroundColor: colors.surfaceAlt, shadowOpacity: 0, elevation: 0, opacity: 0.55 },
  kakaoMark: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#fee500" },
  kakaoMarkText: { color: "#191600", fontFamily: font.family, fontSize: 13, fontWeight: "700", lineHeight: 18, letterSpacing: 0 },
  googleMark: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d8dde3", borderRadius: 13, backgroundColor: colors.surface },
  googleMarkText: { color: "#4285f4", fontFamily: font.family, fontSize: 13, fontWeight: "700", lineHeight: 18, letterSpacing: 0 },
  socialCaption: { color: webMuted, fontFamily: font.family, fontSize: 12, fontWeight: "500", lineHeight: 19, letterSpacing: 0 },
  socialCaptionTermsRequired: { color: colors.secondary, textAlign: "center" },
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  signinModeRow: { marginTop: 12 },
  modeText: { color: webMuted, fontFamily: font.family, fontSize: font.caption, fontWeight: "500", lineHeight: 20, letterSpacing: 0 },
  modeButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 8 },
  modeButtonText: { color: colors.green, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  disabled: { opacity: 0.45 },
  errorNotice: { marginBottom: 12, borderWidth: 1, borderColor: "#f3c8c8", borderRadius: 16, backgroundColor: colors.surface, padding: 16 },
  errorText: { color: "#d34a4a", fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  notice: { marginBottom: 12, borderWidth: 1, borderColor: "#c7e8d8", borderRadius: 16, backgroundColor: colors.surface, padding: 16 },
  noticeText: { color: colors.greenDeep, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  configNotice: { marginBottom: 12, borderWidth: 1, borderColor: webHeaderBorder, borderRadius: 16, backgroundColor: colors.surface, padding: 16 },
  configTitle: { color: webInk, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  configText: { color: colors.secondary, fontFamily: font.family, fontSize: font.caption, fontWeight: "400", lineHeight: 21, letterSpacing: 0, marginTop: 4 },
  agreementCard: { overflow: "hidden", marginTop: 16, borderWidth: 1, borderColor: webBorder, borderRadius: radius.xl, backgroundColor: colors.surface, shadowColor: colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  agreementAllRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.greenTint, paddingHorizontal: 16 },
  agreementAllText: { color: webInk, fontFamily: font.family, fontSize: 14, fontWeight: "700", lineHeight: 22, letterSpacing: 0 },
  agreementList: { paddingHorizontal: 16, paddingVertical: 4 },
  agreementRow: { minHeight: 52, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#eef5f1" },
  checkboxButton: { width: 40, minHeight: 44, alignItems: "flex-start", justifyContent: "center" },
  checkbox: { width: 20, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#b8d6c7", borderRadius: 6, backgroundColor: colors.surface },
  checkboxChecked: { borderColor: colors.green, backgroundColor: colors.green },
  agreementText: { flex: 1, color: "#31513f", fontFamily: font.family, fontSize: font.caption, fontWeight: "600", lineHeight: 20, letterSpacing: 0 },
  agreementRequired: { color: "#ef7d55", fontWeight: "700" },
  agreementOptional: { color: webMuted },
  agreementViewButton: { minHeight: 44, justifyContent: "center", paddingLeft: 8 },
  agreementViewText: { color: colors.green, fontFamily: font.family, fontSize: 12, fontWeight: "700", lineHeight: 19, letterSpacing: 0 },
  onboardingSafeArea: { flex: 1, backgroundColor: "#fdfefe" },
  onboardingContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  onboardingHeader: { width: "100%", minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  onboardingEyebrow: { color: colors.foreground, fontFamily: font.family, fontSize: 17, fontWeight: "700", lineHeight: 27, letterSpacing: 0 },
  onboardingProgress: { color: colors.secondary, fontFamily: font.family, fontSize: font.caption, fontWeight: "500", lineHeight: 20, letterSpacing: 0, marginTop: 2 },
  onboardingSkipButton: { minWidth: 76, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderRadius: radius.md },
  onboardingSkipText: { color: colors.greenDeep, fontFamily: font.family, fontSize: font.caption, fontWeight: "700", lineHeight: 20, letterSpacing: 0 },
  onboardingArtworkArea: { width: 280, maxWidth: "100%", height: 236, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  onboardingArtwork: { width: "100%", height: "100%" },
  onboardingArtworkLoading: { opacity: 0 },
  onboardingArtworkFallback: { position: "absolute", width: 168, height: 168, alignItems: "center", justifyContent: "center", borderRadius: 84, backgroundColor: colors.greenTint },
  onboardingTitle: { color: "#4a4a4a", fontFamily: font.family, fontSize: 24, fontWeight: "700", lineHeight: 31, letterSpacing: 0, textAlign: "center" },
  onboardingDescription: { color: "#777777", fontFamily: font.family, fontSize: font.body, fontWeight: "400", lineHeight: 26, letterSpacing: 0, textAlign: "center", marginTop: 12 },
  onboardingFooter: { width: "100%", alignItems: "center", marginTop: "auto" },
  onboardingDots: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  onboardingDotHitTarget: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  onboardingDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: "#eeeeee" },
  onboardingDotActive: { width: 24, backgroundColor: colors.green },
  onboardingError: { width: "100%", marginBottom: 12, borderWidth: 1, borderColor: "#f3c8c8", borderRadius: radius.md, backgroundColor: colors.surface, padding: 12 },
  onboardingActions: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  onboardingBackButton: { width: 92, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  onboardingBackText: { color: colors.secondary, fontFamily: font.family, fontSize: font.body, fontWeight: "700", lineHeight: 26, letterSpacing: 0 },
  onboardingNextButton: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, backgroundColor: colors.green, shadowColor: colors.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 2 },
  onboardingNextButtonSolo: { flexGrow: 0, flexShrink: 0, width: "100%" },
  onboardingNextText: { color: colors.onGreen, fontFamily: font.family, fontSize: font.body, fontWeight: "700", lineHeight: 26, letterSpacing: 0 },
});
