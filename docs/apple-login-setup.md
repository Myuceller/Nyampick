# 냠픽 Apple 로그인 설정

현재 구현 범위는 **iOS 네이티브 Sign in with Apple**이다. 유료 등록을 미룬 동안에는 기본 기능 플래그가 꺼져 있어 버튼과 entitlement가 포함되지 않는다. 나중에 활성화하면 iOS에서는 Apple의 공식 시스템 버튼과 `identityToken`을 사용하고, Android에는 Apple 버튼을 노출하지 않는다. Android·웹 Apple 로그인은 Services ID와 6개월마다 갱신할 client secret이 필요한 별도 OAuth 작업으로 남긴다.

실제 키, `.p8`, client secret, access token은 이 문서나 Git에 기록하지 않는다.

## 코드에 반영된 값

- 운영 iOS Bundle ID: `kr.nyampick.app`
- 개발 기기용 Bundle ID: `kr.nyampick.app.dev`
- 기본 Expo 설정: `ios.usesAppleSignIn: false`
- 출시 기능 플래그: `EXPO_PUBLIC_ENABLE_APPLE_AUTH=true`일 때만 Apple plugin·entitlement·버튼 활성화
- iOS 버튼: `expo-apple-authentication`의 Apple 공식 버튼
- 인증: 매 요청마다 임의 state와 SHA-256 nonce를 만들고 Supabase `signInWithIdToken`으로 검증
- 가입 약관: Google/Kakao와 동일한 15분 일회성 registration attempt 사용

Apple 로그인을 미루는 동안 `apps/mobile/.env`에 값을 추가하지 않는다. 나중에 Apple Developer와 Supabase 설정을 마친 뒤 공개 기능 플래그 `EXPO_PUBLIC_ENABLE_APPLE_AUTH=true`를 추가한다. 이 값은 비밀 키가 아니다.

## 1. Apple Developer에서 입력

독립 development build와 App Store 앱에서 Apple 로그인을 사용하려면 Apple Developer Program 멤버십과 Account Holder 또는 Admin 권한이 필요하다. 무료 Personal Team은 일반 기기 테스트에는 쓸 수 있지만 이 capability를 포함한 배포 설정의 완료 상태로 보지 않는다.

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)로 이동한다.
2. `Identifiers`에서 운영 App ID `kr.nyampick.app`을 새로 만들거나 연다.
3. `Capabilities`에서 **Sign in with Apple**을 선택한다.
4. 처음 만드는 주 App ID라면 **Enable as a primary App ID**로 설정하고 저장한다.
5. `kr.nyampick.app.dev`로 development client를 계속 쓸 경우 이 App ID도 등록한다. Sign in with Apple을 켜고 운영 App ID 그룹에 연결한다.
6. Supabase는 현재 server-to-server notification endpoint를 지원하지 않으므로 해당 항목은 비워둔다.

운영 앱만 먼저 빌드한다면 `kr.nyampick.app`만 등록해도 된다. 현재 `npm run ios:device`는 `APP_VARIANT=development`라서 `kr.nyampick.app.dev` App ID가 필요하다.

## 2. Supabase에서 입력

1. Supabase Dashboard에서 **Authentication → Sign In / Providers → Apple**을 연다.
2. Apple provider를 활성화한다.
3. **Client IDs**에 사용할 네이티브 App ID를 쉼표로 구분해 입력한다.
   - 운영만 사용: `kr.nyampick.app`
   - 운영 + development client: `kr.nyampick.app,kr.nyampick.app.dev`
4. nonce 검증을 끄는 옵션은 활성화하지 않는다.
5. 이메일 없는 사용자 허용 옵션은 활성화하지 않는다. 사용자가 이메일 가리기를 선택하면 Apple relay 이메일로 가입된다.

네이티브 iOS 전용 구현에는 Services ID, Apple OAuth redirect URL, signing key, client secret이 필요하지 않다. 나중에 웹이나 Android에서도 Apple 로그인을 제공할 때만 Services ID와 OAuth 설정을 추가한다.

Expo Go로만 임시 시험할 때는 개발용 Supabase 프로젝트의 Client IDs에 `host.exp.Exponent`가 필요할 수 있다. 이 값은 여러 Expo Go 앱이 공유하므로 운영 Supabase에는 넣지 않고, 실제 검증은 `kr.nyampick.app.dev` development build로 수행한다.

## 3. Supabase SQL 적용

Supabase SQL Editor에서 최신 `docs/supabase-registration-consent.sql`을 실행한다. 기존 DB의 `oauth_registration_attempts_provider_check`가 Google/Kakao만 허용하므로 Apple을 허용하는 constraint migration까지 적용해야 신규 Apple 가입이 완료된다.

실제 운영 계정에서 실행 전 SQL 대상 프로젝트를 다시 확인한다. 실행 결과나 캡처에 사용자 데이터와 키를 남기지 않는다.

## 4. 네이티브 프로젝트 동기화와 빌드

Apple 설정을 모두 마친 날 `apps/mobile/.env`에 다음 공개 플래그를 추가한다.

```dotenv
EXPO_PUBLIC_ENABLE_APPLE_AUTH=true
```

그다음 `apps/mobile`에서 네이티브 프로젝트를 다시 생성하고 설치한다.

```bash
APP_VARIANT=development npx expo prebuild --platform ios
npm run ios:device
```

EAS 빌드에서도 같은 공개 환경 변수를 `true`로 설정한다. 설정 전 기본값은 `false`이며 Apple 버튼과 entitlement가 모두 제외된다.

기존 development client에는 Apple entitlement와 네이티브 모듈이 없으므로 JavaScript 새로고침만으로는 버튼을 검증할 수 없다. 반드시 development client를 다시 빌드·설치한다.

빌드 서명 오류가 나면 Xcode의 `Signing & Capabilities`에서 선택한 Team, Bundle Identifier, `Sign in with Apple` capability가 Apple Developer의 App ID와 일치하는지 확인한다.

## 5. 실제 iPhone QA

- 로그인 화면에서 검은색 Apple 공식 버튼이 보이고 Android에서는 보이지 않는다.
- 회원가입 탭에서 필수 약관 동의 전 Apple 버튼을 누를 수 없다.
- 신규 Apple 가입, 로그인 취소, 재시도, 로그아웃, 앱 재시작 후 세션 복구를 확인한다.
- 이메일 공유와 이메일 가리기를 각각 확인하고, relay 이메일을 실제 이메일처럼 취급한다.
- Apple이 이름을 주는 최초 승인에서 프로필 이름이 저장되는지 확인한다. 두 번째 로그인에서 이름이 `null`이어도 기존 이름이 유지돼야 한다.
- 기존 이메일 계정과 같은 이메일의 Apple 계정이 별도 사용자로 생기거나 다른 사용자 데이터에 연결되지 않는지 확인한다.
- 가입 후 `user_registration_consents`에 provider와 결합된 약관 기록이 생기고 registration attempt가 재사용되지 않는지 확인한다.

## 아직 출시 전에 남은 항목

- Apple 계정으로 회원탈퇴할 때 Apple 토큰 revoke까지 수행하는 서버 흐름
- 실제 iPhone에서 provider 설정·nonce·신규/복귀 사용자 통합 검증
- App Store Connect Privacy와 심사용 계정·설명 업데이트

공식 참고 문서:

- [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Sign in with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign in with Apple capability](https://developer.apple.com/help/account/capabilities/about-sign-in-with-apple/)
- [App Store Review Guidelines 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services)
