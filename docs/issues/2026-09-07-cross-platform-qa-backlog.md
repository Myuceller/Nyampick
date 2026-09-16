# 2026-09-07 크로스플랫폼 QA 이슈 백로그

상태: Active — AUTH-001~005 구현 완료, MOB-001·API-001 DB 적용 검증 대기, MOB-002 실제 기기 OAuth 검증 대기, STORE-AUTH-001 코드 구현·외부 설정 검증 대기  
기준: 웹 production build, Expo iOS/Android bundle, iOS 시뮬레이터 실행, API/인증 정적 검토, 모바일·웹 접근성/성능 검토

이 문서는 2026-09-07 QA에서 확인한 **코드 근거가 있는 이슈**를 출시 우선순위로 정리한다. 키·토큰·개인정보·실제 계정은 검토하거나 기록하지 않았다.

## 출시 판정

- **현재 판정: 출시 보류**
- P0가 하나라도 열려 있으면 외부 베타와 스토어 출시를 하지 않는다.
- P1은 공개 출시 전 완료가 원칙이다. 단, 영향 범위와 우회책을 문서화한 내부 테스트 빌드는 가능하다.
- P2는 공개 출시 전 품질 정리 대상으로 관리하고, P3는 후속 백로그로 관리한다.

## 우선순위 정의

| 우선순위 | 의미 | 처리 기준 |
|---|---|---|
| P0 | 인증·개인정보·데이터 무결성·핵심 기능이 깨지거나 악용될 수 있는 출시 차단 이슈 | 즉시 수정, 회귀 테스트와 실환경 검증까지 완료 |
| P1 | 공개 출시 품질·보안·접근성에 중요한 결함 | P0 직후 처리, 공개 출시 전 완료 |
| P2 | 특정 흐름·기기·보조기술에서 품질을 떨어뜨리는 결함 | 출시 전 가능한 범위에서 처리하고 미완료 시 릴리스 노트/추적 남김 |
| P3 | 장기 유지보수·문서·최적화 개선 | P0~P2 종료 후 계획화 |

## 요약

| 우선순위 | 개수 | 핵심 영역 |
|---|---:|---|
| P0 | 5 | 이메일 인증, OAuth PKCE, 리다이렉트, 레시피, 영수증 |
| P1 | 11 | 약관 버전, 인증 보호, 데이터 저장, 테스트, 비용, 배포 설정 |
| P2 | 10 | 날짜 카피, 로그인 화면·브랜딩, 키보드, 보조기술, 대비, 성능, 의존성·문서 품질 |
| P3 | 0 | 현재 별도 이슈 없음 |

## P0 — 출시 차단

### AUTH-002 — 로그인 후 `next` 경로의 외부 리다이렉트 우회

- 상태: Implemented — 자동 회귀 검증 통과
- 영향: 인증 완료 뒤 사용자를 외부 피싱 도메인으로 보낼 수 있다.
- 근거: `src/lib/auth-redirect.ts:3`
- 처리 방향: 단순 문자열 검사 대신 기준 origin으로 URL을 파싱한 뒤, origin이 현재 앱 origin과 같은 경로만 허용한다. backslash·제어문자·protocol-relative 경로를 모두 거부한다.
- 완료 기준:
  - 외부 URL, `//`, backslash, 인코딩된 우회값이 모두 안전한 기본 경로로 정규화된다.
  - 이메일·Google·Kakao 완료 후 동일한 검증 함수를 사용한다.
  - 우회값 회귀 테스트를 추가한다.

### AUTH-003 — 이메일 발송 설정 누락 시 인증번호가 공개 응답으로 노출됨

- 상태: Implemented — 자동 회귀 검증 통과
- 영향: 운영 환경 설정 누락 시 이메일 소유 검증이 사실상 무력화된다.
- 근거: `src/lib/server/email-verification.ts:228`, `src/app/api/auth/email-verification/request/route.ts:28`
- 처리 방향: 개발 전용 인증번호 응답은 명시적인 test 환경에서만 허용하고, production에서는 메일 발송 설정이 없으면 fail-closed 한다. 배포 전 환경 점검도 자동화한다.
- 완료 기준:
  - production 응답에 `devCode`가 절대 포함되지 않는다.
  - 메일 설정 누락 시 가입을 진행할 수 없고 운영자가 이해할 수 있는 오류가 남는다.
  - 이메일 인증 migration과 발송 설정이 배포 체크리스트에 포함된다.

