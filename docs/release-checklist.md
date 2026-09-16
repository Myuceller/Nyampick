# Nyampick Release Checklist

## 0) Release Info
- [ ] Release date/time:
- [ ] Release owner:
- [ ] Target environment: `Production`
- [ ] Vercel deployment URL:
- [ ] Rollback deployment URL:

## 1) Auth & Account
- [ ] Email login works
- [ ] Google login works
- [ ] Kakao login works
- [ ] Apple native login works on a real iPhone
- [ ] Apple 계정 회원탈퇴 시 Apple token revoke가 완료됨
- [ ] Same-email multi-provider login uses same app data scope
- [ ] 소셜 신규 가입은 필수 약관 동의 뒤 생성한 opaque registration attempt로만 완료됨
- [ ] Google/Kakao 실제 callback과 Apple 네이티브 로그인, 취소, 재시도, 앱 백그라운드 복귀를 대상 실기기에서 확인
- [ ] No infinite loading / redirect loop on `/auth`
- [ ] Unauthorized handling (`401`) shows recoverable UI

## 2) Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` set correctly for production domain
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `EMAIL_VERIFICATION_SECRET` set
- [ ] `EMAIL_VERIFICATION_RATE_LIMIT_SECRET` set
- [ ] `FAMILY_INVITE_RATE_LIMIT_SECRET` set
- [ ] `OPENAI_API_KEY` set
- [ ] `OPENAI_MODEL` set (or default confirmed)
- [ ] `OPENAI_VISION_MODEL` set (or default confirmed)
- [ ] Values verified in Vercel `Production` (not only Preview/Development)
- [ ] Redeploy completed after env updates

## 3) Database Integrity (Supabase)
- [ ] Foreign keys exist for user-linked tables
- [ ] `ON DELETE CASCADE` confirmed on user-linked tables
- [ ] No orphan rows in `user_profile`
- [ ] RLS enabled as intended
- [ ] Service-role-only server access path confirmed
- [ ] Required indexes present
- [ ] `docs/supabase-email-verification.sql`의 이메일 인증·요청 제한 migration 적용
- [ ] `docs/supabase-registration-consent.sql`의 가입 약관 동의·OAuth attempt migration 적용
- [ ] OAuth attempt provider constraint가 `google`, `kakao`, `apple`을 허용함
- [ ] `docs/supabase-meals.sql`의 영수증 세션, 가족 초대 코드·가입 시도 제한, 식단 사용자·날짜 인덱스 migration 적용
- [ ] `recipe_data` 컬럼 migration 적용 후 저장 레시피 상세가 refresh 뒤에도 유지됨

## 4) Core Flows (Smoke Test)
- [ ] Sign in -> land on home without error
- [ ] Home meal list loads
- [ ] Meal edit save persists after refresh
- [ ] Fridge list loads
- [ ] Fridge add (manual) works
- [ ] Fridge edit quantity/delete works
- [ ] Fridge bulk delete works
- [ ] Receipt scan -> candidate select -> add works
- [ ] Recipe save/edit/delete/favorite works
- [ ] 서로 다른 AI 추천 중 선택한 카드의 id·재료·조리 단계·출처만 저장됨
- [ ] Family invite code create/join/unlink works
- [ ] 영수증 confirm을 같은 `scanId`로 재전송해도 재료가 중복 저장되지 않음

## 5) AI Recommendation Stability
- [ ] `/api/recipes/recommendations` returns `200` for valid request
- [ ] Failure path returns user-friendly message
- [ ] Token usage logging visible in server logs
- [ ] Prompt output quality sanity check done (3+ samples)
- [ ] Fallback logic checked (strict -> fallback)

## 6) Cost & Abuse Guard
- [ ] Daily token limit policy decided
- [ ] Per-user request rate limit policy decided
- [ ] Alerting threshold defined (monthly budget / usage spike)
- [ ] Emergency kill switch plan documented

## 7) UX & Error Handling
- [ ] No blocking `alert(...)` remains (toast only)
- [ ] Critical error messages are actionable
- [ ] Empty states are understandable
- [ ] Retry path exists for network failures

## 8) PWA & Mobile
- [ ] `manifest.webmanifest` returns `200`
- [ ] App icons (`192`, `512`) accessible
- [ ] Android Chrome install works (`앱 설치` / `홈 화면에 추가`)
- [ ] iOS Safari add-to-home instructions visible in app/help
- [ ] In-app browser OAuth warning documented (Google disallowed user-agent)
- [ ] Expo development/preview build에서 iOS·Android 로그인 화면과 모든 핵심 탭이 렌더링됨
- [ ] iOS 빌드에 Sign in with Apple entitlement가 있고 Apple 공식 버튼이 표시됨
- [ ] iOS 키보드가 바텀 시트 저장 버튼을 가리지 않음
- [ ] VoiceOver·TalkBack이 입력 라벨·선택 상태·오류를 읽고, chip을 44pt 이상으로 누를 수 있음

## 9) Security
- [ ] No secret keys in client bundle
- [ ] No secrets committed in git
- [ ] API logs do not leak PII/tokens
- [ ] OAuth redirect URLs/allowed origins are exact
- [ ] `docs/supabase-custom-domain.md` 순서대로 Custom Domain을 활성화하고 Google/Kakao 기존·신규 callback을 모두 검증함
- [ ] iOS OAuth 안내에 앱 이름 `냠픽`과 승인된 냠픽 API host가 표시됨
- [ ] Apple provider의 Client IDs가 운영/개발 Bundle ID와 정확히 일치하고 nonce 검증이 켜져 있음
- [ ] 이메일 가입 요청이 Auth 사용자 목록을 스캔하지 않고 IP·이메일별 제한을 적용함

## 10) Build & Deployment
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Production deployment health check done
- [ ] Post-release smoke test done on actual domain
- [ ] Rollback plan tested (or command prepared)

## 11) Post-Release (D+1)
- [ ] Auth error rate reviewed
- [ ] API 5xx rate reviewed
- [ ] AI usage/cost reviewed
- [ ] Top user-reported issues triaged

## Recommended Quick SQL Checks
```sql
-- orphan profiles
select p.id, p.email
from public.user_profile p
left join auth.users u on u.id = p.id
where u.id is null;
```

```sql
-- FK check for user_profile
select
  con.conname as constraint_name,
  con.confdeltype as delete_rule
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where con.contype = 'f'
  and nsp.nspname = 'public'
  and rel.relname = 'user_profile';
```
