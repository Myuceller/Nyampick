# Kakao Social Login Scope

## 현재 앱에서 사용하는 카카오 정보

냠픽의 카카오 로그인은 Supabase OAuth provider를 통해 처리한다.
현재 요청 scope는 다음과 같다.

- `profile_nickname`: 보호자 표시 이름 후보로 사용
- `profile_image`: 프로필 이미지 후보로 사용 가능
- `account_email`: 이메일 기반 계정 중복 방지와 프로필 초기화에 사용

코드 기준으로 읽는 위치:

- `user.email`
- `user.user_metadata.email`
- `user.user_metadata.kakao_account.email`
- `user.user_metadata.kakao_account.profile.nickname`
- `user.user_metadata.kakao_account.profile.profile_image_url`
- `user.user_metadata.kakao_account.profile.thumbnail_image_url`

관련 코드:

- `src/features/auth/lib/social-profile.ts`
- `src/app/api/profile/route.ts`
- `src/features/auth/hooks/use-auth-page.ts`

## 이메일 누락 처리

카카오 계정에서 이메일 제공에 동의하지 않았거나 Kakao 앱 권한에 `account_email`이 없으면
프로필 초기화 단계에서 앱 계정 이메일을 확정할 수 없다.

이 경우 `/api/profile`은 다음 응답을 반환한다.

```json
{
  "code": "KAKAO_EMAIL_REQUIRED",
  "message": "카카오 계정에서 이메일 제공에 동의해 주세요."
}
```

클라이언트는 위 메시지를 사용자에게 표시하고 로그인 폼으로 복귀시킨다.

## 본인인증 가능 범위

현재 구현은 카카오 소셜 로그인이며, 법적 의미의 본인인증이 아니다.

가능한 것:

- 카카오 계정 OAuth 로그인
- 닉네임/프로필 이미지/이메일 동의 정보 수신
- 이메일 기준 기존 계정 중복 방지

이번 범위에서 제외한 것:

- 카카오 싱크 본인확인
- 휴대폰 본인인증
- 실명/생년월일/성별 등 민감 식별 정보 수집
- 외부 본인확인 기관 API 연동

실제 본인인증이 필요해지면 별도 심사, 약관/개인정보 처리방침 개정,
민감 정보 저장 정책, DB 스키마, 로그 마스킹 정책을 함께 설계해야 한다.