### MOB-001 — 모바일 AI 레시피 추천 DTO가 API 응답과 불일치

- 상태: In verification — `packages/contracts`의 공통 DTO, 응답별 안정 ID, AI 레시피 상세 저장 필드 구현 및 web/mobile 컴파일·계약 테스트 통과. Supabase `recipe_data` migration 적용과 실계정 round-trip 검증 대기.
- 영향: 추천 카드 식별자가 없고, 여러 추천 중 다른 항목이 저장되거나 설명·조리 단계·출처가 유실될 수 있다.
- 근거: 모바일 기대 형식 `apps/mobile/src/features/recipes/use-recipes.ts:18`, 실제 응답 `src/lib/ai/recipe-types.ts:8`, route `src/app/api/recipes/recommendations/route.ts:125`
- 처리 방향: 웹·모바일이 공유하는 명시적 DTO 또는 모바일 adapter를 만든다. 활성 화면의 저장 payload도 새 DTO 전체를 보존한다.
- 완료 기준:
  - 추천 목록의 모든 카드에 안정적인 식별자가 있다.
  - 여러 추천에서 선택한 카드만 저장된다.
  - subtitle, taste, ingredients, steps, source 정보가 저장 후에도 유지된다.
  - route → active mobile screen 계약 테스트가 추가된다.

### API-001 — 영수증 스캔 세션이 프로세스 메모리에만 있고 재사용 가능함

- 상태: In verification — 영속 세션 테이블, 15분 TTL, 사용자 결속, DB 원자 consume+insert 함수 및 회귀 계약 테스트 구현. Supabase migration 적용과 실계정 중복 confirm 검증 대기.
- 영향: 서버리스 인스턴스가 바뀌면 scan → confirm이 실패할 수 있고, 같은 scanId 재전송으로 중복 재료가 저장될 수 있다.
- 근거: `src/app/api/fridge/receipt-scan/route.ts:86`, `src/lib/server/meal-api-store.ts:324`, `src/app/api/fridge/receipt-confirm/route.ts:53`
- 처리 방향: 사용자 ID에 묶인 영속 세션(DB 또는 Redis)을 만들고 TTL·일회성 consume·idempotency를 원자적으로 처리한다.
- 완료 기준:
  - 다른 사용자와 다른 인스턴스에서는 세션을 읽을 수 없다.
  - 성공한 confirm은 같은 scanId로 다시 저장되지 않는다.
  - 만료·중복 요청·인스턴스 전환에 대한 API 테스트가 있다.

### MOB-002 — iOS 런타임에서 OAuth PKCE가 `plain` 방식으로 하향됨

- 상태: In verification — Expo Crypto 기반 S256 shim 구현, iOS development client 설치·로그인 화면 렌더링·`nyampick://` OS 확인창 도달 및 iOS/Android bundle 통과. 2026-09-08 iOS 시뮬레이터 수동 QA에서 Google/Kakao 로그인 성공을 확인했으며, PKCE downgrade 로그 확인과 실제 iPhone·Android 검증은 G0 게이트에 남음.
- 영향: iOS 시뮬레이터 실행 로그에서 WebCrypto 미지원 경고가 발생했고 PKCE challenge가 `sha256` 대신 `plain`으로 동작한다. 소셜 로그인 보안 검증이 불완전하다.
- 근거: Expo Go iOS 시뮬레이터 런타임 로그 (2026-09-07)
- 처리 방향: Expo/React Native 환경에서 S256을 지원하는 crypto 구성을 명시하고, fallback이 발생하면 로그인 시작을 막거나 관측 가능하게 한다.
- 완료 기준:
  - iOS·Android 개발 빌드에서 PKCE S256을 사용한다.
  - Google·Kakao 실제 callback 후 로그에 downgrade 경고가 없다.
  - 취소·재시도·앱 재시작 중 callback 복구를 기기에서 확인한다.

## P1 — 공개 출시 전 완료

