# Deployment ENV Checklist (Vercel/Supabase)

## 1) Required variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (배포 도메인)
- `EMAIL_VERIFICATION_SECRET` (이메일 가입 인증 토큰 검증)
- `EMAIL_VERIFICATION_RATE_LIMIT_SECRET` (이메일 가입 요청 IP·이메일 HMAC hash)
- `FAMILY_INVITE_RATE_LIMIT_SECRET` (가족 초대 코드 가입 시도 HMAC hash)
- `RESEND_API_KEY`, `AUTH_EMAIL_FROM` (운영 이메일 인증 발송)

`ALLOW_DEV_EMAIL_VERIFICATION_CODE`는 로컬 개발에서만 선택적으로 쓴다. production/Vercel에는 설정하지 않으며, 운영에서 이메일 발송 설정이 없으면 가입 요청은 실패해야 한다.

## 2) Optional (AI 기능 쓸 때 사실상 필수)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (기본값: `gpt-4.1-mini`)
- `OPENAI_VISION_MODEL` (기본값: `gpt-4.1-mini`)

## 3) Vercel 설정
- Vercel > Project > Settings > Environment Variables에 위 값 등록
- `NEXT_PUBLIC_APP_URL`은 실제 배포 URL로 설정
  - 예: `https://your-app.vercel.app`
- Preview/Production 환경 각각 필요한 값 넣기

## 4) Supabase 설정
- Supabase > Project Settings > API에서 URL/Keys 확인
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이므로 절대 클라이언트 코드에 노출 금지
- 신규 가입 배포 전 `docs/supabase-registration-consent.sql` migration 적용
- 이메일 가입 배포 전 `docs/supabase-email-verification.sql` 전체 적용
- 가족 초대 배포 전 `docs/supabase-meals.sql`의 가족 초대 코드·가입 시도 제한 migration 적용
- Auth Redirect URL에 다음 등록
  - `http://localhost:3000/auth*`
  - `https://YOUR_DEPLOYED_DOMAIN/auth*`
  - `nyampick://auth/callback*` (Expo 네이티브 앱)
  - `*`는 `/auth` 또는 `nyampick://auth/callback` 뒤의 callback query만 허용하기 위한 것이다. 도메인 전체 wildcard를 등록하지 않는다.

## 5) 소셜 로그인(카카오/구글/Apple) 점검
- Google/Kakao Provider 콘솔에는 Supabase Auth > Providers에 표시되는 `https://<project-ref>.supabase.co/auth/v1/callback`을 Redirect URI로 등록
- `nyampick://auth/callback*`은 Provider 콘솔이 아니라 Supabase Auth Redirect URL Allow List에만 등록
- 카카오 추가 동의항목(이메일 등) 사용 시 콘솔에서 해당 항목 활성화/심사 상태 확인
- iOS 네이티브 Apple 설정은 `docs/apple-login-setup.md`를 따른다. 모바일 env에는 Apple secret을 넣지 않는다.
- Supabase Apple Client IDs에 사용하는 Bundle ID를 등록하고 nonce 검증을 유지한다.

## 6) 배포 전 최종 점검
- `npm run lint`
- `npm run build`
- 이메일 가입 요청 제한 RPC가 적용된 뒤 신규/기존 이메일 모두 같은 인증 안내를 받는지 확인
- 가족 초대 코드 발급·가입, 만료·회전 및 과도한 가입 시도의 제한을 확인
- 로그인/로그아웃, `/api/profile`, `/api/fridge/items`, `/api/recipes/*` 호출 확인
- 영수증 스캔/AI 추천 기능 사용 시 OpenAI 키 동작 확인

## 7) 보안 체크
- `.env.local`/실제 키는 Git에 절대 커밋하지 않기
- 키 유출 의심 시 즉시 재발급(rotate)