| ID | 이슈 | 근거 | 처리 방향 |
|---|---|---|---|
| AUTH-001 | URL query만으로 소셜 가입 필수 약관 동의가 복원됨 — Implemented | `src/lib/server/oauth-registration-attempt.ts`, `src/app/api/auth/registration-attempt/route.ts` | 명시적 동의 뒤 만든 일회성·만료형 opaque attempt만 OAuth callback과 연결하고, URL에는 동의값을 싣지 않음. web/mobile/서버 계약 테스트 통과 |
| AUTH-004 | 약관 버전을 올려도 기존 프로필이 있으면 재동의가 우회되고, 가입 모달 시행일도 공개 약관·서버 기록과 다름 — Implemented | `packages/contracts/src/legal.ts`, `src/lib/server/registration-consent.ts`, `src/app/api/profile/route.ts` | 표시·저장 버전을 단일 정책 상수로 통일하고, rollout 전 생성·동의 marker가 전혀 없는 legacy 계정만 기존 프로필 fallback을 허용. 회귀 테스트 통과 |
| AUTH-005 | bearer token 검증 결과를 60초 캐시하여 만료·삭제·차단 상태가 즉시 반영되지 않을 수 있음 — Implemented | `src/lib/server/api-auth.ts` | 보호 API 요청마다 인증 provider에서 토큰을 검증하고 캐시를 두지 않음 |
| AUTH-006 | 공개 이메일 가입 API가 Auth 사용자 목록을 대량 스캔하고 IP 제한이 없어 이메일 열거·quota 소진 위험 — In verification | `src/lib/server/email-verification-rate-limit.ts`, `docs/supabase-email-verification.sql` | Auth 목록 사전 조회를 제거하고, 원자적 DB RPC로 HMAC 처리한 IP·이메일별 한도를 적용. 유효 이메일에는 동일한 인증 안내를 반환하며, 실제 Supabase migration 적용 확인 대기 |
| DATA-001 | 일반 냉장고 재료 수량을 UI는 받지만 서버가 저장·응답에서 버림 — Implemented | `apps/mobile/App.tsx:530`, `src/lib/server/supabase-app-data.ts` | 전체 재료 수량을 지원하고 round-trip 회귀 테스트를 추가 |
| MOB-003 | 저장·삭제 mutation 일부가 오류를 잡지 않아 unhandled rejection과 모달 내 무응답이 가능하며 401 재인증 복구도 없음 — Implemented | `apps/mobile/src/lib/api.ts`, `apps/mobile/src/features/auth/auth-context.tsx`, `apps/mobile/App.tsx` | API 401은 단일 handler로 로컬 세션을 해제해 로그인 화면으로 복구. 활성 식단·냉장고·가족 mutation은 실패 Promise를 처리하고, 냉장고 관리 시트는 오류를 즉시 안내. 회귀·iOS bundle 검증 통과 |
| TEST-001 | 모바일 하네스가 실제 활성 `FridgeWebScreen`/`RecipeWebScreen` 대신 비활성 화면을 검사해 false green 가능 — Implemented | `apps/mobile/App.tsx:1128`, `scripts/mobile-harness-check.mjs` | 활성 화면 기준 계약·행동 테스트로 교체하고 레시피 DTO 회귀 케이스 추가 |
| SEC-DEP-001 | 의존성 감사 이슈 — In verification | root `next@16.3.4`, `eslint-config-next@16.3.4`, mobile Expo dependency tree | Next 14를 16.3.4로 올리고 ESLint 9 flat config로 전환해 Next 관련 운영 취약점을 제거했다. lint·69개 테스트·production build·platform harness 통과. root 운영 감사에 남은 high 2개(`lodash`/Recharts, `ws`/Supabase·OpenAI)와 mobile moderate 10개는 강제 수정 없이 개별 호환성 검증이 필요 |
| CONF-001 | root 도메인과 canonical host·Vercel·Supabase allow list·sitemap 불일치 가능 — In verification | `src/lib/app-url.ts`, `docs/kakao-login-checklist.md` | 2026-09-07 외부 확인에서 `https://nyampick.kr`가 `https://www.nyampick.kr`로 307 리다이렉트됨. 코드 기본값은 deployed canonical `www`를 유지하고, Vercel·Supabase allow list의 실환경 반영은 G0에서 확인 |
| AI-001 | AI rate limit·일일 비용 예산이 프로세스 메모리이고 예산 차감도 모델 호출 뒤 발생 | `src/lib/server/rate-limit.ts:47`, `src/app/api/recipes/recommendations/route.ts:76` | 공유 저장소 기반 atomic quota와 호출 전 예약/차감 적용 |
| FAMILY-001 | 가족 초대 코드가 짧고 rate limit·revoke가 없어 brute force와 유출 코드 무효화 대응이 약함 — In verification | `src/lib/server/family-access.ts`, `src/app/api/children/invite-code/route.ts`, `docs/supabase-meals.sql` | 96-bit 코드, 재발급 시 기존 코드 revoke, 계정·IP 결속 10분 5회 원자적 조인 제한 구현. Supabase migration 적용 검증 대기 |

## P2 — 품질·회귀 방지

| ID | 이슈 | 근거 | 처리 방향 |
|---|---|---|---|
| UI-001 | 냠픽 그린 위 흰 CTA 글자 대비가 2.27:1로 접근성 기준 미달 — In progress | `apps/mobile/src/theme.ts`, `apps/mobile/src/features/auth/auth-screen.tsx`, `apps/mobile/App.tsx`, `tests/mobile-accessibility-contract.test.ts` | 네이티브 로그인·온보딩·식단·냉장고·레시피 CTA와 선택 상태는 `#1a1d1f` 전경색으로 변경하고 WCAG AA 계약 테스트를 추가했다. 웹의 직접 구현 CTA는 공통 컴포넌트화 또는 동일 전경색 적용이 남아 있다. |
| UI-002 | 로그인 첫 화면에서 회원가입 전환까지 한 번에 보이지 않음 — In verification | `apps/mobile/src/features/auth/auth-screen.tsx` | 로그인 모드에만 로고·상하 여백·카드 패딩을 압축해 핵심 폼, 소셜 로그인, 회원가입 전환을 첫 viewport에 배치했다. 가입 화면은 필드·약관이 많아 세로 스크롤을 유지하며, 작은 실제 기기 확인이 남아 있다. |
| CONF-002 | iOS OAuth 시스템 안내에 앱 이름이 `app`, 대상 host가 임의 Supabase 프로젝트 주소로 표시됨 — In verification | `apps/mobile/app.json`, `apps/mobile/app.config.js`, `docs/supabase-custom-domain.md` | 운영/개발 `CFBundleName`을 각각 `냠픽`/`냠픽 개발`로 명시했다. 앱 이름 반영에는 development client 재빌드가 필요하다. Supabase host 브랜딩은 유료 Custom Domain, DNS, Google/Kakao 신규 callback 등록 및 앱 URL 환경변수 전환이 남아 있다. |
| MOB-004 | 과거·미래 날짜를 선택해도 식단 제목·공유 제목이 항상 “오늘” — Implemented | `apps/mobile/src/features/meal/meal-date-copy.ts`, `apps/mobile/App.tsx`, `tests/mobile-meal-date-copy.test.ts` | 선택 날짜를 제목·하루 공유 제목·공유 버튼 문구의 단일 소스로 사용하고, 오늘/다른 날짜 회귀 테스트를 추가 |
| MOB-005 | 바텀 시트에 키보드 회피가 없어 긴 입력 폼의 저장 버튼이 iOS에서 가려질 수 있음 — Implemented | `apps/mobile/App.tsx` | iOS `KeyboardAvoidingView`, interactive dismiss, 스크롤 content inset 적용. 작은 실제 기기 검증은 G0에서 확인 |
| A11Y-001 | 로그인 이후 폼 입력에 프로그램상 라벨, 필터 selected state, 비동기 오류 live announcement가 부족함 — In verification | `apps/mobile/App.tsx`, `tests/mobile-accessibility-contract.test.ts` | 활성 폼의 `accessibilityLabel`, 필터·분류·관계의 selected/radio state, 비동기 오류의 alert/live 영역과 회귀 계약을 적용했다. 실제 VoiceOver/TalkBack 확인은 G0에 남음. |
| A11Y-002 | 일부 chip·온보딩 제어가 44pt 최소 터치 타깃에 미달 — In verification | `apps/mobile/App.tsx`, `apps/mobile/src/features/auth/auth-screen.tsx`, `tests/mobile-accessibility-contract.test.ts` | 필터·분류 칩 최소 높이와 온보딩 점 선택 영역을 44pt로 보정하고 회귀 계약을 추가했다. 실제 기기 터치 확인은 G0에 남음. |
| PERF-001 | 홈 요약이 모든 과거 식단 이력을 내려받아 기록이 쌓이면 첫 화면·탭 복귀 비용이 증가 — In verification | `src/lib/meal-date-range.ts`, `src/lib/server/supabase-app-data.ts`, `src/lib/server/supabase-meals.ts`, `tests/home-summary-range.test.ts` | 홈 캘린더의 현재 월과 앞뒤 7일 범위만 조회하도록 변경하고, 사용자·날짜 복합 인덱스 migration을 추가했다. 실제 운영 데이터에서의 응답 시간 측정과 migration 적용 확인이 남아 있다. |
| DEP-001 | `react-native-svg`가 Expo 권장 patch와 다르고, Next image 최적화에서 `sharp` 미설치 경고 — In verification | `apps/mobile/package.json`, `apps/mobile/package-lock.json` | Expo SDK 57 권장 `react-native-svg@15.15.4`로 정렬하고 로컬 Expo 호환성 검사·TypeScript 검증을 통과했다. 현재 Next production build에서는 `sharp` 경고가 재현되지 않았으며, 운영 이미지 최적화 성능 측정만 남아 있다. |
| DOC-001 | API 문서와 릴리스 체크리스트가 현재 인증·동일 이메일 provider 정책과 불일치 — Implemented | `docs/api-spec.md`, `docs/release-checklist.md` | Nyampick 명칭·Supabase 영속 저장·Bearer 인증·이메일/소셜 가입 attempt·실기기 OAuth 정책을 명시하고, recipe DTO·가족 invite 보안 계약과 필수 migration/실기기 출시 검증 항목을 최신화했다. |

## P3 — 후속 백로그

현재 독립 P3 이슈는 없다. P2 해결 뒤 장기 성능 최적화, QA 자동화 범위 확대, 문서 구조 정리를 P3로 분리한다.

## QA에서 통과한 검증

- `npm run test:unit`: 102개 단위·계약 테스트 통과
- `npm run platform:check`: mobile TypeScript, mobile harness, web SEO harness 통과
- `npm run build`: Next production build 통과
- Expo iOS·Android export 통과
- iOS 시뮬레이터에서 Expo Go 연결 후 로그인 화면 렌더링 확인
- 랜딩 mobile Lighthouse: Performance 95, Accessibility 96, Best Practices 100, SEO 100
- 비인증 API smoke test에서 보호 API가 401을 반환하는 것 확인

위 통과 결과는 P0/P1의 실제 통합 결함을 대체하지 않는다. 특히 기존 모바일 하네스는 활성 화면을 충분히 검증하지 못한다.

## 2026-09-15 AI 추천 코드 점검

- 상태: **코드 검증 완료, 실제 provider 호출 검증 대기**
- 생성 로직은 OpenAI Structured Outputs를 사용하고, 불완전·빈 응답만 제한적으로 재시도하며 유효한 일부 결과는 사용자에게 반환하도록 보강했다.
- 모델이 임의 출처 URL을 만들지 못하게 생성 필드에서 출처를 제거했고, 입력 재료를 데이터 경계로 분리했다.
- 추천 API는 재료 1~20개·항목당 80자·추천 수 1~10을 검증하고, 안전한 오류 코드·correlation ID·`Retry-After`·`no-store` 응답을 제공한다.
- 모바일은 중복 요청 방지, 45초 timeout, 빈 성공 응답 거부, 실제 재시도, 서버 cooldown 반영, 공통 선택 한도를 적용했다.
- AI 품질 리포트는 20개 케이스 중 95% 통과했으며, `release:check`, `platform:check`, Expo iOS·Android export가 통과했다.
- 남은 검증: 서버 배포 환경에 `OPENAI_API_KEY`를 설정한 뒤 실제 iPhone·Android에서 성공·timeout·429·provider 장애 흐름을 확인한다. 키는 모바일 `.env`나 `EXPO_PUBLIC_*`에 넣지 않는다.
- 남은 P1: `AI-001`/`AI-002`의 다중 인스턴스 공유 atomic quota와 호출 전 비용 예약·정산.

## G0 — 공개 출시 전 외부 검증 게이트

아래는 P0~P3과 별개로, 코드상 통과만으로 대체할 수 없는 go/no-go 조건이다. 모두 확인되기 전에는 공개 출시하지 않는다.

- 실제 iPhone·Android 기기에서 Google/Kakao callback, 이메일 재설정, 앱 백그라운드 복귀
- production Supabase RLS, migration 적용 여부, Vercel 환경 설정, OAuth provider console
- 카메라 권한·OCR·공유 시트·VoiceOver·TalkBack
- 실제 production 도메인과 redirect allow list 일치 여부
- `docs/supabase-custom-domain.md` 절차에 따른 Custom Domain·provider callback 전환과 OAuth 안내 host 확인

## 2026-09-08 Next 업데이트 이후 후속 작업

이 절은 2026-09-08 코드·의존성 보안 점검에서 새로 확인한 작업을 실제 실행 순서로 정리한다. 위 P0/P1/P2 개수는 2026-09-07 QA 스냅샷이므로 여기서 소급 변경하지 않는다.

### 완료

- [x] **SEC-NEXT-001 — Next.js 보안 업데이트**: Next.js를 `16.3.4`, ESLint를 9 flat config로 전환했다. lint, 74개 테스트, production build, platform harness가 통과했고 Next 관련 운영 취약점은 감사 결과에서 제거됐다.

### 바로 진행할 작업

| 순서 | 우선순위 | ID | 작업 | 완료 기준 |
|---:|---|---|---|---|
| 1 | P0 (iOS 출시) | STORE-AUTH-001 | Google/Kakao가 주 로그인 수단이므로 Sign in with Apple을 추가하고 App Store 4.8 요건을 충족한다. — In verification: Expo 공식 버튼, nonce/state 검증, Supabase ID token 로그인, 가입 약관 attempt, 최초 이름 저장, provider migration을 구현했다. 유료 설정 전에는 공개 기능 플래그 기본값 `false`로 버튼·plugin·entitlement를 함께 숨긴다. | 유료 전환 후 Apple Developer·Supabase 설정을 적용하고 기능 플래그를 켠다. 로그아웃·계정 삭제 시 토큰 revoke를 구현한 뒤 실제 iPhone에서 신규/기존 계정을 검증한다. |
| 2 | P1 | SEC-API-001 | 운영에 공개된 `/api/recipe-eval`을 제거하거나 관리자 전용으로 잠근다. | 비인증·일반 사용자는 접근할 수 없고, 요청 크기 제한과 401/403 회귀 테스트가 있다. |
| 3 | P1 | AUTH-007 | 이메일 인증 코드의 시도 횟수·검증·소비를 DB에서 원자적으로 처리한다. | production에서 메모리 fallback 없이 fail closed하며, 검증 rate limit과 동시 요청·재사용·만료 테스트가 통과한다. |
| 4 | P1 | AI-002 | AI rate limit과 일일 비용 예산을 공유 저장소 기반 atomic quota로 바꾼다. | 모델 호출 전에 비용을 예약하고 성공/실패에 따라 정산하며, 다중 인스턴스·동시 요청·한도 초과 테스트가 통과한다. |
| 5 | P1 | SEC-OCR-001 | 영수증 OCR 입력과 외부 AI 오류 처리를 강화한다. | JPEG/PNG/WebP data URL만 허용하고 실제 base64 byte·magic byte·파일 크기·텍스트 길이를 검증한다. 임의 URL 전달을 막고 사용자에게는 내부 provider 오류를 노출하지 않는다. |
| 6 | P1 | SEC-URL-001 | 저장 레시피 외부 링크를 서버와 웹에서도 `https?`로 제한한다. | `javascript:`, `data:`, 잘못된 URL이 저장·열기 모두에서 거부되고 공통 계약 테스트가 있다. |
| 7 | P1 | SEC-HEADER-001 | 웹 보안 헤더와 민감 API 캐시 정책을 추가한다. | CSP, `frame-ancestors` 또는 X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy를 적용하고 인증 API는 `private, no-store`로 응답한다. production URL에서 헤더를 재검증한다. |
| 8 | P1 | AUTH-008 | 프로필 이메일을 Supabase Auth 신원의 이메일과 분리 없이 임의 수정할 수 없게 한다. | 로그인 이메일은 읽기 전용 source of truth로 사용하거나 별도 알림 이메일에 인증 절차를 적용하고, 비밀번호 재설정·가족 표시 회귀 테스트가 통과한다. |
| 9 | P1 | ACCOUNT-001 | 계정 삭제에 최근 재인증과 원자성·재시도 안전성을 추가한다. | 최근 로그인/OTP를 요구하고 DB RPC 또는 idempotent 삭제 작업으로 부분 삭제를 방지한다. 앱 데이터·Storage·세션·provider 토큰 삭제 범위를 검증한다. |
| 10 | P1 | SEC-INPUT-001 | API 입력 검증과 오류 응답을 공통화한다. | Zod 또는 공통 contract로 타입·개수·길이·body 크기를 제한하고, 외부 응답은 일반화된 오류와 correlation ID만 반환한다. 음수·과대·잘못된 타입 테스트가 있다. |
| 11 | P1 | SEC-DEP-002 | 남은 의존성 감사 항목을 강제 downgrade 없이 개별 업데이트한다. | root high 2개(`lodash`/Recharts, `ws`/Supabase·OpenAI)와 mobile moderate 10개의 실제 영향·수정 버전을 확인하고, 각 업데이트 후 웹 build/test와 Expo iOS·Android export를 통과한다. |
| 12 | G0 | RELEASE-VERIFY-001 | 운영 Supabase와 실제 기기 출시 게이트를 닫는다. | 최신 SQL migration·RLS·grant 적용, Security Advisor, Vercel 환경변수·OAuth allow list를 확인하고 iPhone/Android 결과를 `docs/mobile-device-qa.md`에 기록한다. |

### 출시 전 함께 처리할 P2

| ID | 작업 | 완료 기준 |
|---|---|---|
| DATA-IMG-001 | 프로필·아이 사진의 base64 DB 저장을 private Supabase Storage로 이전한다. | 이미지 타입·magic byte·크기·해상도를 검증하고 메타데이터 제거·압축·signed URL·삭제 lifecycle을 적용한다. |
| FAMILY-002 | 가족 초대와 권한을 최소 권한 구조로 바꾼다. | 초대는 일회성 또는 사용 횟수 제한을 두고, owner 승인·알림·감사 로그와 viewer/editor 역할을 지원하며 이메일 노출을 최소화한다. |
| MOB-SEC-001 | 모바일 production API에 HTTPS를 강제하고 Universal Links/App Links를 구성한다. | localhost 개발 외 HTTP를 거부하고 iOS associated domains, Android `assetlinks.json`, OAuth callback 복구를 실제 기기에서 검증한다. |
| PRIVACY-001 | 개인정보 처리방침과 스토어 제출 정보를 실제 데이터 흐름에 맞춘다. | 영수증 이미지의 OpenAI 전송, 아이 사진, 외부 처리자, 보관·삭제 기간을 명시하고 App Store Privacy 및 Play Data Safety를 작성한다. Google Play용 외부 계정 삭제 URL도 제공한다. |
| OBS-001 | 개인정보를 남기지 않는 관측성과 보안 자동화를 추가한다. | user ID·재료·토큰을 마스킹한 구조화 로그와 correlation ID를 사용하고 Dependabot/Renovate, CodeQL, secret scan, `npm audit` CI gate를 구성한다. |
| TOOL-001 | 개발·빌드 런타임과 신규 lint 규칙을 정리한다. | Node 22 LTS 또는 24를 `.nvmrc`·`engines`·Vercel에 고정하고, 기존 코드를 정리한 뒤 임시로 끈 `react-hooks/refs`, `react-hooks/set-state-in-effect`를 다시 활성화한다. Turbopack 전환은 별도 회귀 검증 후 진행한다. |

각 작업은 수정 코드만으로 완료 처리하지 않는다. 관련 회귀 테스트를 추가하고 `npm run release:check`, `npm run platform:check`, 필요한 Expo export 또는 실제 기기 테스트까지 통과해야 상태를 `Implemented` 또는 `Verified`로 갱신한다.
